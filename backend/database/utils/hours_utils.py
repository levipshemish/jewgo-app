#!/usr/bin/env python3
"""
Hours filtering utilities for JewGo App.
Implements proper hours filtering using normalized time calculations.
"""
import json
from datetime import datetime, time
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

def time_to_minutes(time_str: str) -> int:
    """Convert time string (HHMM format) to minutes since midnight.
    
    Args:
        time_str: Time in HHMM format (e.g., "0700", "2200")
        
    Returns:
        Minutes since midnight (e.g., 420 for 07:00, 1320 for 22:00)
    """
    try:
        if len(time_str) == 4:
            hours = int(time_str[:2])
            minutes = int(time_str[2:])
            return hours * 60 + minutes
        return 0
    except (ValueError, IndexError):
        logger.warning(f"Invalid time format: {time_str}")
        return 0

def get_current_time_minutes() -> int:
    """Get current time in minutes since midnight (local time)."""
    now = datetime.now()
    return now.hour * 60 + now.minute

def get_current_day() -> int:
    """Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)."""
    return datetime.now().weekday() + 1 if datetime.now().weekday() < 6 else 0

def is_restaurant_open_now(hours_json_str: str) -> bool:
    """Check if restaurant is currently open based on hours_json.
    
    Args:
        hours_json_str: JSON string containing hours data
        
    Returns:
        True if restaurant is currently open, False otherwise
    """
    try:
        if not hours_json_str:
            return False
            
        hours_data = json.loads(hours_json_str)
        
        # First check the open_now flag if available
        if 'open_now' in hours_data:
            return hours_data['open_now']
        
        # If open_now is not available, calculate from periods
        if 'periods' not in hours_data:
            return False
            
        current_time = get_current_time_minutes()
        current_day = get_current_day()
        
        for period in hours_data['periods']:
            if 'open' not in period or 'close' not in period:
                continue
                
            open_day = period['open']['day']
            close_day = period['close']['day']
            open_time = time_to_minutes(period['open']['time'])
            close_time = time_to_minutes(period['close']['time'])
            
            # Handle same-day hours
            if open_day == close_day:
                if open_day == current_day and open_time <= current_time <= close_time:
                    return True
            # Handle overnight hours (e.g., Saturday 21:00 to Sunday 00:00)
            elif close_day == (open_day + 1) % 7:
                if open_day == current_day and current_time >= open_time:
                    return True
                elif close_day == current_day and current_time <= close_time:
                    return True
        
        return False
        
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning(f"Error parsing hours_json: {e}")
        return False

def is_restaurant_open_during_period(hours_json_str: str, period: str) -> bool:
    """Check if restaurant is open during a specific time period.
    
    Args:
        hours_json_str: JSON string containing hours data
        period: Time period ('morning', 'afternoon', 'evening', 'lateNight')
        
    Returns:
        True if restaurant is open during the specified period
    """
    try:
        if not hours_json_str:
            return False
            
        hours_data = json.loads(hours_json_str)
        
        if 'periods' not in hours_data:
            return False
        
        # Define time period ranges in minutes since midnight
        period_ranges = {
            'morning': (360, 720),    # 6:00 AM - 12:00 PM
            'afternoon': (720, 1080), # 12:00 PM - 6:00 PM
            'evening': (1080, 1320),  # 6:00 PM - 10:00 PM
            'lateNight': (1320, 360)  # 10:00 PM - 6:00 AM (overnight)
        }
        
        if period not in period_ranges:
            return False
            
        period_start, period_end = period_ranges[period]
        
        # Check if any of the restaurant's hours overlap with the period
        for day_period in hours_data['periods']:
            if 'open' not in day_period or 'close' not in day_period:
                continue
                
            open_time = time_to_minutes(day_period['open']['time'])
            close_time = time_to_minutes(day_period['close']['time'])
            
            # Handle same-day hours
            if day_period['open']['day'] == day_period['close']['day']:
                # Check if restaurant hours overlap with the period
                if (open_time < period_end and close_time > period_start):
                    return True
            # Handle overnight hours
            elif day_period['close']['day'] == (day_period['open']['day'] + 1) % 7:
                # For overnight hours, check if they overlap with the period
                if period == 'lateNight':
                    # Late night period spans midnight, so check both parts
                    if (open_time >= period_start or close_time <= period_end):
                        return True
                else:
                    # Other periods don't span midnight, so check if restaurant hours overlap
                    if (open_time < period_end or close_time > period_start):
                        return True
        
        return False
        
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning(f"Error parsing hours_json for period {period}: {e}")
        return False

def has_hours_data(hours_json_str: str) -> bool:
    """Check if restaurant has valid hours data.
    
    Args:
        hours_json_str: JSON string containing hours data
        
    Returns:
        True if restaurant has valid hours data, False otherwise
    """
    try:
        if not hours_json_str or hours_json_str.strip() == '':
            return False
            
        hours_data = json.loads(hours_json_str)
        
        # Check if it has either open_now flag or periods
        return ('open_now' in hours_data or 
                ('periods' in hours_data and len(hours_data['periods']) > 0))
                
    except (json.JSONDecodeError, KeyError, TypeError):
        return False

def count_restaurants_with_hours_data(restaurants: List[Dict]) -> int:
    """Count restaurants that have valid hours data.
    
    Args:
        restaurants: List of restaurant dictionaries
        
    Returns:
        Number of restaurants with valid hours data
    """
    count = 0
    for restaurant in restaurants:
        if has_hours_data(restaurant.get('hours_json', '')):
            count += 1
    return count

def count_restaurants_open_now(restaurants: List[Dict]) -> int:
    """Count restaurants that are currently open.
    
    Args:
        restaurants: List of restaurant dictionaries
        
    Returns:
        Number of restaurants currently open
    """
    count = 0
    for restaurant in restaurants:
        if is_restaurant_open_now(restaurant.get('hours_json', '')):
            count += 1
    return count
