# !/usr/bin/env python3
"""Cloudinary Upload Utility.
=========================
Handles image uploads to Cloudinary for the JewGo app.
Uploads restaurant images and returns Cloudinary URLs.
Author: JewGo Development Team
Version: 1.0
"""
import base64
import os
import re
from datetime import datetime
from typing import Any
from utils.logging_config import get_logger

try:
    import cloudinary
    import cloudinary.api
    import cloudinary.uploader

    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False
logger = get_logger(__name__)
"""Cloudinary Upload Utility.
=========================
Handles image uploads to Cloudinary for the JewGo app.
Uploads restaurant images and returns Cloudinary URLs.
Author: JewGo Development Team
Version: 1.0
"""
try:
    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False


class CloudinaryUploader:
    """Handles image uploads to Cloudinary."""

    def __init__(self) -> None:
        if not CLOUDINARY_AVAILABLE:
            msg = "cloudinary package is required. Install with: pip install cloudinary"
            raise ImportError(
                msg,
            )
        # Get Cloudinary credentials from environment
        self.cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
        self.api_key = os.environ.get("CLOUDINARY_API_KEY")
        self.api_secret = os.environ.get("CLOUDINARY_API_SECRET")
        if not all([self.cloud_name, self.api_key, self.api_secret]):
            msg = (
                "Cloudinary credentials not found. Please set: "
                "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
            )
            raise ValueError(
                msg,
            )
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
        )
        logger.info("Cloudinary uploader initialized", cloud_name=self.cloud_name)

    def upload_image_bytes(
        self,
        image_bytes: bytes,
        public_id: str | None = None,
        folder: str = "jewgo/restaurants",
        transformation: dict[str, Any] | None = None,
    ) -> str | None:
        """Upload image bytes to Cloudinary.
        Args:
            image_bytes: Raw image bytes
            public_id: Custom public ID for the image (optional)
            folder: Cloudinary folder to upload to
            transformation: Cloudinary transformation options
        Returns:
            Cloudinary URL if successful, None otherwise
        """
        try:
            # Generate public_id if not provided
            if not public_id:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                public_id = f"{folder}/{timestamp}"
            else:
                public_id = f"{folder}/{public_id}"
            # Prepare upload options
            upload_options = {
                "public_id": public_id,
                "resource_type": "image",
                "overwrite": True,
                "invalidate": True,
            }
            # Add transformations if provided
            if transformation:
                upload_options.update(transformation)
            logger.info("Uploading image to Cloudinary", public_id=public_id)
            # Upload the image
            result = cloudinary.uploader.upload(
                image_bytes,
                **upload_options,
            )
            # Get the secure URL
            image_url = result.get("secure_url")
            if image_url:
                logger.info(
                    "Successfully uploaded image",
                    url=image_url,
                    public_id=public_id,
                )
                return image_url
            logger.error("Upload successful but no URL returned", result=result)
            return None
        except Exception as e:
            logger.exception(
                "Failed to upload image to Cloudinary",
                error=str(e),
                public_id=public_id,
            )
            return None

    def upload_restaurant_image(
        self,
        image_bytes: bytes,
        restaurant_name: str,
        restaurant_id: int | None = None,
        image_index: int = 1,
    ) -> str | None:
        """Upload a restaurant image with proper naming and transformations.
        Args:
            image_bytes: Raw image bytes
            restaurant_name: Name of the restaurant
            restaurant_id: Database ID of the restaurant (optional)
            image_index: Index of the image (1, 2, 3, 4, etc.)
        Returns:
            Cloudinary URL if successful, None otherwise
        """
        try:
            # Create a clean public_id from restaurant name
            clean_name = self._clean_restaurant_name(restaurant_name)
            # Create organized folder structure: jewgo/restaurants/restaurant_name/
            folder = f"jewgo/restaurants/{clean_name}"
            # Simple naming: just the image index
            public_id = f"image_{image_index}"
            # Apply restaurant-specific transformations
            transformation = {
                "width": 800,
                "height": 600,
                "crop": "fill",
                "quality": "auto",
            }
            return self.upload_image_bytes(
                image_bytes=image_bytes,
                public_id=public_id,
                folder=folder,
                transformation=transformation,
            )
        except Exception as e:
            logger.exception(
                "Failed to upload restaurant image",
                restaurant=restaurant_name,
                error=str(e),
            )
            return None

    def upload_restaurant_images(
        self,
        image_bytes_list: list[bytes],
        restaurant_name: str,
        restaurant_id: int | None = None,
    ) -> list[str]:
        """Upload multiple restaurant images with proper naming and transformations.
        Args:
            image_bytes_list: List of raw image bytes
            restaurant_name: Name of the restaurant
            restaurant_id: Database ID of the restaurant (optional)
        Returns:
            List of Cloudinary URLs (successful uploads only)
        """
        urls = []
        for i, image_bytes in enumerate(image_bytes_list, 1):
            url = self.upload_restaurant_image(
                image_bytes=image_bytes,
                restaurant_name=restaurant_name,
                restaurant_id=restaurant_id,
                image_index=i,
            )
            if url:
                urls.append(url)
        return urls

    def _clean_restaurant_name(self, name: str) -> str:
        """Clean restaurant name for use as Cloudinary public_id.
        Args:
            name: Restaurant name
        Returns:
            Cleaned name suitable for Cloudinary public_id
        """
        # Remove special characters and replace spaces with underscores
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", "", name)
        cleaned = re.sub(r"\s+", "_", cleaned.strip())
        cleaned = cleaned.lower()
        # Limit length
        if len(cleaned) > 50:
            cleaned = cleaned[:50]
        return cleaned

    def delete_image(self, public_id: str) -> bool:
        """Delete an image from Cloudinary.
        Args:
            public_id: Cloudinary public_id
        Returns:
            True if successful, False otherwise
        """
        try:
            result = cloudinary.uploader.destroy(public_id)
            success = result.get("result") == "ok"
            if success:
                logger.info("Successfully deleted image", public_id=public_id)
            else:
                logger.warning(
                    "Failed to delete image",
                    public_id=public_id,
                    result=result,
                )
            return success
        except Exception as e:
            logger.exception("Error deleting image", public_id=public_id, error=str(e))
            return False

    def get_image_info(self, public_id: str) -> dict | None:
        """Get information about an uploaded image.
        Args:
            public_id: Cloudinary public_id
        Returns:
            Image information dictionary if found, None otherwise
        """
        try:
            return cloudinary.api.resource(public_id)
        except Exception as e:
            logger.exception(
                "Error getting image info", public_id=public_id, error=str(e)
            )
            return None

    def delete_restaurant_images(self, restaurant_name: str) -> bool:
        """Delete all images for a specific restaurant.
        Args:
            restaurant_name: Name of the restaurant
        Returns:
            True if successful, False otherwise
        """
        try:
            clean_name = self._clean_restaurant_name(restaurant_name)
            folder = f"jewgo/restaurants/{clean_name}"
            logger.info(
                "Deleting all images for restaurant",
                restaurant=restaurant_name,
                folder=folder,
            )
            # Delete all images in the restaurant folder
            result = cloudinary.api.delete_resources_by_prefix(folder)
            if result.get("deleted"):
                deleted_count = len(result["deleted"])
                logger.info(
                    "Successfully deleted images",
                    deleted_count=deleted_count,
                    restaurant=restaurant_name,
                )
                return True
            logger.warning("No images found to delete", restaurant=restaurant_name)
            return True
        except Exception as e:
            logger.exception(
                "Error deleting restaurant images",
                restaurant=restaurant_name,
                error=str(e),
            )
            return False

    def list_restaurant_images(self, restaurant_name: str) -> list[dict]:
        """List all images for a specific restaurant.
        Args:
            restaurant_name: Name of the restaurant
        Returns:
            List of image information dictionaries
        """
        try:
            clean_name = self._clean_restaurant_name(restaurant_name)
            folder = f"jewgo/restaurants/{clean_name}"
            logger.info(
                "Listing images for restaurant",
                restaurant=restaurant_name,
                folder=folder,
            )
            # List all images in the restaurant folder
            result = cloudinary.api.resources(
                type="upload",
                prefix=folder,
                max_results=50,
            )
            if result.get("resources"):
                images = result["resources"]
                logger.info(
                    "Found images", count=len(images), restaurant=restaurant_name
                )
                return images
            logger.info("No images found", restaurant=restaurant_name)
            return []
        except Exception as e:
            logger.exception(
                "Error listing restaurant images",
                restaurant=restaurant_name,
                error=str(e),
            )
            return []


def main() -> None:
    """Test function for the Cloudinary uploader."""
    try:
        uploader = CloudinaryUploader()
        # Create a test image (1x1 pixel PNG)
        test_image_bytes = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        )
        # Test upload
        url = uploader.upload_restaurant_image(
            image_bytes=test_image_bytes,
            restaurant_name="Test Restaurant",
            restaurant_id=123,
        )
        if url:
            pass
        else:
            pass
    except Exception:
        pass


if __name__ == "__main__":
    main()
