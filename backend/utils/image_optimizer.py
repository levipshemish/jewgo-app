import os
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import magic
from PIL import Image, ImageOps
from utils.error_handler import handle_file_operation, handle_operation_with_fallback
from utils.logging_config import get_logger

"""Image Optimization Utility for JewGo Backend
Uses Pillow for image processing and optimization.
"""

logger = get_logger(__name__)


class ImageOptimizer:
    """Image optimization utility using Pillow."""

    SUPPORTED_FORMATS = {
        "JPEG": [".jpg", ".jpeg"],
        "PNG": [".png"],
        "WEBP": [".webp"],
        "AVIF": [".avif"],
    }

    DEFAULT_QUALITY = 85
    DEFAULT_MAX_SIZE = (1920, 1080)  # Max dimensions

    def __init__(
        self,
        quality: int = DEFAULT_QUALITY,
        max_size: tuple[int, int] = DEFAULT_MAX_SIZE,
    ) -> None:
        """Initialize the image optimizer.

        Args:
            quality: JPEG/WebP quality (1-100)
            max_size: Maximum dimensions (width, height)

        """
        self.quality = max(1, min(100, quality))
        self.max_size = max_size

    @handle_operation_with_fallback(fallback_value=False)
    def is_image_file(self, file_path: str | Path) -> bool:
        """Check if a file is an image based on its MIME type.

        Args:
            file_path: Path to the file

        Returns:
            True if the file is an image

        """
        mime_type = magic.from_file(str(file_path), mime=True)
        return mime_type.startswith("image/")

    def _is_image_by_extension(self, file_path: str | Path) -> bool:
        """Fallback method to check if file is image by extension."""
        file_path = Path(file_path)
        extension = file_path.suffix.lower()
        return any(extension in formats for formats in self.SUPPORTED_FORMATS.values())

    @handle_operation_with_fallback(fallback_value={})
    def get_image_info(self, image_path: str | Path) -> dict:
        """Get information about an image.

        Args:
            image_path: Path to the image

        Returns:
            Dictionary with image information

        """
        with Image.open(image_path) as img:
            return {
                "format": img.format,
                "mode": img.mode,
                "size": img.size,
                "width": img.width,
                "height": img.height,
                "file_size": os.path.getsize(image_path),
                "path": str(image_path),
            }

    def optimize_image(
        self,
        input_path: str | Path,
        output_path: str | Path | None = None,
        format: str = "WEBP",
        quality: int | None = None,
        max_size: tuple[int, int] | None = None,
        strip_metadata: bool = True,
    ) -> dict:
        """Optimize an image.

        Args:
            input_path: Path to input image
            output_path: Path for optimized image (optional)
            format: Output format (JPEG, PNG, WEBP, AVIF)
            quality: Quality setting (1-100)
            max_size: Maximum dimensions
            strip_metadata: Whether to remove metadata

        Returns:
            Dictionary with optimization results

        """
        input_path = Path(input_path)

        if not self.is_image_file(input_path):
            msg = f"File {input_path} is not a supported image format"
            raise ValueError(msg)

        if output_path is None:
            output_path = (
                input_path.parent / f"{input_path.stem}_optimized.{format.lower()}"
            )

        output_path = Path(output_path)

        # Use instance defaults if not specified
        quality = quality or self.quality
        max_size = max_size or self.max_size

        try:
            original_size = os.path.getsize(input_path)

            with Image.open(input_path) as img:
                # Convert to RGB if necessary (for JPEG/WebP)
                if format in ["JPEG", "WEBP"] and img.mode in ["RGBA", "LA", "P"]:
                    # Create white background for transparent images
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    background.paste(
                        img,
                        mask=img.split()[-1] if img.mode == "RGBA" else None,
                    )
                    img = background
                elif format in ["JPEG", "WEBP"] and img.mode != "RGB":
                    img = img.convert("RGB")

                # Resize if necessary
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img = ImageOps.contain(
                        img,
                        max_size,
                        method=Image.Resampling.LANCZOS,
                    )

                # Prepare save parameters
                save_kwargs = {}

                if format == "JPEG":
                    save_kwargs["quality"] = quality
                    save_kwargs["optimize"] = True
                    save_kwargs["progressive"] = True
                elif format == "WEBP":
                    save_kwargs["quality"] = quality
                    save_kwargs["method"] = 6  # Best compression
                elif format == "PNG":
                    save_kwargs["optimize"] = True
                    save_kwargs["compress_level"] = 9
                elif format == "AVIF":
                    save_kwargs["quality"] = quality
                    save_kwargs["speed"] = 6  # Slower but better compression

                # Save optimized image
                img.save(output_path, format=format, **save_kwargs)

                optimized_size = os.path.getsize(output_path)
                savings = original_size - optimized_size
                savings_percent = (
                    (savings / original_size * 100) if original_size > 0 else 0
                )

                result = {
                    "success": True,
                    "input_path": str(input_path),
                    "output_path": str(output_path),
                    "original_size": original_size,
                    "optimized_size": optimized_size,
                    "savings_bytes": savings,
                    "savings_percent": round(savings_percent, 2),
                    "format": format,
                    "quality": quality,
                    "final_size": img.size,
                }

                logger.info(
                    "Optimized image",
                    filename=input_path.name,
                    original_size=original_size,
                    optimized_size=optimized_size,
                    savings_percent=f"{savings_percent:.1f}%",
                )
                return result

        except Exception as e:
            logger.exception(
                "Error optimizing image", input_path=str(input_path), error=str(e)
            )
            return {
                "success": False,
                "error": str(e),
                "input_path": str(input_path),
            }

    def optimize_directory(
        self,
        input_dir: str | Path,
        output_dir: str | Path | None = None,
        format: str = "WEBP",
        recursive: bool = True,
    ) -> dict:
        """Optimize all images in a directory.

        Args:
            input_dir: Input directory path
            output_dir: Output directory path (optional)
            format: Output format
            recursive: Whether to process subdirectories

        Returns:
            Dictionary with optimization results

        """
        input_dir = Path(input_dir)
        output_dir = Path(output_dir) if output_dir else input_dir / "optimized"

        if not input_dir.exists():
            msg = f"Input directory {input_dir} does not exist"
            raise ValueError(msg)

        output_dir.mkdir(parents=True, exist_ok=True)

        results = {
            "total_files": 0,
            "processed_files": 0,
            "successful_optimizations": 0,
            "total_original_size": 0,
            "total_optimized_size": 0,
            "total_savings": 0,
            "errors": [],
            "files": [],
        }

        # Find all image files
        image_extensions = []
        for extensions in self.SUPPORTED_FORMATS.values():
            image_extensions.extend(extensions)

        pattern = "**/*" if recursive else "*"
        image_files = []

        for ext in image_extensions:
            image_files.extend(input_dir.glob(pattern + ext))
            image_files.extend(input_dir.glob(pattern + ext.upper()))

        results["total_files"] = len(image_files)

        for image_file in image_files:
            try:
                # Create relative output path
                relative_path = image_file.relative_to(input_dir)
                output_file = output_dir / relative_path.with_suffix(
                    f".{format.lower()}",
                )
                output_file.parent.mkdir(parents=True, exist_ok=True)

                result = self.optimize_image(
                    image_file,
                    output_file,
                    format=format,
                )

                results["processed_files"] += 1

                if result["success"]:
                    results["successful_optimizations"] += 1
                    results["total_original_size"] += result["original_size"]
                    results["total_optimized_size"] += result["optimized_size"]
                    results["total_savings"] += result["savings_bytes"]
                    results["files"].append(result)
                else:
                    results["errors"].append(result)

            except Exception as e:
                logger.exception(
                    "Error processing image file",
                    image_file=str(image_file),
                    error=str(e),
                )
                results["errors"].append(
                    {
                        "input_path": str(image_file),
                        "error": str(e),
                    },
                )

        # Calculate overall savings percentage
        if results["total_original_size"] > 0:
            results["total_savings_percent"] = round(
                (results["total_savings"] / results["total_original_size"]) * 100,
                2,
            )
        else:
            results["total_savings_percent"] = 0

        logger.info(
            "Directory optimization complete",
            successful_optimizations=results["successful_optimizations"],
            total_files=results["total_files"],
        )
        return results

    def create_thumbnail(
        self,
        input_path: str | Path,
        output_path: str | Path | None = None,
        size: tuple[int, int] = (300, 300),
        format: str = "JPEG",
        quality: int = 80,
    ) -> dict:
        """Create a thumbnail from an image.

        Args:
            input_path: Path to input image
            output_path: Path for thumbnail (optional)
            size: Thumbnail size (width, height)
            format: Output format
            quality: Quality setting

        Returns:
            Dictionary with thumbnail creation results

        """
        input_path = Path(input_path)

        if output_path is None:
            output_path = (
                input_path.parent / f"{input_path.stem}_thumb.{format.lower()}"
            )

        output_path = Path(output_path)

        try:
            with Image.open(input_path) as img:
                # Convert to RGB if necessary
                if format == "JPEG" and img.mode != "RGB":
                    img = img.convert("RGB")

                # Create thumbnail
                img.thumbnail(size, Image.Resampling.LANCZOS)

                # Save thumbnail
                save_kwargs = {"quality": quality} if format == "JPEG" else {}
                img.save(output_path, format=format, **save_kwargs)

                return {
                    "success": True,
                    "input_path": str(input_path),
                    "output_path": str(output_path),
                    "size": img.size,
                    "format": format,
                }

        except Exception as e:
            logger.exception(
                "Error creating thumbnail", input_path=str(input_path), error=str(e)
            )
            return {
                "success": False,
                "error": str(e),
                "input_path": str(input_path),
            }


def optimize_single_image(
    input_path: str | Path,
    output_path: str | Path | None = None,
    quality: int = 85,
    format: str = "WEBP",
) -> dict:
    """Convenience function to optimize a single image.

    Args:
        input_path: Path to input image
        output_path: Path for optimized image (optional)
        quality: Quality setting (1-100)
        format: Output format

    Returns:
        Dictionary with optimization results

    """
    optimizer = ImageOptimizer(quality=quality)
    return optimizer.optimize_image(input_path, output_path, format=format)


def optimize_directory_images(
    input_dir: str | Path,
    output_dir: str | Path | None = None,
    format: str = "WEBP",
    recursive: bool = True,
) -> dict:
    """Convenience function to optimize all images in a directory.

    Args:
        input_dir: Input directory path
        output_dir: Output directory path (optional)
        format: Output format
        recursive: Whether to process subdirectories

    Returns:
        Dictionary with optimization results

    """
    optimizer = ImageOptimizer()
    return optimizer.optimize_directory(input_dir, output_dir, format, recursive)
