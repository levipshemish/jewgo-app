from datetime import datetime
from typing import Any, Dict, List, Optional
from services.base_service import BaseService
from services.google_places_service import GooglePlacesService
from utils.error_handler import ExternalServiceError

class GoogleReviewSyncService(BaseService):
    """Service for syncing Google reviews from Google Places API."""

    def __init__(self, db_manager=None, config=None):
        """Initialize the Google review sync service."""
        super().__init__(db_manager, config)
        self.google_places_service = GooglePlacesService(db_manager, config)

    def sync_restaurant_google_reviews(
        self,
        restaurant_id: int,
        place_id: str,
        max_reviews: int = 20
    ) -> bool:
        """Sync Google reviews for a specific restaurant.
        
        Args:
            restaurant_id: Restaurant ID in database
            place_id: Google Places place ID
            max_reviews: Maximum number of reviews to fetch
            
        Returns:
            True if successful, False otherwise
        """
        self.log_operation("sync_restaurant_google_reviews", restaurant_id=restaurant_id, place_id=place_id)
        
        try:
            # Fetch reviews from Google Places API
            self.logger.info(f"Fetching Google reviews for place_id={place_id}")
            google_reviews = self.google_places_service.fetch_google_reviews(place_id, max_reviews)
            
            if not google_reviews:
                self.logger.warning(f"No Google reviews found for place_id={place_id}")
                return False
            
            # Transform Google reviews to our format
            transformed_reviews = []
            keep_review_ids = []
            
            for review in google_reviews:
                # Extract Google review ID from author_name and time (simple approach)
                google_review_id = f"{review.get('author_name', 'unknown')}_{review.get('time', 'unknown')}"
                keep_review_ids.append(google_review_id)
                
                # Convert timestamp to datetime
                try:
                    review_time = datetime.strptime(review.get('time', ''), '%Y-%m-%d')
                except (ValueError, TypeError):
                    review_time = datetime.utcnow()
                
                transformed_review = {
                    'google_review_id': google_review_id,
                    'author_name': review.get('author_name', ''),
                    'author_url': None,  # Google doesn't provide this in basic API
                    'profile_photo_url': review.get('profile_photo_url'),
                    'rating': review.get('rating', 0),
                    'text': review.get('text', ''),
                    'time': review_time,
                    'relative_time_description': review.get('relative_time_description'),
                    'language': None  # Google doesn't provide this in basic API
                }
                transformed_reviews.append(transformed_review)
            
            # Upsert reviews to database
            success = self.db_manager.upsert_google_reviews(
                restaurant_id=restaurant_id,
                place_id=place_id,
                google_reviews=transformed_reviews
            )
            
            if success:
                # Delete old reviews that are no longer in Google's response
                self.db_manager.delete_old_google_reviews(
                    restaurant_id=restaurant_id,
                    place_id=place_id,
                    keep_review_ids=keep_review_ids
                )
                
                self.logger.info(
                    f"Successfully synced {len(transformed_reviews)} Google reviews for restaurant {restaurant_id}"
                )
                return True
            else:
                self.logger.error(f"Failed to upsert Google reviews for restaurant {restaurant_id}")
                return False
                
        except Exception as e:
            self.logger.exception(f"Error syncing Google reviews for restaurant {restaurant_id}", error=str(e))
            return False

    def sync_all_restaurants_google_reviews(self, max_reviews: int = 20) -> Dict[str, Any]:
        """Sync Google reviews for all restaurants that have place_id.
        
        Args:
            max_reviews: Maximum number of reviews to fetch per restaurant
            
        Returns:
            Dictionary with sync results
        """
        self.log_operation("sync_all_restaurants_google_reviews", max_reviews=max_reviews)
        
        results = {
            'total_restaurants': 0,
            'successful_syncs': 0,
            'failed_syncs': 0,
            'errors': []
        }
        
        try:
            # Get all restaurants with place_id
            restaurants = self.db_manager.get_restaurants(limit=1000)  # Adjust limit as needed
            
            for restaurant in restaurants:
                if not restaurant.get('place_id'):
                    continue
                
                results['total_restaurants'] += 1
                
                try:
                    success = self.sync_restaurant_google_reviews(
                        restaurant_id=restaurant['id'],
                        place_id=restaurant['place_id'],
                        max_reviews=max_reviews
                    )
                    
                    if success:
                        results['successful_syncs'] += 1
                    else:
                        results['failed_syncs'] += 1
                        results['errors'].append(f"Failed to sync restaurant {restaurant['id']}")
                        
                except Exception as e:
                    results['failed_syncs'] += 1
                    results['errors'].append(f"Error syncing restaurant {restaurant['id']}: {str(e)}")
            
            self.logger.info(
                f"Google review sync completed",
                total_restaurants=results['total_restaurants'],
                successful_syncs=results['successful_syncs'],
                failed_syncs=results['failed_syncs']
            )
            
            return results
            
        except Exception as e:
            self.logger.exception("Error in bulk Google review sync", error=str(e))
            results['errors'].append(f"Bulk sync error: {str(e)}")
            return results
