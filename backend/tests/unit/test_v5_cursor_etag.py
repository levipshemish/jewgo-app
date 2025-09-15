#!/usr/bin/env python3
"""
Unit tests for V5 cursor and ETag functionality.

Tests the cursor-based pagination and ETag caching mechanisms
used in the v5 API.
"""

import pytest

from utils.cursor_v5 import CursorV5
from utils.etag_v5 import ETagV5, generate_collection_etag_v5
from utils.logging_config import get_logger

logger = get_logger(__name__)


class TestCursorV5:
    """Test cursor-based pagination functionality."""
    
    def setup_method(self):
        """Setup test environment."""
        self.cursor_manager = CursorV5()
    
    def test_cursor_creation(self):
        """Test cursor creation and encoding."""
        # Test data
        test_data = {
            'id': 123,
            'created_at': '2024-01-01T00:00:00Z',
            'name': 'Test Entity'
        }
        
        # Create cursor
        cursor = self.cursor_manager.create_cursor(test_data)
        assert cursor is not None
        assert isinstance(cursor, str)
        
        # Decode cursor
        decoded = self.cursor_manager.decode_cursor(cursor)
        assert decoded is not None
        assert decoded['id'] == test_data['id']
    
    def test_cursor_validation(self):
        """Test cursor validation."""
        # Valid cursor
        valid_cursor = self.cursor_manager.create_cursor({'id': 123, 'created_at': '2024-01-01T00:00:00Z'})
        assert self.cursor_manager.validate_cursor(valid_cursor) is True
        
        # Invalid cursor
        invalid_cursor = "invalid_cursor_string"
        assert self.cursor_manager.validate_cursor(invalid_cursor) is False
        
        # Empty cursor
        assert self.cursor_manager.validate_cursor("") is False
        assert self.cursor_manager.validate_cursor(None) is False
    
    def test_cursor_pagination(self):
        """Test cursor-based pagination logic."""
        # Mock data
        entities = [
            {'id': 1, 'created_at': '2024-01-01T00:00:00Z', 'name': 'Entity 1'},
            {'id': 2, 'created_at': '2024-01-01T01:00:00Z', 'name': 'Entity 2'},
            {'id': 3, 'created_at': '2024-01-01T02:00:00Z', 'name': 'Entity 3'},
            {'id': 4, 'created_at': '2024-01-01T03:00:00Z', 'name': 'Entity 4'},
            {'id': 5, 'created_at': '2024-01-01T04:00:00Z', 'name': 'Entity 5'},
        ]
        
        # Test first page
        page1 = self.cursor_manager.paginate(entities, limit=2)
        assert len(page1['data']) == 2
        assert page1['data'][0]['id'] == 1
        assert page1['data'][1]['id'] == 2
        assert page1['next_cursor'] is not None
        assert page1['prev_cursor'] is None
        
        # Test second page using cursor
        next_cursor = page1['next_cursor']
        page2 = self.cursor_manager.paginate(entities, cursor=next_cursor, limit=2)
        assert len(page2['data']) == 2
        assert page2['data'][0]['id'] == 3
        assert page2['data'][1]['id'] == 4
        assert page2['next_cursor'] is not None
        assert page2['prev_cursor'] is not None
        
        # Test last page
        next_cursor = page2['next_cursor']
        page3 = self.cursor_manager.paginate(entities, cursor=next_cursor, limit=2)
        assert len(page3['data']) == 1
        assert page3['data'][0]['id'] == 5
        assert page3['next_cursor'] is None
        assert page3['prev_cursor'] is not None
    
    def test_cursor_edge_cases(self):
        """Test cursor edge cases."""
        # Empty data
        empty_result = self.cursor_manager.paginate([], limit=10)
        assert empty_result['data'] == []
        assert empty_result['next_cursor'] is None
        assert empty_result['prev_cursor'] is None
        
        # Single item
        single_item = [{'id': 1, 'created_at': '2024-01-01T00:00:00Z'}]
        single_result = self.cursor_manager.paginate(single_item, limit=10)
        assert len(single_result['data']) == 1
        assert single_result['next_cursor'] is None
        assert single_result['prev_cursor'] is None
        
        # Limit larger than data
        large_limit_result = self.cursor_manager.paginate(single_item, limit=100)
        assert len(large_limit_result['data']) == 1
        assert large_limit_result['next_cursor'] is None


