import time
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from utils.logging_config import get_logger
from .unified_connection_manager import UnifiedConnectionManager
from .models import Base

logger = get_logger(__name__)

# Import v5 metrics collection
try:
    # from utils.metrics_collector_v5 import MetricsCollector  # Module not found
    MetricsCollector = None  # Define as None since module not found
    METRICS_AVAILABLE = False
except ImportError:
    MetricsCollector = None
    METRICS_AVAILABLE = False
# !/usr/bin/env python3
"""Base repository class with generic CRUD operations.
This module provides a base repository class that implements common
database operations (CRUD) that can be inherited by specific repositories.
"""
# Generic type for SQLAlchemy models
T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Base repository class with generic CRUD operations."""

    def __init__(
        self, connection_manager: UnifiedConnectionManager, model_class: Type[T]
    ):
        """Initialize repository with connection manager and model class.
        Args:
            connection_manager: Database connection manager instance
            model_class: SQLAlchemy model class
        """
        self.connection_manager = connection_manager
        self.model_class = model_class
        self.logger = logger.bind(
            repository=self.__class__.__name__, model=model_class.__name__
        )
        
        # v5: Initialize metrics collector
        self._metrics_collector = MetricsCollector() if METRICS_AVAILABLE else None

    def create(self, data: Dict[str, Any]) -> Optional[T]:
        """Create a new record with v5 metrics.
        Args:
            data: Dictionary containing record data
        Returns:
            Created model instance or None if failed
        """
        start_time = time.time()
        operation_success = False
        
        try:
            with self.connection_manager.session_scope() as session:
                instance = self.model_class(**data)
                session.add(instance)
                session.flush()  # Get the ID without committing
                session.refresh(instance)
                record_id = getattr(instance, "id", None)
                
                operation_success = True
                duration_ms = (time.time() - start_time) * 1000
                
                self.logger.info("Created record", id=record_id, duration_ms=duration_ms)
                
                # v5: Record metrics
                if self._metrics_collector:
                    self._metrics_collector.record_database_operation(
                        operation="create",
                        table=self.model_class.__tablename__,
                        success=True,
                        duration_ms=duration_ms
                    )
                
                # Return a dict with the ID and basic info instead of the instance
                return {
                    "id": record_id,
                    "name": getattr(instance, "name", None),
                    "created": True,
                }
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            # v5: Record failed operation metrics
            if self._metrics_collector:
                self._metrics_collector.record_database_operation(
                    operation="create",
                    table=self.model_class.__tablename__,
                    success=False,
                    duration_ms=duration_ms,
                    error=str(e)
                )
            
            self.logger.exception("Failed to create record", error=str(e), data=data)
            return None

    def get_by_id(self, record_id: Any) -> Optional[T]:
        """Get a record by its primary key.
        Args:
            record_id: Primary key value
        Returns:
            Model instance or None if not found
        """
        try:
            session = self.connection_manager.get_session()
            instance = session.query(self.model_class).filter_by(id=record_id).first()
            session.close()
            return instance
        except Exception as e:
            self.logger.exception(
                "Failed to get record by ID", id=record_id, error=str(e)
            )
            return None

    def get_all(
        self,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[T]:
        """Get all records with optional filtering and pagination.
        Args:
            limit: Maximum number of records to return
            offset: Number of records to skip
            filters: Dictionary of field filters
        Returns:
            List of model instances
        """
        try:
            session = self.connection_manager.get_session()
            query = session.query(self.model_class)
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model_class, field):
                        query = query.filter(getattr(self.model_class, field) == value)
            # Apply pagination
            if offset is not None:
                query = query.offset(offset)
            if limit is not None:
                query = query.limit(limit)
            instances = query.all()
            session.close()
            return instances
        except Exception as e:
            self.logger.exception("Failed to get records", error=str(e))
            return []

    def update(self, record_id: Any, data: Dict[str, Any]) -> bool:
        """Update a record by its primary key.
        Args:
            record_id: Primary key value
            data: Dictionary containing fields to update
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.connection_manager.session_scope() as session:
                instance = (
                    session.query(self.model_class).filter_by(id=record_id).first()
                )
                if not instance:
                    self.logger.warning("Record not found for update", id=record_id)
                    return False
                # Update fields
                for field, value in data.items():
                    if hasattr(instance, field):
                        setattr(instance, field, value)
                self.logger.info("Updated record", id=record_id)
                return True
        except Exception as e:
            self.logger.exception("Failed to update record", id=record_id, error=str(e))
            return False

    def delete(self, record_id: Any) -> bool:
        """Delete a record by its primary key.
        Args:
            record_id: Primary key value
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.connection_manager.session_scope() as session:
                instance = (
                    session.query(self.model_class).filter_by(id=record_id).first()
                )
                if not instance:
                    self.logger.warning("Record not found for deletion", id=record_id)
                    return False
                session.delete(instance)
                self.logger.info("Deleted record", id=record_id)
                return True
        except Exception as e:
            self.logger.exception("Failed to delete record", id=record_id, error=str(e))
            return False

    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get the total count of records with optional filtering.
        Args:
            filters: Dictionary of field filters
        Returns:
            Total count of records
        """
        try:
            session = self.connection_manager.get_session()
            query = session.query(self.model_class)
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model_class, field):
                        query = query.filter(getattr(self.model_class, field) == value)
            count = query.count()
            session.close()
            return count
        except Exception as e:
            self.logger.exception("Failed to count records", error=str(e))
            return 0

    def exists(self, record_id: Any) -> bool:
        """Check if a record exists by its primary key.
        Args:
            record_id: Primary key value
        Returns:
            True if record exists, False otherwise
        """
        try:
            session = self.connection_manager.get_session()
            exists = (
                session.query(self.model_class).filter_by(id=record_id).first()
                is not None
            )
            session.close()
            return exists
        except Exception as e:
            self.logger.exception(
                "Failed to check record existence", id=record_id, error=str(e)
            )
            return False

    def find_by_field(self, field: str, value: Any) -> Optional[T]:
        """Find a record by a specific field value.
        Args:
            field: Field name to search by
            value: Field value to search for
        Returns:
            Model instance or None if not found
        """
        try:
            if not hasattr(self.model_class, field):
                self.logger.warning("Field does not exist on model", field=field)
                return None
            session = self.connection_manager.get_session()
            instance = (
                session.query(self.model_class).filter_by(**{field: value}).first()
            )
            session.close()
            return instance
        except Exception as e:
            self.logger.exception(
                "Failed to find record by field", field=field, value=value, error=str(e)
            )
            return None

    def find_all_by_field(self, field: str, value: Any) -> List[T]:
        """Find all records by a specific field value.
        Args:
            field: Field name to search by
            value: Field value to search for
        Returns:
            List of model instances
        """
        try:
            if not hasattr(self.model_class, field):
                self.logger.warning("Field does not exist on model", field=field)
                return []
            session = self.connection_manager.get_session()
            instances = (
                session.query(self.model_class).filter_by(**{field: value}).all()
            )
            session.close()
            return instances
        except Exception as e:
            self.logger.exception(
                "Failed to find records by field",
                field=field,
                value=value,
                error=str(e),
            )
            return []

    def bulk_create(self, data_list: List[Dict[str, Any]]) -> List[T]:
        """Create multiple records in a single transaction.
        Args:
            data_list: List of dictionaries containing record data
        Returns:
            List of created model instances
        """
        try:
            with self.connection_manager.session_scope() as session:
                instances = []
                for data in data_list:
                    instance = self.model_class(**data)
                    session.add(instance)
                    instances.append(instance)
                session.flush()  # Get IDs without committing
                for instance in instances:
                    session.refresh(instance)
                self.logger.info("Bulk created records", count=len(instances))
                return instances
        except Exception as e:
            self.logger.exception("Failed to bulk create records", error=str(e))
            return []

    def bulk_update(self, updates: List[Dict[str, Any]]) -> bool:
        """Update multiple records in a single transaction.
        Args:
            updates: List of dictionaries with 'id' and update data
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.connection_manager.session_scope() as session:
                for update_data in updates:
                    record_id = update_data.pop("id", None)
                    if record_id is None:
                        continue
                    instance = (
                        session.query(self.model_class).filter_by(id=record_id).first()
                    )
                    if instance:
                        for field, value in update_data.items():
                            if hasattr(instance, field):
                                setattr(instance, field, value)
                self.logger.info("Bulk updated records", count=len(updates))
                return True
        except Exception as e:
            self.logger.exception("Failed to bulk update records", error=str(e))
            return False
