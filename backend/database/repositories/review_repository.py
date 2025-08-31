import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import and_, func, or_
from utils.logging_config import get_logger
from ..base_repository import BaseRepository
from ..connection_manager import DatabaseConnectionManager
from ..models import Review, ReviewFlag

logger = get_logger(__name__)
# !/usr/bin/env python3
"""Review repository for database operations.
This module handles all review-related database operations,
separating data access logic from business logic.
"""


class ReviewRepository(BaseRepository[Review]):
    """Repository for review database operations."""

    def __init__(self, connection_manager: DatabaseConnectionManager):
        """Initialize review repository."""
        super().__init__(connection_manager, Review)
        self.logger = logger.bind(repository="ReviewRepository")

    def get_reviews(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Review]:
        """Get reviews with optional filtering and pagination."""
        self.logger.info(f"ReviewRepository: Getting reviews for restaurant_id={restaurant_id}, status={status}, limit={limit}, offset={offset}")
        try:
            session = self.connection_manager.get_session()
            query = session.query(Review)
            # Apply filters if provided
            if filters:
                if filters.get("restaurant_id"):
                    query = query.filter(
                        Review.restaurant_id == filters["restaurant_id"]
                    )
                if filters.get("status"):
                    query = query.filter(Review.status == filters["status"])
                if filters.get("user_id"):
                    query = query.filter(Review.user_id == filters["user_id"])
                if filters.get("rating"):
                    query = query.filter(Review.rating == filters["rating"])
                if filters.get("search"):
                    search_term = filters["search"]
                    query = query.filter(
                        or_(
                            Review.title.ilike(f"%{search_term}%"),
                            Review.content.ilike(f"%{search_term}%"),
                            Review.user_name.ilike(f"%{search_term}%"),
                        )
                    )
            # Apply legacy filters if no filters dict provided
            if not filters:
                if restaurant_id:
                    query = query.filter(Review.restaurant_id == restaurant_id)
                if status:
                    query = query.filter(Review.status == status)
            # Add ordering for consistent results
            query = query.order_by(Review.created_at.desc())
            reviews = query.limit(limit).offset(offset).all()
            self.logger.info(f"ReviewRepository: Found {len(reviews)} reviews in database")
            session.close()
            return reviews
        except Exception as e:
            self.logger.exception("Error fetching reviews", error=str(e))
            return []

    def get_reviews_by_restaurant(
        self,
        restaurant_id: int,
        status: str = "approved",
        limit: int = 50,
        offset: int = 0,
    ) -> List[Review]:
        """Get reviews for a specific restaurant."""
        try:
            session = self.connection_manager.get_session()
            reviews = (
                session.query(Review)
                .filter(
                    and_(Review.restaurant_id == restaurant_id, Review.status == status)
                )
                .order_by(Review.created_at.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )
            session.close()
            return reviews
        except Exception as e:
            self.logger.exception("Error fetching reviews by restaurant", error=str(e))
            return []

    def get_reviews_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Review]:
        """Get reviews by a specific user."""
        try:
            session = self.connection_manager.get_session()
            reviews = (
                session.query(Review)
                .filter(Review.user_id == user_id)
                .order_by(Review.created_at.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )
            session.close()
            return reviews
        except Exception as e:
            self.logger.exception("Error fetching reviews by user", error=str(e))
            return []

    def get_pending_reviews(self, limit: int = 20) -> List[Review]:
        """Get reviews pending moderation."""
        try:
            session = self.connection_manager.get_session()
            reviews = (
                session.query(Review)
                .filter(Review.status == "pending")
                .order_by(Review.created_at.asc())
                .limit(limit)
                .all()
            )
            session.close()
            return reviews
        except Exception as e:
            self.logger.exception("Error fetching pending reviews", error=str(e))
            return []

    def get_reviews_count(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Get the total count of reviews with optional filtering."""
        try:
            session = self.connection_manager.get_session()
            query = session.query(Review)
            # Apply filters if provided
            if filters:
                if filters.get("restaurant_id"):
                    query = query.filter(
                        Review.restaurant_id == filters["restaurant_id"]
                    )
                if filters.get("status"):
                    query = query.filter(Review.status == filters["status"])
                if filters.get("user_id"):
                    query = query.filter(Review.user_id == filters["user_id"])
                if filters.get("rating"):
                    query = query.filter(Review.rating == filters["rating"])
            # Apply legacy filters if no filters dict provided
            if not filters:
                if restaurant_id:
                    query = query.filter(Review.restaurant_id == restaurant_id)
                if status:
                    query = query.filter(Review.status == status)
            count = query.count()
            session.close()
            return count
        except Exception as e:
            self.logger.exception("Error getting reviews count", error=str(e))
            return 0

    def create_review(self, review_data: Dict[str, Any]) -> Optional[str]:
        """Create a new review with generated ID."""
        try:
            # Generate review ID
            review_id = f"rev_{int(datetime.utcnow().timestamp())}_{hash(str(review_data)) % 10000}"
            # Add ID to review data
            review_data["id"] = review_id
            # Handle images field
            if "images" in review_data and isinstance(review_data["images"], list):
                review_data["images"] = json.dumps(review_data["images"])
            # Set default values
            review_data.setdefault("status", "pending")
            review_data.setdefault("verified_purchase", False)
            review_data.setdefault("helpful_count", 0)
            review_data.setdefault("report_count", 0)
            instance = self.create(review_data)
            if instance:
                self.logger.info(
                    "Created review for restaurant",
                    review_id=review_id,
                    restaurant_id=review_data.get("restaurant_id"),
                )
                return review_id
            return None
        except Exception as e:
            self.logger.exception("Error creating review", error=str(e))
            return None

    def update_review_status(
        self, review_id: str, status: str, moderator_notes: Optional[str] = None
    ) -> bool:
        """Update review status and moderator notes."""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow(),
            }
            if moderator_notes is not None:
                update_data["moderator_notes"] = moderator_notes
            success = self.update(review_id, update_data)
            if success:
                self.logger.info(
                    "Updated review status", review_id=review_id, status=status
                )
            return success
        except Exception as e:
            self.logger.exception("Error updating review status", error=str(e))
            return False

    def increment_helpful_count(self, review_id: str) -> bool:
        """Increment the helpful count for a review."""
        try:
            session = self.connection_manager.get_session()
            review = session.query(Review).filter(Review.id == review_id).first()
            if review:
                review.helpful_count += 1
                review.updated_at = datetime.utcnow()
                session.commit()
                session.close()
                self.logger.info("Incremented helpful count", review_id=review_id)
                return True
            session.close()
            return False
        except Exception as e:
            self.logger.exception("Error incrementing helpful count", error=str(e))
            return False

    def increment_report_count(self, review_id: str) -> bool:
        """Increment the report count for a review."""
        try:
            session = self.connection_manager.get_session()
            review = session.query(Review).filter(Review.id == review_id).first()
            if review:
                review.report_count += 1
                review.updated_at = datetime.utcnow()
                session.commit()
                session.close()
                self.logger.info("Incremented report count", review_id=review_id)
                return True
            session.close()
            return False
        except Exception as e:
            self.logger.exception("Error incrementing report count", error=str(e))
            return False

    def get_review_statistics(self) -> Dict[str, Any]:
        """Get review statistics."""
        try:
            session = self.connection_manager.get_session()
            # Total reviews
            total_reviews = session.query(Review).count()
            # Reviews by status
            status_stats = (
                session.query(Review.status, func.count(Review.id))
                .group_by(Review.status)
                .all()
            )
            # Average rating
            avg_rating = (
                session.query(func.avg(Review.rating))
                .filter(Review.status == "approved")
                .scalar()
            )
            # Reviews by rating
            rating_stats = (
                session.query(Review.rating, func.count(Review.id))
                .filter(Review.status == "approved")
                .group_by(Review.rating)
                .all()
            )
            session.close()
            return {
                "total_reviews": total_reviews,
                "status_distribution": dict(status_stats),
                "average_rating": float(avg_rating) if avg_rating else 0.0,
                "rating_distribution": dict(rating_stats),
                "pending_reviews": dict(status_stats).get("pending", 0),
                "approved_reviews": dict(status_stats).get("approved", 0),
                "rejected_reviews": dict(status_stats).get("rejected", 0),
            }
        except Exception as e:
            self.logger.exception("Error getting review statistics", error=str(e))
            return {}

    def flag_review(
        self, review_id: str, reason: str, description: str, reported_by: str
    ) -> bool:
        """Flag a review for moderation."""
        try:
            # Create review flag
            flag_id = f"flag_{int(datetime.utcnow().timestamp())}_{hash(f'{review_id}{reported_by}') % 10000}"
            flag_data = {
                "id": flag_id,
                "review_id": review_id,
                "reason": reason,
                "description": description,
                "reported_by": reported_by,
                "status": "pending",
            }
            # Use the connection manager to create the flag
            with self.connection_manager.session_scope() as session:
                flag = ReviewFlag(**flag_data)
                session.add(flag)
                session.flush()
            # Increment report count on the review
            self.increment_report_count(review_id)
            self.logger.info("Flagged review", review_id=review_id, flag_id=flag_id)
            return True
        except Exception as e:
            self.logger.exception("Error flagging review", error=str(e))
            return False

    def get_flagged_reviews(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get reviews that have been flagged for moderation."""
        try:
            session = self.connection_manager.get_session()
            # Get reviews with flags
            flagged_reviews = (
                session.query(Review, func.count(ReviewFlag.id).label("flag_count"))
                .join(ReviewFlag, Review.id == ReviewFlag.review_id)
                .filter(ReviewFlag.status == "pending")
                .group_by(Review.id)
                .order_by(func.count(ReviewFlag.id).desc())
                .limit(limit)
                .all()
            )
            result = []
            for review, flag_count in flagged_reviews:
                review_dict = {
                    "id": review.id,
                    "restaurant_id": review.restaurant_id,
                    "user_id": review.user_id,
                    "user_name": review.user_name,
                    "rating": review.rating,
                    "title": review.title,
                    "content": review.content,
                    "status": review.status,
                    "created_at": (
                        review.created_at.isoformat() if review.created_at else None
                    ),
                    "flag_count": flag_count,
                }
                result.append(review_dict)
            session.close()
            return result
        except Exception as e:
            self.logger.exception("Error getting flagged reviews", error=str(e))
            return []
