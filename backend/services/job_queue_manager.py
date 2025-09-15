#!/usr/bin/env python3
"""
Job Queue Manager for JewGo Backend
===================================

This module provides advanced background job processing capabilities:
- Redis-based job queue with priority support
- Scheduled job execution with cron-like syntax
- Job retry mechanisms with exponential backoff
- Job monitoring and statistics
- Dead letter queue for failed jobs
- Job result caching and persistence

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

import json
import time
import uuid
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
import redis
from croniter import croniter

from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5

logger = get_logger(__name__)


class JobStatus(Enum):
    """Job status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"
    SCHEDULED = "scheduled"


class JobPriority(Enum):
    """Job priority enumeration."""
    LOW = 1
    NORMAL = 5
    HIGH = 10
    CRITICAL = 20


@dataclass
class Job:
    """Job data structure."""
    id: str
    name: str
    func_name: str
    args: List[Any]
    kwargs: Dict[str, Any]
    priority: JobPriority
    status: JobStatus
    created_at: datetime
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    retry_delay: int = 60  # seconds
    timeout: int = 300  # seconds
    result: Optional[Any] = None
    error: Optional[str] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []


@dataclass
class JobStats:
    """Job statistics."""
    total_jobs: int
    pending_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    avg_execution_time: float
    success_rate: float
    queue_size: int


