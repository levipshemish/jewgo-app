#!/usr/bin/env python3
"""Geocoding API routes for JewGo application.
Provides endpoints for geocoding addresses and updating coordinates.
"""

from flask import Blueprint, request, jsonify
from utils.geocoding import GeocodingService
from utils.logging_config import get_logger
from database.database_manager_v5 import DatabaseManagerV5
import os

logger = get_logger(__name__)

# Create blueprint
geocoding_bp = Blueprint('geocoding', __name__, url_prefix='/api/v5/geocoding')

@geocoding_bp.route('/geocode-address', methods=['POST'])
def geocode_address():
    """Geocode a single address and return coordinates."""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('address'):
            return jsonify({
                'success': False,
                'error': 'Address is required'
            }), 400
        
        address = data.get('address', '')
        city = data.get('city', '')
        state = data.get('state', '')
        zip_code = data.get('zip_code')
        country = data.get('country', 'USA')
        
        # Initialize geocoding service
        geocoding_service = GeocodingService()
        
        # Geocode the address
        coordinates = geocoding_service.geocode_address(address, city, state, zip_code, country)
        
        if coordinates:
            lat, lng = coordinates
            return jsonify({
                'success': True,
                'data': {
                    'latitude': lat,
                    'longitude': lng,
                    'formatted_address': f"{address}, {city}, {state} {zip_code or ''}, {country}".strip()
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to geocode address'
            }), 422
            
    except Exception as e:
        logger.error(f"Error in geocode_address: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@geocoding_bp.route('/geocode-shul/<int:shul_id>', methods=['POST'])
def geocode_shul(shul_id: int):
    """Geocode a specific shul by ID and update its coordinates in the database."""
    try:
        # Get database connection
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            return jsonify({
                'success': False,
                'error': 'Database configuration error'
            }), 500
        
        db_manager = DatabaseManagerV5(database_url)
        
        # Get shul data
        shul_data = db_manager.get_shul_by_id(shul_id)
        if not shul_data:
            return jsonify({
                'success': False,
                'error': 'Shul not found'
            }), 404
        
        # Check if already has coordinates
        if shul_data.get('latitude') and shul_data.get('longitude'):
            return jsonify({
                'success': True,
                'message': 'Shul already has coordinates',
                'data': {
                    'latitude': float(shul_data['latitude']),
                    'longitude': float(shul_data['longitude'])
                }
            })
        
        # Extract address components
        address = shul_data.get('address', '')
        city = shul_data.get('city', '')
        state = shul_data.get('state', '')
        zip_code = shul_data.get('zip_code')
        country = shul_data.get('country', 'USA')
        
        if not address and not city:
            return jsonify({
                'success': False,
                'error': 'Shul has insufficient address information'
            }), 400
        
        # Initialize geocoding service
        geocoding_service = GeocodingService()
        
        # Geocode the address
        coordinates = geocoding_service.geocode_address(address, city, state, zip_code, country)
        
        if coordinates:
            lat, lng = coordinates
            
            # Update shul coordinates in database
            success = db_manager.update_shul_coordinates(shul_id, lat, lng)
            
            if success:
                logger.info(f"Successfully geocoded and updated shul {shul_id}: ({lat}, {lng})")
                return jsonify({
                    'success': True,
                    'message': 'Shul coordinates updated successfully',
                    'data': {
                        'shul_id': shul_id,
                        'latitude': lat,
                        'longitude': lng
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to update shul coordinates in database'
                }), 500
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to geocode shul address'
            }), 422
            
    except Exception as e:
        logger.error(f"Error in geocode_shul: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@geocoding_bp.route('/get-shul/<int:shul_id>', methods=['GET'])
def get_shul_by_id(shul_id: int):
    """Get a specific shul by ID for details page."""
    try:
        # Get database connection
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            return jsonify({
                'success': False,
                'error': 'Database configuration error'
            }), 500
        
        db_manager = DatabaseManagerV5(database_url)
        
        # Get shul data
        shul_data = db_manager.get_shul_by_id(shul_id)
        if not shul_data:
            return jsonify({
                'success': False,
                'error': 'Synagogue not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': dict(shul_data)
        })
        
    except Exception as e:
        logger.error(f"Error getting shul {shul_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@geocoding_bp.route('/batch-geocode-shuls', methods=['POST'])
def batch_geocode_shuls():
    """Batch geocode multiple shuls that don't have coordinates."""
    try:
        data = request.get_json() or {}
        limit = data.get('limit', 50)  # Default to 50 shuls at a time
        force_update = data.get('force_update', False)  # Force update existing coordinates
        
        # Get database connection
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            return jsonify({
                'success': False,
                'error': 'Database configuration error'
            }), 500
        
        db_manager = DatabaseManagerV5(database_url)
        
        # Get shuls without coordinates
        if force_update:
            shuls = db_manager.get_shuls_for_geocoding(limit=limit, include_with_coordinates=True)
        else:
            shuls = db_manager.get_shuls_for_geocoding(limit=limit, include_with_coordinates=False)
        
        if not shuls:
            return jsonify({
                'success': True,
                'message': 'No shuls found that need geocoding',
                'data': {
                    'processed': 0,
                    'successful': 0,
                    'failed': 0
                }
            })
        
        # Initialize geocoding service
        geocoding_service = GeocodingService()
        
        processed = 0
        successful = 0
        failed = 0
        results = []
        
        for shul in shuls:
            processed += 1
            shul_id = shul['id']
            
            try:
                # Extract address components
                address = shul.get('address', '')
                city = shul.get('city', '')
                state = shul.get('state', '')
                zip_code = shul.get('zip_code')
                country = shul.get('country', 'USA')
                
                if not address and not city:
                    failed += 1
                    results.append({
                        'shul_id': shul_id,
                        'name': shul.get('name', 'Unknown'),
                        'status': 'failed',
                        'error': 'Insufficient address information'
                    })
                    continue
                
                # Geocode the address
                coordinates = geocoding_service.geocode_address(address, city, state, zip_code, country)
                
                if coordinates:
                    lat, lng = coordinates
                    
                    # Update shul coordinates in database
                    update_success = db_manager.update_shul_coordinates(shul_id, lat, lng)
                    
                    if update_success:
                        successful += 1
                        results.append({
                            'shul_id': shul_id,
                            'name': shul.get('name', 'Unknown'),
                            'status': 'success',
                            'latitude': lat,
                            'longitude': lng
                        })
                        logger.info(f"Successfully geocoded shul {shul_id}: {shul.get('name')} -> ({lat}, {lng})")
                    else:
                        failed += 1
                        results.append({
                            'shul_id': shul_id,
                            'name': shul.get('name', 'Unknown'),
                            'status': 'failed',
                            'error': 'Database update failed'
                        })
                else:
                    failed += 1
                    results.append({
                        'shul_id': shul_id,
                        'name': shul.get('name', 'Unknown'),
                        'status': 'failed',
                        'error': 'Geocoding failed'
                    })
                
                # Add delay to respect API rate limits
                import time
                time.sleep(0.1)  # 100ms delay between requests
                
            except Exception as e:
                failed += 1
                results.append({
                    'shul_id': shul_id,
                    'name': shul.get('name', 'Unknown'),
                    'status': 'failed',
                    'error': str(e)
                })
                logger.error(f"Error geocoding shul {shul_id}: {e}")
        
        return jsonify({
            'success': True,
            'message': f'Batch geocoding completed: {successful} successful, {failed} failed',
            'data': {
                'processed': processed,
                'successful': successful,
                'failed': failed,
                'results': results
            }
        })
        
    except Exception as e:
        logger.error(f"Error in batch_geocode_shuls: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
