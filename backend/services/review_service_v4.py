import os
import sys
from typing import Any, Dict, List, Optional

from services.base_service import BaseService
from utils.error_handler import NotFoundError, ValidationError

#!/usr/bin/env python3
"""Review service v4 - handles all review-related business logic using DatabaseManager v4."""

class ReviewServiceV4(BaseService):
    """Service for review-related operations using DatabaseManager v4."""

    def get_reviews(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get reviews with optional filtering and pagination.

        Args:
            restaurant_id: Optional restaurant ID to filter by
            status: Optional review status to filter by
            limit: Maximum number of reviews to return
            offset: Number of reviews to skip
            filters: Additional filters to apply

        Returns:
            List of review dictionaries

        """
        self.log_operation("get_reviews", restaurant_id=restaurant_id, status=status)

        try:
            # Use database manager v4's get_reviews method
            reviews = self.db_manager.get_reviews(
                restaurant_id=restaurant_id,
                status=status,
                limit=limit,
                offset=offset,
                filters=filters,
            )

            self.logger.info(
                "Successfully retrieved reviews",
                count=len(reviews),
                restaurant_id=restaurant_id,
                status=status,
            )
            return reviews

        except Exception as e:
            self.logger.exception("Error retrieving reviews", error=str(e))
            raise

    def get_reviews_count(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Get the total count of reviews with optional filtering.

        Args:
            restaurant_id: Optional restaurant ID to filter by
            status: Optional review status to filter by
            filters: Additional filters to apply

        Returns:
            Total count of reviews

        """
        self.log_operation("get_reviews_count", restaurant_id=restaurant_id, status=status)

        try:
            # Use database manager v4's get_reviews_count method
            count = self.db_manager.get_reviews_count(
                restaurant_id=restaurant_id,
                status=status,
                filters=filters,
            )

            self.logger.info(
                "Successfully retrieved reviews count",
                count=count,
                restaurant_id=restaurant_id,
                status=status,
            )
            return count

        except Exception as e:
            self.logger.exception("Error retrieving reviews count", error=str(e))
            raise

    def get_review_by_id(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Get a review by its ID.

        Args:
            review_id: Review ID

        Returns:
            Review dictionary or None if not found

        """
        if not review_id:
            raise ValidationError("Review ID is required")

        self.log_operation("get_review_by_id", review_id=review_id)

        try:
            # Use database manager v4's get_review_by_id method
            review = self.db_manager.get_review_by_id(review_id)

            if review:
                self.logger.info("Successfully retrieved review", review_id=review_id)
            else:
                self.logger.warning("Review not found", review_id=review_id)

            return review

        except Exception as e:
            self.logger.exception("Error retrieving review", error=str(e))
            raise

    def create_review(self, review_data: Dict[str, Any]) -> str:
        """Create a new review.

        Args:
            review_data: Review data dictionary

        Returns:
            Created review ID

        Raises:
            ValidationError: If required fields are missing

        """
        self.log_operation("create_review")

        try:
            # Validate required fields
            self._validate_review_data(review_data)

            # Apply any pre-processing
            processed_data = self._preprocess_review_data(review_data)

            # Use database manager v4's create_review method
            review_id = self.db_manager.create_review(processed_data)

            if not review_id:
                raise Exception("Failed to create review")

            self.logger.info("Successfully created review", review_id=review_id)
            return review_id

        except ValidationError:
            raise
        except Exception as e:
            self.logger.exception("Error creating review", error=str(e))
            raise

    def update_review(self, review_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an existing review.

        Args:
            review_id: Review ID
            update_data: Data to update

        Returns:
            True if successful

        Raises:
            NotFoundError: If review doesn't exist
            ValidationError: If update data is invalid

        """
        if not review_id:
            raise ValidationError("Review ID is required")

        self.log_operation("update_review", review_id=review_id)

        try:
            # Validate update data
            self._validate_review_update_data(update_data)

            # Apply any pre-processing
            processed_data = self._preprocess_review_data(update_data)

            # Use database manager v4's update_review method
            success = self.db_manager.update_review(review_id, processed_data)

            if not success:
                raise NotFoundError(f"Review with ID {review_id} not found")

            self.logger.info("Successfully updated review", review_id=review_id)
            return True

        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.exception("Error updating review", error=str(e))
            raise

    def delete_review(self, review_id: str) -> bool:
        """Delete a review.

        Args:
            review_id: Review ID

        Returns:
            True if successful

        Raises:
            NotFoundError: If review doesn't exist

        """
        if not review_id:
            raise ValidationError("Review ID is required")

        self.log_operation("delete_review", review_id=review_id)

        try:
            # Use database manager v4's delete_review method
            success = self.db_manager.delete_review(review_id)

            if not success:
                raise NotFoundError(f"Review with ID {review_id} not found")

            self.logger.info("Successfully deleted review", review_id=review_id)
            return True

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.exception("Error deleting review", error=str(e))
            raise

    def get_review_statistics(self) -> Dict[str, Any]:
        """Get review statistics.

        Returns:
            Dictionary containing review statistics

        """
        self.log_operation("get_review_statistics")

        try:
            # Use database manager v4's get_review_statistics method
            stats = self.db_manager.get_review_statistics()

            self.logger.info("Successfully retrieved review statistics")
            return stats

        except Exception as e:
            self.logger.exception("Error retrieving review statistics", error=str(e))
            raise

    def get_reviews_by_restaurant(
        self,
        restaurant_id: int,
        status: str = "approved",
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get reviews for a specific restaurant.

        Args:
            restaurant_id: Restaurant ID
            status: Review status to filter by (default: "approved")
            limit: Maximum number of reviews to return
            offset: Number of reviews to skip

        Returns:
            List of review dictionaries

        """
        if not restaurant_id or not isinstance(restaurant_id, int) or restaurant_id <= 0:
            raise ValidationError("Invalid restaurant ID")

        self.log_operation("get_reviews_by_restaurant", restaurant_id=restaurant_id)

        try:
            # Use database manager v4's get_reviews method with restaurant filter
            reviews = self.db_manager.get_reviews(
                restaurant_id=restaurant_id,
                status=status,
                limit=limit,
                offset=offset,
            )

            self.logger.info(
                "Successfully retrieved reviews by restaurant",
                restaurant_id=restaurant_id,
                count=len(reviews),
                status=status,
            )
            return reviews

        except Exception as e:
            self.logger.exception("Error retrieving reviews by restaurant", error=str(e))
            raise

    def get_reviews_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get reviews by a specific user.

        Args:
            user_id: User ID
            limit: Maximum number of reviews to return
            offset: Number of reviews to skip

        Returns:
            List of review dictionaries

        """
        if not user_id:
            raise ValidationError("User ID is required")

        self.log_operation("get_reviews_by_user", user_id=user_id)

        try:
            # Use database manager v4's get_reviews method with user filter
            reviews = self.db_manager.get_reviews(
                limit=limit,
                offset=offset,
                filters={"user_id": user_id},
            )

            self.logger.info(
                "Successfully retrieved reviews by user",
                user_id=user_id,
                count=len(reviews),
            )
            return reviews

        except Exception as e:
            self.logger.exception("Error retrieving reviews by user", error=str(e))
            raise

    def update_review_status(
        self,
        review_id: str,
        status: str,
        moderator_notes: Optional[str] = None,
    ) -> bool:
        """Update review status and moderator notes.

        Args:
            review_id: Review ID
            status: New status
            moderator_notes: Optional moderator notes

        Returns:
            True if successful

        """
        if not review_id:
            raise ValidationError("Review ID is required")

        if not status:
            raise ValidationError("Status is required")

        self.log_operation("update_review_status", review_id=review_id, status=status)

        try:
            # Use database manager v4's update_review method
            update_data = {"status": status}
            if moderator_notes is not None:
                update_data["moderator_notes"] = moderator_notes

            success = self.db_manager.update_review(review_id, update_data)

            if not success:
                raise NotFoundError(f"Review with ID {review_id} not found")

            self.logger.info(
                "Successfully updated review status",
                review_id=review_id,
                status=status,
            )
            return True

        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.exception("Error updating review status", error=str(e))
            raise

    # Helper methods
    def _validate_review_data(self, data: Dict[str, Any]) -> None:
        """Validate review data."""
        required_fields = ["restaurant_id", "user_id", "user_name", "rating", "content"]
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")

        # Validate rating
        rating = data.get("rating")
        if rating is not None and (not isinstance(rating, int) or rating < 1 or rating > 5):
            raise ValidationError("Rating must be an integer between 1 and 5")

    def _validate_review_update_data(self, data: Dict[str, Any]) -> None:
        """Validate review update data."""
        # Validate rating if provided
        rating = data.get("rating")
        if rating is not None and (not isinstance(rating, int) or rating < 1 or rating > 5):
            raise ValidationError("Rating must be an integer between 1 and 5")

    def _preprocess_review_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess review data before saving."""
        # Add any preprocessing logic
        return data.copy()
