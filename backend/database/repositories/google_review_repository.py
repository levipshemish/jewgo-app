from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import and_
from utils.logging_config import get_logger
from ..base_repository import BaseRepository
from ..connection_manager import DatabaseConnectionManager
from ..models import GoogleReview

logger = get_logger(__name__)

class GoogleReviewRepository(BaseRepository[GoogleReview]):
    """Repository for Google review database operations."""

    def __init__(self, connection_manager: DatabaseConnectionManager):
        """Initialize Google review repository."""
        super().__init__(connection_manager, GoogleReview)
        self.logger = logger.bind(repository="GoogleReviewRepository")

    def get_google_reviews(
        self,
        restaurant_id: Optional[int] = None,
        place_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[GoogleReview]:
        """Get Google reviews with optional filtering and pagination."""
        self.logger.info(f"GoogleReviewRepository: Getting Google reviews for restaurant_id={restaurant_id}, place_id={place_id}")
        try:
            with self.connection_manager.session_scope() as session:
                query = session.query(GoogleReview)
                
                if restaurant_id:
                    query = query.filter(GoogleReview.restaurant_id == restaurant_id)
                if place_id:
                    query = query.filter(GoogleReview.place_id == place_id)
                
                # Add ordering for consistent results (most recent first)
                query = query.order_by(GoogleReview.time.desc())
                reviews = query.limit(limit).offset(offset).all()
                
                self.logger.info(f"GoogleReviewRepository: Found {len(reviews)} Google reviews in database")
                return reviews
        except Exception as e:
            self.logger.exception("Error fetching Google reviews", error=str(e))
            return []

    def get_google_reviews_count(
        self,
        restaurant_id: Optional[int] = None,
        place_id: Optional[str] = None,
    ) -> int:
        """Get the total count of Google reviews with optional filtering."""
        try:
            with self.connection_manager.session_scope() as session:
                query = session.query(GoogleReview)
                
                if restaurant_id:
                    query = query.filter(GoogleReview.restaurant_id == restaurant_id)
                if place_id:
                    query = query.filter(GoogleReview.place_id == place_id)
                
                count = query.count()
                return count
        except Exception as e:
            self.logger.exception("Error getting Google reviews count", error=str(e))
            return 0

    def upsert_google_reviews(
        self,
        restaurant_id: int,
        place_id: str,
        google_reviews: List[Dict[str, Any]]
    ) -> bool:
        """Upsert Google reviews for a restaurant.
        This will update existing reviews and add new ones.
        """
        try:
            with self.connection_manager.session_scope() as session:
                for review_data in google_reviews:
                    google_review_id = review_data.get('google_review_id')
                    if not google_review_id:
                        continue
                    
                    # Check if review already exists
                    existing_review = session.query(GoogleReview).filter(
                        and_(
                            GoogleReview.restaurant_id == restaurant_id,
                            GoogleReview.google_review_id == google_review_id
                        )
                    ).first()
                    
                    if existing_review:
                        # Update existing review
                        existing_review.author_name = review_data.get('author_name', '')
                        existing_review.author_url = review_data.get('author_url')
                        existing_review.profile_photo_url = review_data.get('profile_photo_url')
                        existing_review.rating = review_data.get('rating', 0)
                        existing_review.text = review_data.get('text')
                        existing_review.time = review_data.get('time')
                        existing_review.relative_time_description = review_data.get('relative_time_description')
                        existing_review.language = review_data.get('language')
                        existing_review.updated_at = datetime.utcnow()
                    else:
                        # Create new review
                        new_review = GoogleReview(
                            id=f"google_rev_{restaurant_id}_{google_review_id}",
                            restaurant_id=restaurant_id,
                            place_id=place_id,
                            google_review_id=google_review_id,
                            author_name=review_data.get('author_name', ''),
                            author_url=review_data.get('author_url'),
                            profile_photo_url=review_data.get('profile_photo_url'),
                            rating=review_data.get('rating', 0),
                            text=review_data.get('text'),
                            time=review_data.get('time'),
                            relative_time_description=review_data.get('relative_time_description'),
                            language=review_data.get('language')
                        )
                        session.add(new_review)
                
                self.logger.info(f"Successfully upserted {len(google_reviews)} Google reviews for restaurant {restaurant_id}")
                return True
        except Exception as e:
            self.logger.exception("Error upserting Google reviews", error=str(e))
            return False

    def delete_old_google_reviews(
        self,
        restaurant_id: int,
        place_id: str,
        keep_review_ids: List[str]
    ) -> bool:
        """Delete Google reviews that are no longer in the Google Places API response."""
        try:
            with self.connection_manager.session_scope() as session:
                # Delete reviews that are not in the keep_review_ids list
                deleted_count = session.query(GoogleReview).filter(
                    and_(
                        GoogleReview.restaurant_id == restaurant_id,
                        GoogleReview.place_id == place_id,
                        ~GoogleReview.google_review_id.in_(keep_review_ids)
                    )
                ).delete()
                
                if deleted_count > 0:
                    self.logger.info(f"Deleted {deleted_count} old Google reviews for restaurant {restaurant_id}")
                
                return True
        except Exception as e:
            self.logger.exception("Error deleting old Google reviews", error=str(e))
            return False
