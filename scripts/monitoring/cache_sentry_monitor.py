#!/usr/bin/env python3
"""Cache and Sentry Health Monitor.
================================

Monitors cache operations and Sentry error tracking to identify
operational issues that were previously masked by silent error handling.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from utils.config_manager import ConfigManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CacheSentryMonitor:
    """Monitor cache and Sentry health."""
    
    def __init__(self, backend_url: str = None):
        """Initialize monitor.
        
        Args:
            backend_url: Backend API URL
        """
        self.backend_url = backend_url or os.getenv('BACKEND_URL', 'https://jewgo.onrender.com')
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'cache_health': {},
            'sentry_health': {},
            'recommendations': []
        }
    
    def check_cache_health(self) -> Dict[str, Any]:
        """Check cache health via API endpoint."""
        try:
            url = f"{self.backend_url}/api/redis/cache-health"
            response = urllib.request.urlopen(url, timeout=10)
            
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                logger.info("Cache health check successful")
                return data
            else:
                logger.error(f"Cache health check failed: {response.status}")
                return {
                    'status': 'error',
                    'error': f'HTTP {response.status}',
                    'response': response.read().decode('utf-8')
                }
                
        except urllib.error.URLError as e:
            logger.error(f"Cache health check request failed: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def check_sentry_health(self) -> Dict[str, Any]:
        """Check Sentry health by attempting to send a test event."""
        try:
            import sentry_sdk
            
            # Check if Sentry is initialized
            if not sentry_sdk.Hub.current.client:
                return {
                    'status': 'not_initialized',
                    'message': 'Sentry not initialized'
                }
            
            # Try to capture a test event
            event_id = sentry_sdk.capture_message(
                "Cache/Sentry Monitor Test Event",
                level="info"
            )
            
            if event_id:
                return {
                    'status': 'healthy',
                    'message': 'Sentry is working correctly',
                    'test_event_id': event_id
                }
            else:
                return {
                    'status': 'error',
                    'message': 'Failed to capture test event'
                }
                
        except ImportError:
            return {
                'status': 'not_available',
                'message': 'Sentry SDK not available'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Sentry health check failed: {str(e)}'
            }
    
    def analyze_results(self) -> None:
        """Analyze monitoring results and generate recommendations."""
        recommendations = []
        
        # Analyze cache health
        cache_health = self.results.get('cache_health', {})
        if cache_health.get('status') == 'unhealthy':
            recommendations.append({
                'type': 'cache',
                'severity': 'high',
                'message': 'Cache is unhealthy - check Redis connectivity and configuration',
                'details': cache_health.get('error', 'Unknown error')
            })
        
        cache_metrics = cache_health.get('cache_metrics', {})
        error_rate = cache_metrics.get('cache_operations', {}).get('error_rate', 0)
        if error_rate > 5:
            recommendations.append({
                'type': 'cache',
                'severity': 'medium',
                'message': f'High cache error rate: {error_rate:.1f}%',
                'details': 'Consider investigating cache connectivity issues'
            })
        
        # Analyze Sentry health
        sentry_health = self.results.get('sentry_health', {})
        if sentry_health.get('status') == 'error':
            recommendations.append({
                'type': 'sentry',
                'severity': 'high',
                'message': 'Sentry error tracking is not working',
                'details': sentry_health.get('message', 'Unknown error')
            })
        
        self.results['recommendations'] = recommendations
    
    def run_monitoring(self) -> Dict[str, Any]:
        """Run complete monitoring check."""
        logger.info("Starting cache and Sentry health monitoring...")
        
        # Check cache health
        logger.info("Checking cache health...")
        self.results['cache_health'] = self.check_cache_health()
        
        # Check Sentry health
        logger.info("Checking Sentry health...")
        self.results['sentry_health'] = self.check_sentry_health()
        
        # Analyze results
        self.analyze_results()
        
        # Log summary
        logger.info("Monitoring complete")
        logger.info(f"Cache status: {self.results['cache_health'].get('status', 'unknown')}")
        logger.info(f"Sentry status: {self.results['sentry_health'].get('status', 'unknown')}")
        logger.info(f"Recommendations: {len(self.results['recommendations'])}")
        
        return self.results
    
    def save_results(self, filename: str = None) -> None:
        """Save monitoring results to file."""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"cache_sentry_monitor_{timestamp}.json"
        
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        try:
            with open(filepath, 'w') as f:
                json.dump(self.results, f, indent=2, default=str)
            logger.info(f"Results saved to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save results: {e}")


def main():
    """Main monitoring function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Monitor cache and Sentry health')
    parser.add_argument('--backend-url', help='Backend API URL')
    parser.add_argument('--save', action='store_true', help='Save results to file')
    parser.add_argument('--output', help='Output filename')
    
    args = parser.parse_args()
    
    # Run monitoring
    monitor = CacheSentryMonitor(backend_url=args.backend_url)
    results = monitor.run_monitoring()
    
    # Print results
    print(json.dumps(results, indent=2, default=str))
    
    # Save if requested
    if args.save:
        monitor.save_results(args.output)


if __name__ == '__main__':
    main()
