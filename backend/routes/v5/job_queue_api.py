#!/usr/bin/env python3
"""
Job Queue API Routes for JewGo Backend
======================================

This module provides API endpoints for managing background jobs:
- Job submission and scheduling
- Job status monitoring
- Job statistics and metrics
- Job queue management
- Recurring job scheduling

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

from utils.logging_config import get_logger
from middleware.auth_v5 import require_auth_v5
from middleware.rate_limit_v5 import rate_limit_v5
from services.job_queue_manager import (
    get_job_queue_manager, 
    JobPriority
)
from services.background_jobs import initialize_background_jobs

logger = get_logger(__name__)

# Create job queue API blueprint
job_queue_api = Blueprint('job_queue_api', __name__, url_prefix='/api/v5/jobs')


@job_queue_api.route('/submit', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def submit_job():
    """Submit a new job to the queue."""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        job_name = data.get('name')
        if not job_name:
            return jsonify({
                'success': False,
                'error': 'Job name is required'
            }), 400
        
        # Get job parameters
        args = data.get('args', [])
        kwargs = data.get('kwargs', {})
        priority = data.get('priority', 'NORMAL')
        delay = data.get('delay')  # seconds
        max_retries = data.get('max_retries', 3)
        timeout = data.get('timeout', 300)
        tags = data.get('tags', [])
        
        # Validate priority
        try:
            job_priority = JobPriority[priority.upper()]
        except KeyError:
            return jsonify({
                'success': False,
                'error': f'Invalid priority: {priority}. Valid options: {[p.name for p in JobPriority]}'
            }), 400
        
        # Submit job
        job_manager = get_job_queue_manager()
        job_id = job_manager.enqueue_job(
            name=job_name,
            *args,
            priority=job_priority,
            delay=delay,
            max_retries=max_retries,
            timeout=timeout,
            tags=tags,
            **kwargs
        )
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': f'Job {job_name} submitted successfully',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error submitting job: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to submit job'
        }), 500


@job_queue_api.route('/schedule', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def schedule_recurring_job():
    """Schedule a recurring job with cron expression."""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        job_name = data.get('name')
        cron_expression = data.get('cron')
        
        if not job_name:
            return jsonify({
                'success': False,
                'error': 'Job name is required'
            }), 400
        
        if not cron_expression:
            return jsonify({
                'success': False,
                'error': 'Cron expression is required'
            }), 400
        
        # Get job parameters
        args = data.get('args', [])
        kwargs = data.get('kwargs', {})
        priority = data.get('priority', 'NORMAL')
        max_retries = data.get('max_retries', 3)
        timeout = data.get('timeout', 300)
        tags = data.get('tags', [])
        
        # Validate priority
        try:
            job_priority = JobPriority[priority.upper()]
        except KeyError:
            return jsonify({
                'success': False,
                'error': f'Invalid priority: {priority}. Valid options: {[p.name for p in JobPriority]}'
            }), 400
        
        # Schedule job
        job_manager = get_job_queue_manager()
        job_id = job_manager.schedule_recurring_job(
            name=job_name,
            cron_expression=cron_expression,
            *args,
            priority=job_priority,
            max_retries=max_retries,
            timeout=timeout,
            tags=tags,
            **kwargs
        )
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': f'Recurring job {job_name} scheduled successfully',
            'cron_expression': cron_expression,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error scheduling recurring job: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to schedule recurring job'
        }), 500


@job_queue_api.route('/<job_id>', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_job_status(job_id: str):
    """Get job status and details."""
    try:
        job_manager = get_job_queue_manager()
        job = job_manager.get_job(job_id)
        
        if not job:
            return jsonify({
                'success': False,
                'error': 'Job not found'
            }), 404
        
        # Convert job to dictionary
        job_data = {
            'id': job.id,
            'name': job.name,
            'status': job.status.value,
            'priority': job.priority.name,
            'created_at': job.created_at.isoformat(),
            'scheduled_at': job.scheduled_at.isoformat() if job.scheduled_at else None,
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
            'retry_count': job.retry_count,
            'max_retries': job.max_retries,
            'timeout': job.timeout,
            'tags': job.tags,
            'result': job.result,
            'error': job.error
        }
        
        return jsonify({
            'success': True,
            'job': job_data,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting job status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get job status'
        }), 500


@job_queue_api.route('/<job_id>/cancel', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def cancel_job(job_id: str):
    """Cancel a job."""
    try:
        job_manager = get_job_queue_manager()
        success = job_manager.cancel_job(job_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Job not found or cannot be cancelled'
            }), 404
        
        return jsonify({
            'success': True,
            'message': f'Job {job_id} cancelled successfully',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to cancel job'
        }), 500


@job_queue_api.route('/<job_id>/retry', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def retry_job(job_id: str):
    """Retry a failed job."""
    try:
        job_manager = get_job_queue_manager()
        success = job_manager.retry_job(job_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Job not found or cannot be retried'
            }), 404
        
        return jsonify({
            'success': True,
            'message': f'Job {job_id} scheduled for retry',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrying job: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retry job'
        }), 500


@job_queue_api.route('/stats', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_job_stats():
    """Get job queue statistics."""
    try:
        job_manager = get_job_queue_manager()
        stats = job_manager.get_job_stats()
        
        stats_data = {
            'total_jobs': stats.total_jobs,
            'pending_jobs': stats.pending_jobs,
            'running_jobs': stats.running_jobs,
            'completed_jobs': stats.completed_jobs,
            'failed_jobs': stats.failed_jobs,
            'avg_execution_time': stats.avg_execution_time,
            'success_rate': stats.success_rate,
            'queue_size': stats.queue_size
        }
        
        return jsonify({
            'success': True,
            'stats': stats_data,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting job stats: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get job statistics'
        }), 500


@job_queue_api.route('/queue', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_queue_status():
    """Get current queue status and pending jobs."""
    try:
        job_manager = get_job_queue_manager()
        
        # Get pending jobs
        pending_jobs = job_manager.redis_client.zrange(
            job_manager.pending_queue, 0, 9, withscores=True
        )
        
        # Get running jobs
        running_jobs = job_manager.redis_client.zrange(
            job_manager.running_queue, 0, 9, withscores=True
        )
        
        # Get scheduled jobs
        scheduled_jobs = job_manager.redis_client.zrange(
            job_manager.scheduled_queue, 0, 9, withscores=True
        )
        
        queue_data = {
            'pending': [
                {
                    'job_id': job_id,
                    'priority': score,
                    'job': job_manager.get_job(job_id)
                }
                for job_id, score in pending_jobs
            ],
            'running': [
                {
                    'job_id': job_id,
                    'started_at': datetime.fromtimestamp(score).isoformat(),
                    'job': job_manager.get_job(job_id)
                }
                for job_id, score in running_jobs
            ],
            'scheduled': [
                {
                    'job_id': job_id,
                    'scheduled_at': datetime.fromtimestamp(score).isoformat(),
                    'job': job_manager.get_job(job_id)
                }
                for job_id, score in scheduled_jobs
            ]
        }
        
        return jsonify({
            'success': True,
            'queue': queue_data,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get queue status'
        }), 500


@job_queue_api.route('/health', methods=['GET'])
def job_queue_health():
    """Job queue system health check."""
    try:
        job_manager = get_job_queue_manager()
        
        # Check Redis connection
        redis_healthy = job_manager.redis_client.ping()
        
        # Check worker status
        workers_running = job_manager.is_running
        
        # Get basic stats
        stats = job_manager.get_job_stats()
        
        health_status = "healthy" if redis_healthy and workers_running else "unhealthy"
        
        return jsonify({
            'status': health_status,
            'redis_connected': redis_healthy,
            'workers_running': workers_running,
            'queue_size': stats.queue_size,
            'total_jobs': stats.total_jobs,
            'timestamp': datetime.now().isoformat()
        }), 200 if health_status == "healthy" else 503
        
    except Exception as e:
        logger.error(f"Job queue health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@job_queue_api.route('/initialize', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def initialize_job_system():
    """Initialize the background job system."""
    try:
        success = initialize_background_jobs()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Background job system initialized successfully',
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to initialize background job system'
            }), 500
        
    except Exception as e:
        logger.error(f"Error initializing job system: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to initialize job system'
        }), 500
