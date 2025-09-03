#!/usr/bin/env python3
"""Geocoding utilities for JewGo application.
========================================

This module provides geocoding functionality using Google Geocoding API
to convert addresses to latitude/longitude coordinates.

Author: JewGo Development Team
Version: 1.0
"""

import os
import time
import requests
from typing import Optional, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)

class GeocodingService:
    """Service for geocoding addresses using Google Geocoding API."""
    
    def __init__(self, api_key: str = None):
        """Initialize the geocoding service."""
        self.api_key = api_key or os.getenv('GOOGLE_PLACES_API_KEY')
        self.geocoding_url = "https://maps.googleapis.com/maps/api/geocode/json"
        
        if not self.api_key:
            logger.warning("No Google API key provided for geocoding service")
    
    def geocode_address(self, address: str, city: str, state: str, zip_code: str = None, country: str = 'USA') -> Optional[Tuple[float, float]]:
        """Geocode an address to get latitude and longitude coordinates.
        
        Args:
            address: Street address
            city: City name
            state: State/province
            zip_code: ZIP/postal code (optional)
            country: Country name (default: USA)
            
        Returns:
            Tuple of (latitude, longitude) or None if geocoding fails
        """
        if not self.api_key:
            logger.warning("Cannot geocode address - no API key available")
            return None
            
        try:
            # Build the full address
            if zip_code:
                full_address = f"{address}, {city}, {state} {zip_code}, {country}"
            else:
                full_address = f"{address}, {city}, {state}, {country}"
            
            # Make API request
            params = {
                'address': full_address,
                'key': self.api_key
            }
            
            response = requests.get(self.geocoding_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                location = data['results'][0]['geometry']['location']
                lat = location['lat']
                lng = location['lng']
                
                logger.info(f"Successfully geocoded: {full_address} -> ({lat}, {lng})")
                return (lat, lng)
            else:
                logger.warning(f"Geocoding failed for {full_address}: {data['status']}")
                return None
                
        except Exception as e:
            logger.error(f"Error geocoding {address}: {e}")
            return None
    
    def geocode_batch(self, addresses: list, delay: float = 0.1) -> Dict[str, Tuple[float, float]]:
        """Geocode multiple addresses with rate limiting.
        
        Args:
            addresses: List of address dictionaries with keys: address, city, state, zip_code, country
            delay: Delay between requests in seconds (default: 0.1)
            
        Returns:
            Dictionary mapping address strings to (latitude, longitude) tuples
        """
        results = {}
        
        for addr_data in addresses:
            coordinates = self.geocode_address(
                addr_data['address'],
                addr_data['city'],
                addr_data['state'],
                addr_data.get('zip_code'),
                addr_data.get('country', 'USA')
            )
            
            if coordinates:
                # Create a key for the address
                addr_key = f"{addr_data['address']}, {addr_data['city']}, {addr_data['state']}"
                if addr_data.get('zip_code'):
                    addr_key += f" {addr_data['zip_code']}"
                addr_key += f", {addr_data.get('country', 'USA')}"
                
                results[addr_key] = coordinates
            
            # Rate limiting
            time.sleep(delay)
        
        return results
    
    def reverse_geocode(self, lat: float, lng: float) -> Optional[Dict[str, Any]]:
        """Reverse geocode coordinates to get address information.
        
        Args:
            lat: Latitude
            lng: Longitude
            
        Returns:
            Dictionary with address components or None if reverse geocoding fails
        """
        if not self.api_key:
            logger.warning("Cannot reverse geocode - no API key available")
            return None
            
        try:
            params = {
                'latlng': f"{lat},{lng}",
                'key': self.api_key
            }
            
            response = requests.get(self.geocoding_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                result = data['results'][0]
                address_components = result['address_components']
                
                # Extract address components
                address_info = {}
                for component in address_components:
                    types = component['types']
                    if 'street_number' in types:
                        address_info['street_number'] = component['long_name']
                    elif 'route' in types:
                        address_info['street_name'] = component['long_name']
                    elif 'locality' in types:
                        address_info['city'] = component['long_name']
                    elif 'administrative_area_level_1' in types:
                        address_info['state'] = component['long_name']
                    elif 'postal_code' in types:
                        address_info['zip_code'] = component['long_name']
                    elif 'country' in types:
                        address_info['country'] = component['long_name']
                
                # Build formatted address
                address_info['formatted_address'] = result['formatted_address']
                
                logger.info(f"Successfully reverse geocoded: ({lat}, {lng}) -> {address_info['formatted_address']}")
                return address_info
            else:
                logger.warning(f"Reverse geocoding failed for ({lat}, {lng}): {data['status']}")
                return None
                
        except Exception as e:
            logger.error(f"Error reverse geocoding ({lat}, {lng}): {e}")
            return None

# Convenience function for quick geocoding
def geocode_address(address: str, city: str, state: str, zip_code: str = None, country: str = 'USA') -> Optional[Tuple[float, float]]:
    """Quick geocoding function for single addresses.
    
    Args:
        address: Street address
        city: City name
        state: State/province
        zip_code: ZIP/postal code (optional)
        country: Country name (default: USA)
        
    Returns:
        Tuple of (latitude, longitude) or None if geocoding fails
    """
    service = GeocodingService()
    return service.geocode_address(address, city, state, zip_code, country)
