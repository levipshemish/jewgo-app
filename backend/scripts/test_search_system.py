import asyncio
import sys
import os
from typing import Dict, Any
from dotenv import load_dotenv

from database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManager
from search.search_service import SearchService
from search.core.search_types import SearchFilters, KosherCategory, CertifyingAgency


        import traceback




#!/usr/bin/env python3
"""Test Script for New Search System.
================================

This script tests the new unified search system to ensure all components work correctly.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

# Load environment variables
load_dotenv()

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

async def test_search_system():
    """Test the new search system."""
    print("🧪 Testing New Search System")
    print("=" * 50)
    
    try:
        # Initialize database manager
        print("📊 Initializing database manager...")
        db_manager = DatabaseManager()
        db_session = db_manager.get_session()
        
        # Initialize search service
        print("🔍 Initializing search service...")
        search_service = SearchService(db_session)
        
        # Test 1: Health Check
        print("\n🏥 Testing Health Check...")
        health_status = await search_service.health_check()
        print(f"Overall Status: {health_status['overall_status']}")
        for provider_name, status in health_status['providers'].items():
            print(f"  {provider_name}: {'✅' if status['healthy'] else '❌'} ({status.get('type', 'unknown')})")
        
        # Test 2: Available Providers
        print("\n📋 Available Providers...")
        providers = await search_service.get_available_providers()
        for provider_name, info in providers.items():
            print(f"  {provider_name}: {'✅' if info['healthy'] else '❌'} ({info['type']})")
        
        # Test 3: Basic Search
        print("\n🔎 Testing Basic Search...")
        test_queries = [
            "kosher",
            "miami",
            "dairy",
            "restaurant"
        ]
        
        for query in test_queries:
            print(f"\n  Query: '{query}'")
            try:
                response = await search_service.search(query, limit=5)
                print(f"    Results: {len(response.results)}")
                print(f"    Execution Time: {response.search_metadata.execution_time_ms}ms")
                
                for i, result in enumerate(response.results[:3], 1):
                    print(f"    {i}. {result.name} ({result.city}) - Score: {result.relevance_score:.2f}")
                    
            except Exception as e:
                print(f"    ❌ Error: {str(e)}")
        
        # Test 4: Search with Filters
        print("\n🔧 Testing Search with Filters...")
        filters = SearchFilters(
            kosher_category=KosherCategory.DAIRY,
            city="Miami"
        )
        
        try:
            response = await search_service.search("kosher", filters=filters, limit=5)
            print(f"  Filtered Results: {len(response.results)}")
            for i, result in enumerate(response.results[:3], 1):
                print(f"    {i}. {result.name} ({result.city}) - {result.kosher_category}")
                
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
        
        # Test 5: Suggestions
        print("\n💡 Testing Suggestions...")
        suggestion_queries = ["kos", "mia", "dai"]
        
        for query in suggestion_queries:
            try:
                suggestions = await search_service.get_suggestions(query, limit=5)
                print(f"  '{query}': {suggestions}")
            except Exception as e:
                print(f"  ❌ Error for '{query}': {str(e)}")
        
        # Test 6: Search Statistics
        print("\n📈 Search Statistics...")
        stats = await search_service.get_search_stats()
        print(f"  Total Searches: {stats['total_searches']}")
        print(f"  Successful: {stats['successful_searches']}")
        print(f"  Failed: {stats['failed_searches']}")
        print(f"  Average Response Time: {stats['average_response_time_ms']:.2f}ms")
        
        # Test 7: PostgreSQL Search Only
        print("\n🔄 Testing PostgreSQL Search...")
        try:
            response = await search_service.search("kosher", search_type='postgresql', limit=3)
            print(f"    Results: {len(response.results)}")
            print(f"    Execution Time: {response.search_metadata.execution_time_ms}ms")
            
        except Exception as e:
            print(f"    ❌ Error: {str(e)}")
        
        print("\n✅ Search System Test Completed Successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        traceback.print_exc()
    
    finally:
        # Clean up
        if 'db_session' in locals():
            db_session.close()


# Embedding generation tests removed - vector search is no longer supported


def main():
    """Main test function."""
    print("🚀 Starting Search System Tests")
    print("=" * 60)
    
    # Run tests
    asyncio.run(test_search_system())
    
    print("\n🎉 All tests completed!")


if __name__ == "__main__":
    main()
