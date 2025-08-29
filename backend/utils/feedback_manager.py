#!/usr/bin/env python3
"""Feedback Manager for JewGo App.
=============================
Handles user feedback submissions, storage, and management.
"""

import json
import uuid
from datetime import datetime
from typing import Any

from database.database_manager_v3 import EnhancedDatabaseManager
from sqlalchemy import text
from utils.logging_config import get_logger

logger = get_logger(__name__)
"""Feedback Manager for JewGo App.
=============================
Handles user feedback submissions, storage, and management.
"""


class FeedbackManager:
    """Manages user feedback submissions and processing."""

    def __init__(self) -> None:
        self.db_manager = None
        self._init_database()

    def _init_database(self) -> None:
        """Initialize database connection."""
        try:
            self.db_manager = EnhancedDatabaseManager()
            self.db_manager.connect()
        except Exception as e:
            logger.exception("Failed to initialize database connection", error=str(e))

    def submit_feedback(self, data: dict[str, Any]) -> str:
        """Submit new feedback."""
        try:
            feedback_id = data.get("id") or f"feedback_{uuid.uuid4().hex[:12]}"

            # Prepare feedback data
            feedback_data = {
                "id": feedback_id,
                "type": data["type"],
                "category": data["category"],
                "description": data["description"],
                "priority": data.get("priority", "medium"),
                "restaurant_id": data.get("restaurant_id"),
                "restaurant_name": data.get("restaurant_name"),
                "contact_email": data.get("contact_email"),
                "attachments": json.dumps(data.get("attachments", [])),
                "status": data.get("status", "pending"),
                "created_at": data.get("created_at") or datetime.utcnow().isoformat(),
                "user_agent": data.get("user_agent"),
                "ip_address": data.get("ip_address"),
                "referrer": data.get("referrer"),
                "admin_notes": None,
                "assigned_to": None,
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Insert into database
            query = """
                INSERT INTO feedback (
                    id, type, category, description, priority, restaurant_id,
                    restaurant_name, contact_email, attachments, status,
                    created_at, user_agent, ip_address, referrer,
                    admin_notes, assigned_to, updated_at
                ) VALUES (
                    :id, :type, :category, :description, :priority, :restaurant_id,
                    :restaurant_name, :contact_email, :attachments, :status,
                    :created_at, :user_agent, :ip_address, :referrer,
                    :admin_notes, :assigned_to, :updated_at
                )
            """

            self.db_manager.session.execute(text(query), feedback_data)
            self.db_manager.session.commit()

            logger.info("Feedback submitted successfully", feedback_id=feedback_id)
            return feedback_id

        except Exception as e:
            logger.exception("Error submitting feedback", error=str(e))
            if self.db_manager:
                self.db_manager.session.rollback()
            raise

    def get_feedback(
        self,
        restaurant_id: int | None = None,
        status: str | None = None,
        feedback_type: str | None = None,
        priority: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get feedback submissions with filters."""
        try:
            # Build query
            query = "SELECT * FROM feedback WHERE 1=1"
            params = {}

            if restaurant_id:
                query += " AND restaurant_id = :restaurant_id"
                params["restaurant_id"] = restaurant_id

            if status:
                query += " AND status = :status"
                params["status"] = status

            if feedback_type:
                query += " AND type = :feedback_type"
                params["feedback_type"] = feedback_type

            if priority:
                query += " AND priority = :priority"
                params["priority"] = priority

            query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            params["limit"] = limit
            params["offset"] = offset

            # Execute query
            result = self.db_manager.session.execute(text(query), params)
            feedback_list = []

            for row in result:
                feedback = dict(row._mapping)
                # Parse attachments JSON
                if feedback.get("attachments"):
                    try:
                        feedback["attachments"] = json.loads(feedback["attachments"])
                    except:
                        feedback["attachments"] = []
                else:
                    feedback["attachments"] = []

                feedback_list.append(feedback)

            return feedback_list

        except Exception as e:
            logger.exception("Error fetching feedback", error=str(e))
            return []

    def get_feedback_by_id(self, feedback_id: str) -> dict[str, Any] | None:
        """Get specific feedback by ID."""
        try:
            query = "SELECT * FROM feedback WHERE id = :feedback_id"
            result = self.db_manager.session.execute(
                text(query),
                {"feedback_id": feedback_id},
            )
            row = result.fetchone()

            if row:
                feedback = dict(row._mapping)
                # Parse attachments JSON
                if feedback.get("attachments"):
                    try:
                        feedback["attachments"] = json.loads(feedback["attachments"])
                    except:
                        feedback["attachments"] = []
                else:
                    feedback["attachments"] = []

                return feedback

            return None

        except Exception as e:
            logger.exception(
                "Error fetching feedback by ID",
                error=str(e),
                feedback_id=feedback_id,
            )
            return None

    def update_feedback(self, feedback_id: str, data: dict[str, Any]) -> bool:
        """Update feedback status and notes."""
        try:
            # Build update query
            update_fields = []
            params = {"feedback_id": feedback_id}

            if "status" in data:
                update_fields.append("status = :status")
                params["status"] = data["status"]

            if "admin_notes" in data:
                update_fields.append("admin_notes = :admin_notes")
                params["admin_notes"] = data["admin_notes"]

            if "assigned_to" in data:
                update_fields.append("assigned_to = :assigned_to")
                params["assigned_to"] = data["assigned_to"]

            if "priority" in data:
                update_fields.append("priority = :priority")
                params["priority"] = data["priority"]

            if not update_fields:
                return False

            update_fields.append("updated_at = :updated_at")
            params["updated_at"] = datetime.utcnow().isoformat()

            query = f"UPDATE feedback SET {', '.join(update_fields)} WHERE id = :feedback_id"

            result = self.db_manager.session.execute(text(query), params)
            self.db_manager.session.commit()

            return result.rowcount > 0

        except Exception as e:
            logger.exception(
                "Error updating feedback",
                error=str(e),
                feedback_id=feedback_id,
            )
            if self.db_manager:
                self.db_manager.session.rollback()
            return False

    def delete_feedback(self, feedback_id: str) -> bool:
        """Delete feedback submission."""
        try:
            query = "DELETE FROM feedback WHERE id = :feedback_id"
            result = self.db_manager.session.execute(
                text(query),
                {"feedback_id": feedback_id},
            )
            self.db_manager.session.commit()

            return result.rowcount > 0

        except Exception as e:
            logger.exception(
                "Error deleting feedback",
                error=str(e),
                feedback_id=feedback_id,
            )
            if self.db_manager:
                self.db_manager.session.rollback()
            return False

    def get_feedback_stats(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, Any]:
        """Get feedback statistics."""
        try:
            # Build date filter
            date_filter = ""
            params = {}

            if start_date and end_date:
                date_filter = "WHERE created_at BETWEEN :start_date AND :end_date"
                params["start_date"] = start_date
                params["end_date"] = end_date
            elif start_date:
                date_filter = "WHERE created_at >= :start_date"
                params["start_date"] = start_date
            elif end_date:
                date_filter = "WHERE created_at <= :end_date"
                params["end_date"] = end_date

            # Get total count
            total_query = f"SELECT COUNT(*) as total FROM feedback {date_filter}"
            total_result = self.db_manager.session.execute(text(total_query), params)
            total = total_result.fetchone()["total"]

            # Get counts by type
            type_query = f"""
                SELECT type, COUNT(*) as count
                FROM feedback {date_filter}
                GROUP BY type
            """
            type_result = self.db_manager.session.execute(text(type_query), params)
            type_counts = {row["type"]: row["count"] for row in type_result}

            # Get counts by status
            status_query = f"""
                SELECT status, COUNT(*) as count
                FROM feedback {date_filter}
                GROUP BY status
            """
            status_result = self.db_manager.session.execute(text(status_query), params)
            status_counts = {row["status"]: row["count"] for row in status_result}

            # Get counts by priority
            priority_query = f"""
                SELECT priority, COUNT(*) as count
                FROM feedback {date_filter}
                GROUP BY priority
            """
            priority_result = self.db_manager.session.execute(
                text(priority_query),
                params,
            )
            priority_counts = {row["priority"]: row["count"] for row in priority_result}

            # Get top categories
            category_query = f"""
                SELECT category, COUNT(*) as count
                FROM feedback {date_filter}
                GROUP BY category
                ORDER BY count DESC
                LIMIT 10
            """
            category_result = self.db_manager.session.execute(
                text(category_query),
                params,
            )
            top_categories = [
                {"category": row["category"], "count": row["count"]}
                for row in category_result
            ]

            # Get recent activity
            recent_query = f"""
                SELECT created_at, type, category, status
                FROM feedback {date_filter}
                ORDER BY created_at DESC
                LIMIT 20
            """
            recent_result = self.db_manager.session.execute(text(recent_query), params)
            recent_activity = [dict(row._mapping) for row in recent_result]

            return {
                "total": total,
                "by_type": type_counts,
                "by_status": status_counts,
                "by_priority": priority_counts,
                "top_categories": top_categories,
                "recent_activity": recent_activity,
                "period": {
                    "start_date": start_date,
                    "end_date": end_date,
                },
            }

        except Exception as e:
            logger.exception("Error fetching feedback stats", error=str(e))
            return {
                "total": 0,
                "by_type": {},
                "by_status": {},
                "by_priority": {},
                "top_categories": [],
                "recent_activity": [],
                "period": {
                    "start_date": start_date,
                    "end_date": end_date,
                },
            }

    def get_feedback_by_restaurant(self, restaurant_id: int) -> list[dict[str, Any]]:
        """Get all feedback for a specific restaurant."""
        return self.get_feedback(restaurant_id=restaurant_id)

    def get_pending_feedback(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get pending feedback submissions."""
        return self.get_feedback(status="pending", limit=limit)

    def get_high_priority_feedback(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get high priority feedback."""
        return self.get_feedback(priority="high", limit=limit)

    def mark_feedback_resolved(
        self,
        feedback_id: str,
        admin_notes: str | None = None,
    ) -> bool:
        """Mark feedback as resolved."""
        update_data = {"status": "resolved"}
        if admin_notes:
            update_data["admin_notes"] = admin_notes

        return self.update_feedback(feedback_id, update_data)

    def assign_feedback(self, feedback_id: str, assigned_to: str) -> bool:
        """Assign feedback to a team member."""
        return self.update_feedback(feedback_id, {"assigned_to": assigned_to})

    def close(self) -> None:
        """Close database connection."""
        if self.db_manager:
            self.db_manager.close()
