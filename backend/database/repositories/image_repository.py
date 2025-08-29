from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_
from utils.logging_config import get_logger

from ..base_repository import BaseRepository
from ..connection_manager import DatabaseConnectionManager
from ..models import RestaurantImage

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Image repository for database operations.

This module handles all image-related database operations,
separating data access logic from business logic.
"""


class ImageRepository(BaseRepository[RestaurantImage]):
    """Repository for restaurant image database operations."""

    def __init__(self, connection_manager: DatabaseConnectionManager):
        """Initialize image repository."""
        super().__init__(connection_manager, RestaurantImage)
        self.logger = logger.bind(repository="ImageRepository")

    def get_restaurant_images(
        self,
        restaurant_id: int,
        limit: Optional[int] = None,
    ) -> List[RestaurantImage]:
        """Get all images for a specific restaurant."""
        try:
            session = self.connection_manager.get_session()
            query = (
                session.query(RestaurantImage)
                .filter(RestaurantImage.restaurant_id == restaurant_id)
                .order_by(RestaurantImage.image_order.asc())
            )

            if limit:
                query = query.limit(limit)

            images = query.all()
            session.close()
            return images

        except Exception as e:
            self.logger.exception("Error getting restaurant images", error=str(e))
            return []

    def get_restaurant_images_count(self, restaurant_id: int) -> int:
        """Get count of images for a specific restaurant."""
        try:
            session = self.connection_manager.get_session()
            count = (
                session.query(RestaurantImage)
                .filter(RestaurantImage.restaurant_id == restaurant_id)
                .count()
            )
            session.close()
            return count

        except Exception as e:
            self.logger.exception("Error getting restaurant images count", error=str(e))
            return 0

    def add_restaurant_image(
        self,
        restaurant_id: int,
        image_url: str,
        image_order: Optional[int] = None,
        cloudinary_public_id: Optional[str] = None,
    ) -> Optional[RestaurantImage]:
        """Add a new image to a restaurant."""
        try:
            # If no order specified, get the next available order
            if image_order is None:
                image_order = self._get_next_image_order(restaurant_id)

            image_data = {
                "restaurant_id": restaurant_id,
                "image_url": image_url,
                "image_order": image_order,
                "cloudinary_public_id": cloudinary_public_id,
            }

            instance = self.create(image_data)
            if instance:
                self.logger.info(
                    "Added restaurant image",
                    restaurant_id=restaurant_id,
                    image_id=instance.id,
                    image_order=image_order,
                )
            return instance

        except Exception as e:
            self.logger.exception("Error adding restaurant image", error=str(e))
            return None

    def update_image_order(
        self,
        image_id: int,
        new_order: int,
    ) -> bool:
        """Update the order of an image."""
        try:
            update_data = {
                "image_order": new_order,
                "updated_at": datetime.utcnow(),
            }

            success = self.update(image_id, update_data)
            if success:
                self.logger.info(
                    "Updated image order", image_id=image_id, new_order=new_order
                )
            return success

        except Exception as e:
            self.logger.exception("Error updating image order", error=str(e))
            return False

    def update_image_url(
        self,
        image_id: int,
        new_url: str,
    ) -> bool:
        """Update the URL of an image."""
        try:
            update_data = {
                "image_url": new_url,
                "updated_at": datetime.utcnow(),
            }

            success = self.update(image_id, update_data)
            if success:
                self.logger.info(
                    "Updated image URL", image_id=image_id, new_url=new_url
                )
            return success

        except Exception as e:
            self.logger.exception("Error updating image URL", error=str(e))
            return False

    def update_cloudinary_public_id(
        self,
        image_id: int,
        cloudinary_public_id: str,
    ) -> bool:
        """Update the Cloudinary public ID of an image."""
        try:
            update_data = {
                "cloudinary_public_id": cloudinary_public_id,
                "updated_at": datetime.utcnow(),
            }

            success = self.update(image_id, update_data)
            if success:
                self.logger.info(
                    "Updated Cloudinary public ID",
                    image_id=image_id,
                    cloudinary_id=cloudinary_public_id,
                )
            return success

        except Exception as e:
            self.logger.exception("Error updating Cloudinary public ID", error=str(e))
            return False

    def delete_restaurant_image(self, image_id: int) -> bool:
        """Delete a specific restaurant image."""
        try:
            success = self.delete(image_id)
            if success:
                self.logger.info("Deleted restaurant image", image_id=image_id)
            return success

        except Exception as e:
            self.logger.exception("Error deleting restaurant image", error=str(e))
            return False

    def delete_all_restaurant_images(self, restaurant_id: int) -> bool:
        """Delete all images for a specific restaurant."""
        try:
            session = self.connection_manager.get_session()
            deleted_count = (
                session.query(RestaurantImage)
                .filter(RestaurantImage.restaurant_id == restaurant_id)
                .delete()
            )
            session.commit()
            session.close()

            self.logger.info(
                "Deleted all restaurant images",
                restaurant_id=restaurant_id,
                count=deleted_count,
            )
            return True

        except Exception as e:
            self.logger.exception("Error deleting all restaurant images", error=str(e))
            return False

    def reorder_restaurant_images(
        self,
        restaurant_id: int,
        image_orders: Dict[int, int],
    ) -> bool:
        """Reorder images for a restaurant using a mapping of image_id to new_order."""
        try:
            with self.connection_manager.session_scope() as session:
                for image_id, new_order in image_orders.items():
                    image = (
                        session.query(RestaurantImage)
                        .filter(
                            and_(
                                RestaurantImage.id == image_id,
                                RestaurantImage.restaurant_id == restaurant_id,
                            )
                        )
                        .first()
                    )

                    if image:
                        image.image_order = new_order
                        image.updated_at = datetime.utcnow()

                self.logger.info(
                    "Reordered restaurant images",
                    restaurant_id=restaurant_id,
                    orders=len(image_orders),
                )
                return True

        except Exception as e:
            self.logger.exception("Error reordering restaurant images", error=str(e))
            return False

    def get_images_without_cloudinary_id(
        self, limit: int = 50
    ) -> List[RestaurantImage]:
        """Get images that don't have a Cloudinary public ID."""
        try:
            session = self.connection_manager.get_session()
            images = (
                session.query(RestaurantImage)
                .filter(
                    or_(
                        RestaurantImage.cloudinary_public_id.is_(None),
                        RestaurantImage.cloudinary_public_id == "",
                    )
                )
                .order_by(RestaurantImage.created_at.asc())
                .limit(limit)
                .all()
            )
            session.close()
            return images

        except Exception as e:
            self.logger.exception(
                "Error getting images without Cloudinary ID", error=str(e)
            )
            return []

    def get_images_by_cloudinary_id(
        self, cloudinary_public_id: str
    ) -> List[RestaurantImage]:
        """Get images by Cloudinary public ID."""
        try:
            session = self.connection_manager.get_session()
            images = (
                session.query(RestaurantImage)
                .filter(RestaurantImage.cloudinary_public_id == cloudinary_public_id)
                .order_by(RestaurantImage.created_at.desc())
                .all()
            )
            session.close()
            return images

        except Exception as e:
            self.logger.exception("Error getting images by Cloudinary ID", error=str(e))
            return []

    def get_image_statistics(self) -> Dict[str, Any]:
        """Get image statistics."""
        try:
            session = self.connection_manager.get_session()

            # Total images
            total_images = session.query(RestaurantImage).count()

            # Images with Cloudinary IDs
            images_with_cloudinary = (
                session.query(RestaurantImage)
                .filter(RestaurantImage.cloudinary_public_id.isnot(None))
                .count()
            )

            # Images without Cloudinary IDs
            images_without_cloudinary = total_images - images_with_cloudinary

            # Restaurants with images
            restaurants_with_images = (
                session.query(RestaurantImage.restaurant_id).distinct().count()
            )

            # Average images per restaurant
            avg_images_per_restaurant = (
                total_images / restaurants_with_images
                if restaurants_with_images > 0
                else 0
            )

            session.close()

            return {
                "total_images": total_images,
                "images_with_cloudinary_id": images_with_cloudinary,
                "images_without_cloudinary_id": images_without_cloudinary,
                "restaurants_with_images": restaurants_with_images,
                "average_images_per_restaurant": round(avg_images_per_restaurant, 2),
            }

        except Exception as e:
            self.logger.exception("Error getting image statistics", error=str(e))
            return {}

    def _get_next_image_order(self, restaurant_id: int) -> int:
        """Get the next available image order for a restaurant."""
        try:
            session = self.connection_manager.get_session()
            max_order = (
                session.query(func.max(RestaurantImage.image_order))
                .filter(RestaurantImage.restaurant_id == restaurant_id)
                .scalar()
            )
            session.close()

            return (max_order or 0) + 1

        except Exception as e:
            self.logger.exception("Error getting next image order", error=str(e))
            return 1

    def bulk_update_cloudinary_ids(
        self,
        updates: Dict[int, str],
    ) -> bool:
        """Bulk update Cloudinary public IDs for multiple images."""
        try:
            with self.connection_manager.session_scope() as session:
                for image_id, cloudinary_id in updates.items():
                    image = (
                        session.query(RestaurantImage)
                        .filter(RestaurantImage.id == image_id)
                        .first()
                    )
                    if image:
                        image.cloudinary_public_id = cloudinary_id
                        image.updated_at = datetime.utcnow()

                self.logger.info("Bulk updated Cloudinary IDs", count=len(updates))
                return True

        except Exception as e:
            self.logger.exception("Error bulk updating Cloudinary IDs", error=str(e))
            return False
