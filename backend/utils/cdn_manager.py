#!/usr/bin/env python3
"""
CDN Manager for JewGo
====================
This module provides CDN integration for:
- Static asset optimization
- Image resizing and optimization
- Cache invalidation
- Performance monitoring
"""

import os
import hashlib
import requests
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
import logging
from utils.logging_config import get_logger

logger = get_logger(__name__)


class CDNManager:
    """CDN manager for static assets and image optimization."""
    
    def __init__(self, cdn_provider: str = 'cloudflare', config: Dict = None):
        """Initialize CDN manager."""
        self.cdn_provider = cdn_provider.lower()
        self.config = config or {}
        
        # CDN configuration
        self.cdn_config = {
            'cloudflare': {
                'api_url': 'https://api.cloudflare.com/client/v4',
                'zone_id': os.getenv('CLOUDFLARE_ZONE_ID'),
                'api_token': os.getenv('CLOUDFLARE_API_TOKEN'),
                'cdn_url': os.getenv('CLOUDFLARE_CDN_URL', 'https://cdn.jewgo.app')
            },
            'aws_cloudfront': {
                'distribution_id': os.getenv('CLOUDFLARE_DISTRIBUTION_ID'),
                'access_key': os.getenv('AWS_ACCESS_KEY_ID'),
                'secret_key': os.getenv('AWS_SECRET_ACCESS_KEY'),
                'region': os.getenv('AWS_REGION', 'us-east-1'),
                'cdn_url': os.getenv('CLOUDFLARE_CDN_URL', 'https://d1234567890.cloudfront.net')
            }
        }
        
        self.current_config = self.cdn_config.get(self.cdn_provider, {})
        self.cdn_url = self.current_config.get('cdn_url', '')
        
        # Cache settings
        self.cache_settings = {
            'images': {'ttl': 31536000, 'headers': {'Cache-Control': 'public, max-age=31536000'}},  # 1 year
            'css': {'ttl': 86400, 'headers': {'Cache-Control': 'public, max-age=86400'}},           # 1 day
            'js': {'ttl': 86400, 'headers': {'Cache-Control': 'public, max-age=86400'}},            # 1 day
            'fonts': {'ttl': 31536000, 'headers': {'Cache-Control': 'public, max-age=31536000'}},   # 1 year
            'api': {'ttl': 300, 'headers': {'Cache-Control': 'public, max-age=300'}}                # 5 minutes
        }
    
    def get_cdn_url(self, path: str, optimize: bool = True) -> str:
        """Get CDN URL for a given path."""
        if not self.cdn_url:
            return path
        
        # Remove leading slash if present
        path = path.lstrip('/')
        
        # Add optimization parameters for images
        if optimize and self._is_image(path):
            path = self._add_image_optimization(path)
        
        return urljoin(self.cdn_url, path)
    
    def _is_image(self, path: str) -> bool:
        """Check if path is an image file."""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'}
        return any(path.lower().endswith(ext) for ext in image_extensions)
    
    def _add_image_optimization(self, path: str) -> str:
        """Add image optimization parameters to URL."""
        if self.cdn_provider == 'cloudflare':
            # Cloudflare Image Resizing
            # Format: /cdn-cgi/image/width=W,height=H,format=F,quality=Q/path
            return f"/cdn-cgi/image/format=auto,quality=85/{path}"
        elif self.cdn_provider == 'aws_cloudfront':
            # AWS CloudFront with Lambda@Edge for image optimization
            # This would require Lambda@Edge function
            return path
        
        return path
    
    def optimize_image_url(
        self, 
        path: str, 
        width: int = None, 
        height: int = None, 
        quality: int = 85,
        format: str = 'auto'
    ) -> str:
        """Get optimized image URL with specific parameters."""
        if not self.cdn_url:
            return path
        
        path = path.lstrip('/')
        
        if self.cdn_provider == 'cloudflare':
            # Build Cloudflare Image Resizing URL
            params = []
            if width:
                params.append(f"width={width}")
            if height:
                params.append(f"height={height}")
            if quality:
                params.append(f"quality={quality}")
            if format:
                params.append(f"format={format}")
            
            if params:
                param_string = ",".join(params)
                return f"{self.cdn_url}/cdn-cgi/image/{param_string}/{path}"
        
        return urljoin(self.cdn_url, path)
    
    def invalidate_cache(self, paths: List[str]) -> bool:
        """Invalidate CDN cache for specific paths."""
        try:
            if self.cdn_provider == 'cloudflare':
                return self._invalidate_cloudflare_cache(paths)
            elif self.cdn_provider == 'aws_cloudfront':
                return self._invalidate_cloudfront_cache(paths)
            else:
                logger.warning(f"Cache invalidation not supported for {self.cdn_provider}")
                return False
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return False
    
    def _invalidate_cloudflare_cache(self, paths: List[str]) -> bool:
        """Invalidate Cloudflare cache."""
        api_url = self.current_config.get('api_url')
        zone_id = self.current_config.get('zone_id')
        api_token = self.current_config.get('api_token')
        
        if not all([api_url, zone_id, api_token]):
            logger.error("Cloudflare configuration incomplete")
            return False
        
        headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }
        
        # Prepare files for invalidation
        files = []
        for path in paths:
            # Ensure path starts with /
            if not path.startswith('/'):
                path = '/' + path
            files.append(path)
        
        payload = {
            'files': files
        }
        
        try:
            response = requests.post(
                f"{api_url}/zones/{zone_id}/purge_cache",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    logger.info(f"Successfully invalidated {len(files)} files from Cloudflare cache")
                    return True
                else:
                    logger.error(f"Cloudflare cache invalidation failed: {result.get('errors')}")
                    return False
            else:
                logger.error(f"Cloudflare API error: {response.status_code} - {response.text}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"Request to Cloudflare API failed: {e}")
            return False
    
    def _invalidate_cloudfront_cache(self, paths: List[str]) -> bool:
        """Invalidate CloudFront cache."""
        # This would require boto3 and AWS credentials
        # For now, just log the action
        logger.info(f"CloudFront cache invalidation requested for {len(paths)} paths")
        return True
    
    def get_cache_headers(self, file_type: str) -> Dict[str, str]:
        """Get appropriate cache headers for file type."""
        return self.cache_settings.get(file_type, self.cache_settings['api'])
    
    def generate_asset_url(
        self, 
        filename: str, 
        version: str = None, 
        file_type: str = 'api'
    ) -> str:
        """Generate versioned asset URL for cache busting."""
        if version:
            # Add version to filename
            name, ext = os.path.splitext(filename)
            versioned_filename = f"{name}.{version}{ext}"
        else:
            # Generate version from file hash (if file exists)
            versioned_filename = filename
        
        return self.get_cdn_url(versioned_filename)
    
    def preload_critical_assets(self, assets: List[str]) -> bool:
        """Preload critical assets to CDN cache."""
        try:
            for asset in assets:
                url = self.get_cdn_url(asset)
                try:
                    response = requests.head(url, timeout=10)
                    if response.status_code == 200:
                        logger.debug(f"Preloaded asset: {asset}")
                    else:
                        logger.warning(f"Failed to preload asset {asset}: {response.status_code}")
                except requests.RequestException as e:
                    logger.warning(f"Error preloading asset {asset}: {e}")
            
            logger.info(f"Preloaded {len(assets)} critical assets")
            return True
        except Exception as e:
            logger.error(f"Asset preloading failed: {e}")
            return False
    
    def get_performance_metrics(self) -> Dict[str, any]:
        """Get CDN performance metrics."""
        # This would integrate with CDN provider APIs to get real metrics
        return {
            'cdn_provider': self.cdn_provider,
            'cdn_url': self.cdn_url,
            'cache_settings': self.cache_settings,
            'status': 'active' if self.cdn_url else 'inactive'
        }
    
    def health_check(self) -> Dict[str, any]:
        """Perform CDN health check."""
        try:
            if not self.cdn_url:
                return {
                    'status': 'inactive',
                    'message': 'CDN not configured'
                }
            
            # Test CDN connectivity
            test_url = urljoin(self.cdn_url, '/health')
            response = requests.get(test_url, timeout=10)
            
            return {
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'response_time_ms': response.elapsed.total_seconds() * 1000,
                'status_code': response.status_code,
                'cdn_url': self.cdn_url
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'cdn_url': self.cdn_url
            }


# Global CDN manager instance
cdn_manager = CDNManager()


def get_cdn_url(path: str, **kwargs) -> str:
    """Convenience function to get CDN URL."""
    return cdn_manager.get_cdn_url(path, **kwargs)


def optimize_image(path: str, **kwargs) -> str:
    """Convenience function to get optimized image URL."""
    return cdn_manager.optimize_image_url(path, **kwargs)


def invalidate_cdn_cache(paths: List[str]) -> bool:
    """Convenience function to invalidate CDN cache."""
    return cdn_manager.invalidate_cache(paths)