class TestETagV5:
    """Test ETag caching functionality."""
    
    def setup_method(self):
        """Setup test environment."""
        self.etag_manager = ETagV5()
    
    def test_etag_generation(self):
        """Test ETag generation."""
        # Test data
        test_data = {
            'id': 123,
            'name': 'Test Entity',
            'created_at': '2024-01-01T00:00:00Z'
        }
        
        # Generate ETag
        etag = self.etag_manager.generate_etag(test_data, 'test_entity')
        assert etag is not None
        assert isinstance(etag, str)
        assert etag.startswith('"') and etag.endswith('"')
        
        # Same data should generate same ETag
        etag2 = self.etag_manager.generate_etag(test_data, 'test_entity')
        assert etag == etag2
        
        # Different data should generate different ETag
        different_data = test_data.copy()
        different_data['name'] = 'Different Entity'
        etag3 = self.etag_manager.generate_etag(different_data, 'test_entity')
        assert etag != etag3
    
    def test_etag_validation(self):
        """Test ETag validation."""
        test_data = {'id': 123, 'name': 'Test Entity'}
        etag = self.etag_manager.generate_etag(test_data, 'test_entity')
        
        # Valid ETag should validate
        assert self.etag_manager.validate_etag(etag, etag) is True
        
        # Different ETag should not validate
        different_etag = self.etag_manager.generate_etag({'id': 456, 'name': 'Different'}, 'test_entity')
        assert self.etag_manager.validate_etag(etag, different_etag) is False
        
        # Invalid ETag format should not validate
        assert self.etag_manager.validate_etag(etag, "invalid_etag") is False
    
    def test_collection_etag_generation(self):
        """Test collection ETag generation."""
        # Generate collection ETag
        etag = generate_collection_etag_v5(
            entity_type='restaurants',
            filters={'status': 'active'},
            sort_key='created_at_desc',
            page_size=20,
            cursor_token=None,
            user_context={'user_id': 'test_user'}
        )
        
        assert etag is not None
        assert isinstance(etag, str)
        
        # Same parameters should generate same ETag
        etag2 = generate_collection_etag_v5(
            entity_type='restaurants',
            filters={'status': 'active'},
            sort_key='created_at_desc',
            page_size=20,
            cursor_token=None,
            user_context={'user_id': 'test_user'}
        )
        assert etag == etag2
        
        # Different filters should generate different ETag
        etag3 = generate_collection_etag_v5(
            entity_type='restaurants',
            filters={'status': 'inactive'},
            sort_key='created_at_desc',
            page_size=20,
            cursor_token=None,
            user_context={'user_id': 'test_user'}
        )
        assert etag != etag3
    
    def test_etag_invalidation(self):
        """Test ETag invalidation."""
        test_data = {'id': 123, 'name': 'Test Entity'}
        etag = self.etag_manager.generate_etag(test_data, 'test_entity')
        
        # Invalidate ETag
        self.etag_manager.invalidate_etag('test_entity')
        
        # ETag should still be valid (invalidation is for cache management)
        assert self.etag_manager.validate_etag(etag, etag) is True
    
    def test_etag_with_filters(self):
        """Test ETag generation with various filters."""
        base_params = {
            'entity_type': 'restaurants',
            'sort_key': 'created_at_desc',
            'page_size': 20,
            'cursor_token': None,
            'user_context': {'user_id': 'test_user'}
        }
        
        # Test with different filter combinations
        filter_combinations = [
            {},
            {'status': 'active'},
            {'status': 'active', 'city': 'New York'},
            {'status': 'active', 'city': 'New York', 'kosher_category': 'kosher'},
        ]
        
        etags = []
        for filters in filter_combinations:
            etag = generate_collection_etag_v5(filters=filters, **base_params)
            etags.append(etag)
        
        # All ETags should be different
        assert len(set(etags)) == len(etags)
    
    def test_etag_with_pagination(self):
        """Test ETag generation with pagination parameters."""
        base_params = {
            'entity_type': 'restaurants',
            'filters': {'status': 'active'},
            'sort_key': 'created_at_desc',
            'user_context': {'user_id': 'test_user'}
        }
        
        # Test with different pagination parameters
        pagination_combinations = [
            {'page_size': 10, 'cursor_token': None},
            {'page_size': 20, 'cursor_token': None},
            {'page_size': 10, 'cursor_token': 'cursor_123'},
            {'page_size': 20, 'cursor_token': 'cursor_123'},
        ]
        
        etags = []
        for pagination in pagination_combinations:
            etag = generate_collection_etag_v5(**base_params, **pagination)
            etags.append(etag)
        
        # All ETags should be different
        assert len(set(etags)) == len(etags)
    
    def test_etag_edge_cases(self):
        """Test ETag edge cases."""
        # Empty data
        etag = self.etag_manager.generate_etag({}, 'empty_entity')
        assert etag is not None
        
        # None data
        etag = self.etag_manager.generate_etag(None, 'none_entity')
        assert etag is not None
        
        # Large data
        large_data = {f'key_{i}': f'value_{i}' for i in range(1000)}
        etag = self.etag_manager.generate_etag(large_data, 'large_entity')
        assert etag is not None
        
        # Special characters
        special_data = {'name': 'Test "Entity" with \'quotes\' and \n newlines'}
        etag = self.etag_manager.generate_etag(special_data, 'special_entity')
        assert etag is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