class JobQueueManager:
    """Advanced job queue manager with Redis backend."""
    
    def __init__(self, redis_manager=None):
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.redis_client = self.redis_manager.get_client()
        
        # Queue names
        self.pending_queue = "job_queue:pending"
        self.running_queue = "job_queue:running"
        self.completed_queue = "job_queue:completed"
        self.failed_queue = "job_queue:failed"
        self.scheduled_queue = "job_queue:scheduled"
        self.dead_letter_queue = "job_queue:dead_letter"
        
        # Job registry
        self.job_registry: Dict[str, Callable] = {}
        self.worker_threads: List[threading.Thread] = []
        self.is_running = False
        
        # Statistics
        self.stats = {
            'total_processed': 0,
            'total_failed': 0,
            'total_retries': 0,
            'start_time': datetime.now()
        }
        
        logger.info("Job queue manager initialized")

    def register_job(self, name: str, func: Callable):
        """Register a job function."""
        self.job_registry[name] = func
        logger.info(f"Registered job: {name}")

    def enqueue_job(
        self,
        name: str,
        *args,
        priority: JobPriority = JobPriority.NORMAL,
        delay: Optional[int] = None,
        max_retries: int = 3,
        timeout: int = 300,
        tags: List[str] = None,
        **kwargs
    ) -> str:
        """Enqueue a job for execution."""
        job_id = str(uuid.uuid4())
        
        # Calculate scheduled time
        scheduled_at = None
        if delay:
            scheduled_at = datetime.now() + timedelta(seconds=delay)
        
        job = Job(
            id=job_id,
            name=name,
            func_name=name,
            args=list(args),
            kwargs=kwargs,
            priority=priority,
            status=JobStatus.SCHEDULED if scheduled_at else JobStatus.PENDING,
            created_at=datetime.now(),
            scheduled_at=scheduled_at,
            max_retries=max_retries,
            timeout=timeout,
            tags=tags or []
        )
        
        # Store job data
        job_key = f"job:{job_id}"
        self.redis_client.hset(job_key, mapping={
            'data': json.dumps(asdict(job), default=str)
        })
        
        # Add to appropriate queue
        if scheduled_at:
            # Add to scheduled queue with timestamp score
            self.redis_client.zadd(
                self.scheduled_queue,
                {job_id: scheduled_at.timestamp()}
            )
            logger.info(f"Scheduled job {job_id} for {scheduled_at}")
        else:
            # Add to pending queue with priority score
            self.redis_client.zadd(
                self.pending_queue,
                {job_id: priority.value}
            )
            logger.info(f"Enqueued job {job_id} with priority {priority.name}")
        
        return job_id

    def schedule_recurring_job(
        self,
        name: str,
        cron_expression: str,
        *args,
        priority: JobPriority = JobPriority.NORMAL,
        max_retries: int = 3,
        timeout: int = 300,
        tags: List[str] = None,
        **kwargs
    ) -> str:
        """Schedule a recurring job with cron expression."""
        job_id = str(uuid.uuid4())
        
        # Calculate next execution time
        cron = croniter(cron_expression, datetime.now())
        next_run = cron.get_next(datetime)
        
        job = Job(
            id=job_id,
            name=name,
            func_name=name,
            args=list(args),
            kwargs=kwargs,
            priority=priority,
            status=JobStatus.SCHEDULED,
            created_at=datetime.now(),
            scheduled_at=next_run,
            max_retries=max_retries,
            timeout=timeout,
            tags=(tags or []) + ['recurring', f'cron:{cron_expression}']
        )
        
        # Store job data with cron expression
        job_key = f"job:{job_id}"
        job_data = asdict(job)
        job_data['cron_expression'] = cron_expression
        job_data['is_recurring'] = True
        
        self.redis_client.hset(job_key, mapping={
            'data': json.dumps(job_data, default=str)
        })
        
        # Add to scheduled queue
        self.redis_client.zadd(
            self.scheduled_queue,
            {job_id: next_run.timestamp()}
        )
        
        logger.info(f"Scheduled recurring job {job_id} with cron '{cron_expression}'")
        return job_id

    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID."""
        job_key = f"job:{job_id}"
        job_data = self.redis_client.hget(job_key, 'data')
        
        if not job_data:
            return None
        
        try:
            data = json.loads(job_data)
            # Convert datetime strings back to datetime objects
            for field in ['created_at', 'scheduled_at', 'started_at', 'completed_at']:
                if data.get(field):
                    data[field] = datetime.fromisoformat(data[field])
            
            # Convert enums
            data['priority'] = JobPriority(data['priority'])
            data['status'] = JobStatus(data['status'])
            
            return Job(**data)
        except Exception as e:
            logger.error(f"Error parsing job data for {job_id}: {e}")
            return None

    def update_job_status(self, job_id: str, status: JobStatus, **updates):
        """Update job status and other fields."""
        job = self.get_job(job_id)
        if not job:
            return
        
        # Update fields
        for key, value in updates.items():
            if hasattr(job, key):
                setattr(job, key, value)
        
        job.status = status
        
        # Update timestamps
        if status == JobStatus.RUNNING:
            job.started_at = datetime.now()
        elif status in [JobStatus.COMPLETED, JobStatus.FAILED]:
            job.completed_at = datetime.now()
        
        # Store updated job
        job_key = f"job:{job_id}"
        self.redis_client.hset(job_key, mapping={
            'data': json.dumps(asdict(job), default=str)
        })

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        job = self.get_job(job_id)
        if not job:
            return False
        
        # Remove from queues
        self.redis_client.zrem(self.pending_queue, job_id)
        self.redis_client.zrem(self.scheduled_queue, job_id)
        self.redis_client.zrem(self.running_queue, job_id)
        
        # Update status
        self.update_job_status(job_id, JobStatus.CANCELLED)
        
        logger.info(f"Cancelled job {job_id}")
        return True

    def retry_job(self, job_id: str) -> bool:
        """Retry a failed job."""
        job = self.get_job(job_id)
        if not job or job.retry_count >= job.max_retries:
            return False
        
        # Calculate retry delay with exponential backoff
        delay = job.retry_delay * (2 ** job.retry_count)
        retry_time = datetime.now() + timedelta(seconds=delay)
        
        # Update retry count
        job.retry_count += 1
        job.status = JobStatus.RETRYING
        job.scheduled_at = retry_time
        
        # Store updated job
        job_key = f"job:{job_id}"
        self.redis_client.hset(job_key, mapping={
            'data': json.dumps(asdict(job), default=str)
        })
        
        # Add to scheduled queue
        self.redis_client.zadd(
            self.scheduled_queue,
            {job_id: retry_time.timestamp()}
        )
        
        logger.info(f"Scheduled retry {job.retry_count}/{job.max_retries} for job {job_id} in {delay}s")
        return True

    def get_job_stats(self) -> JobStats:
        """Get job queue statistics."""
        # Count jobs in each queue
        pending_count = self.redis_client.zcard(self.pending_queue)
        running_count = self.redis_client.zcard(self.running_queue)
        completed_count = self.redis_client.zcard(self.completed_queue)
        failed_count = self.redis_client.zcard(self.failed_queue)
        scheduled_count = self.redis_client.zcard(self.scheduled_queue)
        
        total_jobs = pending_count + running_count + completed_count + failed_count + scheduled_count
        
        # Calculate success rate
        total_processed = completed_count + failed_count
        success_rate = (completed_count / total_processed * 100) if total_processed > 0 else 0
        
        return JobStats(
            total_jobs=total_jobs,
            pending_jobs=pending_count,
            running_jobs=running_count,
            completed_jobs=completed_count,
            failed_jobs=failed_count,
            avg_execution_time=0.0,  # TODO: Calculate from job data
            success_rate=success_rate,
            queue_size=pending_count + scheduled_count
        )

    def start_workers(self, num_workers: int = 3):
        """Start background worker threads."""
        if self.is_running:
            logger.warning("Workers already running")
            return
        
        self.is_running = True
        
        for i in range(num_workers):
            worker = threading.Thread(
                target=self._worker_loop,
                name=f"JobWorker-{i+1}",
                daemon=True
            )
            worker.start()
            self.worker_threads.append(worker)
        
        # Start scheduler thread
        scheduler = threading.Thread(
            target=self._scheduler_loop,
            name="JobScheduler",
            daemon=True
        )
        scheduler.start()
        self.worker_threads.append(scheduler)
        
        logger.info(f"Started {num_workers} job workers and scheduler")

    def stop_workers(self):
        """Stop background worker threads."""
        self.is_running = False
        
        for worker in self.worker_threads:
            worker.join(timeout=5)
        
        self.worker_threads.clear()
        logger.info("Stopped all job workers")

    def _worker_loop(self):
        """Main worker loop."""
        while self.is_running:
            try:
                # Get next job from pending queue (highest priority first)
                job_data = self.redis_client.bzpopmax(self.pending_queue, timeout=1)
                
                if not job_data:
                    continue
                
                queue_name, job_id, score = job_data
                self._execute_job(job_id)
                
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
                time.sleep(1)

    def _scheduler_loop(self):
        """Scheduler loop for recurring and delayed jobs."""
        while self.is_running:
            try:
                current_time = datetime.now().timestamp()
                
                # Get jobs ready for execution
                ready_jobs = self.redis_client.zrangebyscore(
                    self.scheduled_queue,
                    0,
                    current_time,
                    withscores=True
                )
                
                for job_id, scheduled_time in ready_jobs:
                    # Move to pending queue
                    self.redis_client.zrem(self.scheduled_queue, job_id)
                    
                    # Check if it's a recurring job
                    job = self.get_job(job_id)
                    if job and 'recurring' in job.tags:
                        # Schedule next occurrence
                        cron_expr = None
                        for tag in job.tags:
                            if tag.startswith('cron:'):
                                cron_expr = tag[5:]
                                break
                        
                        if cron_expr:
                            cron = croniter(cron_expr, datetime.now())
                            next_run = cron.get_next(datetime)
                            
                            # Update job with next run time
                            job.scheduled_at = next_run
                            job.status = JobStatus.SCHEDULED
                            
                            job_key = f"job:{job_id}"
                            self.redis_client.hset(job_key, mapping={
                                'data': json.dumps(asdict(job), default=str)
                            })
                            
                            # Re-add to scheduled queue
                            self.redis_client.zadd(
                                self.scheduled_queue,
                                {job_id: next_run.timestamp()}
                            )
                    
                    # Add to pending queue
                    priority = job.priority if job else JobPriority.NORMAL
                    self.redis_client.zadd(
                        self.pending_queue,
                        {job_id: priority.value}
                    )
                    
                    # Update status
                    if job:
                        self.update_job_status(job_id, JobStatus.PENDING)
                
                time.sleep(1)  # Check every second
                
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                time.sleep(5)

    def _execute_job(self, job_id: str):
        """Execute a job."""
        job = self.get_job(job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        # Check if job function is registered
        if job.func_name not in self.job_registry:
            logger.error(f"Job function {job.func_name} not registered")
            self._handle_job_failure(job_id, f"Function {job.func_name} not registered")
            return
        
        # Move to running queue
        self.redis_client.zrem(self.pending_queue, job_id)
        self.redis_client.zadd(self.running_queue, {job_id: time.time()})
        self.update_job_status(job_id, JobStatus.RUNNING)
        
        try:
            # Execute job
            func = self.job_registry[job.func_name]
            result = func(*job.args, **job.kwargs)
            
            # Job completed successfully
            self._handle_job_success(job_id, result)
            
        except Exception as e:
            # Job failed
            self._handle_job_failure(job_id, str(e))

    def _handle_job_success(self, job_id: str, result: Any):
        """Handle successful job completion."""
        # Move to completed queue
        self.redis_client.zrem(self.running_queue, job_id)
        self.redis_client.zadd(self.completed_queue, {job_id: time.time()})
        
        # Update job status
        self.update_job_status(job_id, JobStatus.COMPLETED, result=result)
        
        # Update statistics
        self.stats['total_processed'] += 1
        
        logger.info(f"Job {job_id} completed successfully")

    def _handle_job_failure(self, job_id: str, error: str):
        """Handle job failure."""
        job = self.get_job(job_id)
        if not job:
            return
        
        # Move to running queue
        self.redis_client.zrem(self.running_queue, job_id)
        
        # Check if we should retry
        if job.retry_count < job.max_retries:
            self.retry_job(job_id)
            self.stats['total_retries'] += 1
        else:
            # Move to failed queue
            self.redis_client.zadd(self.failed_queue, {job_id: time.time()})
            self.update_job_status(job_id, JobStatus.FAILED, error=error)
            self.stats['total_failed'] += 1
            
            logger.error(f"Job {job_id} failed permanently: {error}")


# Global job queue manager instance
_job_queue_manager = None


def get_job_queue_manager() -> JobQueueManager:
    """Get the global job queue manager instance."""
    global _job_queue_manager
    
    if _job_queue_manager is None:
        _job_queue_manager = JobQueueManager()
    
    return _job_queue_manager


def job(name: str, priority: JobPriority = JobPriority.NORMAL, **kwargs):
    """Decorator to register a job function."""
    def decorator(func):
        manager = get_job_queue_manager()
        manager.register_job(name, func)
        return func
    return decorator
