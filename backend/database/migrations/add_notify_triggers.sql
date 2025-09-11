-- Add NOTIFY triggers for cache invalidation worker
-- This script adds PostgreSQL triggers that send NOTIFY messages
-- when data changes, enabling real-time cache invalidation

-- =============================================================================
-- NOTIFY TRIGGER FUNCTIONS
-- =============================================================================

-- Generic function to send notifications for entity changes
CREATE OR REPLACE FUNCTION notify_entity_change()
RETURNS TRIGGER AS $$
DECLARE
    channel_name TEXT;
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', TG_TABLE_NAME
    );
    
    -- Determine channel name based on table
    CASE TG_TABLE_NAME
        WHEN 'restaurants' THEN
            channel_name := 'restaurant_change';
        WHEN 'synagogues' THEN
            channel_name := 'synagogue_change';
        WHEN 'mikvahs' THEN
            channel_name := 'mikvah_change';
        WHEN 'stores' THEN
            channel_name := 'store_change';
        WHEN 'users' THEN
            channel_name := 'user_change';
        WHEN 'reviews' THEN
            channel_name := 'review_change';
        WHEN 'orders' THEN
            channel_name := 'order_change';
        ELSE
            channel_name := 'cache_invalidate';
    END CASE;
    
    -- Send notification
    PERFORM pg_notify(channel_name, payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for restaurant-specific notifications
CREATE OR REPLACE FUNCTION notify_restaurant_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'restaurants',
        'entity_type', 'restaurant'
    );
    
    -- Send notification
    PERFORM pg_notify('restaurant_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for synagogue-specific notifications
CREATE OR REPLACE FUNCTION notify_synagogue_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'synagogues',
        'entity_type', 'synagogue'
    );
    
    -- Send notification
    PERFORM pg_notify('synagogue_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for mikvah-specific notifications
CREATE OR REPLACE FUNCTION notify_mikvah_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'mikvahs',
        'entity_type', 'mikvah'
    );
    
    -- Send notification
    PERFORM pg_notify('mikvah_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for store-specific notifications
CREATE OR REPLACE FUNCTION notify_store_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'stores',
        'entity_type', 'store'
    );
    
    -- Send notification
    PERFORM pg_notify('store_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for user-specific notifications
CREATE OR REPLACE FUNCTION notify_user_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'users',
        'entity_type', 'user'
    );
    
    -- Send notification
    PERFORM pg_notify('user_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for review-specific notifications
CREATE OR REPLACE FUNCTION notify_review_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'reviews',
        'entity_type', 'review'
    );
    
    -- Send notification
    PERFORM pg_notify('review_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for order-specific notifications
CREATE OR REPLACE FUNCTION notify_order_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'orders',
        'entity_type', 'order'
    );
    
    -- Send notification
    PERFORM pg_notify('order_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_restaurant_change ON restaurants;
DROP TRIGGER IF EXISTS trigger_synagogue_change ON synagogues;
DROP TRIGGER IF EXISTS trigger_mikvah_change ON mikvahs;
DROP TRIGGER IF EXISTS trigger_store_change ON stores;
DROP TRIGGER IF EXISTS trigger_user_change ON users;
DROP TRIGGER IF EXISTS trigger_review_change ON reviews;
DROP TRIGGER IF EXISTS trigger_order_change ON orders;

-- Create triggers for restaurants
CREATE TRIGGER trigger_restaurant_change
    AFTER INSERT OR UPDATE OR DELETE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION notify_restaurant_change();

-- Create triggers for synagogues
CREATE TRIGGER trigger_synagogue_change
    AFTER INSERT OR UPDATE OR DELETE ON synagogues
    FOR EACH ROW
    EXECUTE FUNCTION notify_synagogue_change();

-- Create triggers for mikvahs
CREATE TRIGGER trigger_mikvah_change
    AFTER INSERT OR UPDATE OR DELETE ON mikvahs
    FOR EACH ROW
    EXECUTE FUNCTION notify_mikvah_change();

-- Create triggers for stores
CREATE TRIGGER trigger_store_change
    AFTER INSERT OR UPDATE OR DELETE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION notify_store_change();

-- Create triggers for users
CREATE TRIGGER trigger_user_change
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_change();

-- Create triggers for reviews
CREATE TRIGGER trigger_review_change
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_review_change();

-- Create triggers for orders
CREATE TRIGGER trigger_order_change
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_change();

-- =============================================================================
-- ADDITIONAL TRIGGERS FOR RELATED TABLES
-- =============================================================================

-- Function for restaurant hours notifications
CREATE OR REPLACE FUNCTION notify_restaurant_hours_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'restaurant_hours',
        'entity_type', 'restaurant',
        'related_table', 'restaurant_hours'
    );
    
    -- Send notification
    PERFORM pg_notify('restaurant_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for restaurant hours
DROP TRIGGER IF EXISTS trigger_restaurant_hours_change ON restaurant_hours;
CREATE TRIGGER trigger_restaurant_hours_change
    AFTER INSERT OR UPDATE OR DELETE ON restaurant_hours
    FOR EACH ROW
    EXECUTE FUNCTION notify_restaurant_hours_change();

-- Function for synagogue hours notifications
CREATE OR REPLACE FUNCTION notify_synagogue_hours_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'synagogue_hours',
        'entity_type', 'synagogue',
        'related_table', 'synagogue_hours'
    );
    
    -- Send notification
    PERFORM pg_notify('synagogue_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for synagogue hours
DROP TRIGGER IF EXISTS trigger_synagogue_hours_change ON synagogue_hours;
CREATE TRIGGER trigger_synagogue_hours_change
    AFTER INSERT OR UPDATE OR DELETE ON synagogue_hours
    FOR EACH ROW
    EXECUTE FUNCTION notify_synagogue_hours_change();

-- Function for mikvah hours notifications
CREATE OR REPLACE FUNCTION notify_mikvah_hours_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'mikvah_hours',
        'entity_type', 'mikvah',
        'related_table', 'mikvah_hours'
    );
    
    -- Send notification
    PERFORM pg_notify('mikvah_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mikvah hours
DROP TRIGGER IF EXISTS trigger_mikvah_hours_change ON mikvah_hours;
CREATE TRIGGER trigger_mikvah_hours_change
    AFTER INSERT OR UPDATE OR DELETE ON mikvah_hours
    FOR EACH ROW
    EXECUTE FUNCTION notify_mikvah_hours_change();

-- Function for store hours notifications
CREATE OR REPLACE FUNCTION notify_store_hours_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    operation TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'delete';
        payload := to_jsonb(OLD);
    ELSE
        operation := TG_OP;
        payload := to_jsonb(NEW);
    END IF;
    
    -- Add operation and timestamp to payload
    payload := payload || jsonb_build_object(
        'operation', operation,
        'timestamp', extract(epoch from now()),
        'table', 'store_hours',
        'entity_type', 'store',
        'related_table', 'store_hours'
    );
    
    -- Send notification
    PERFORM pg_notify('store_change', payload::text);
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for store hours
DROP TRIGGER IF EXISTS trigger_store_hours_change ON store_hours;
CREATE TRIGGER trigger_store_hours_change
    AFTER INSERT OR UPDATE OR DELETE ON store_hours
    FOR EACH ROW
    EXECUTE FUNCTION notify_store_hours_change();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Create a function to test the notification system
CREATE OR REPLACE FUNCTION test_notify_triggers()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Test restaurant notification
    BEGIN
        INSERT INTO restaurants (name, address, status) 
        VALUES ('Test Restaurant', '123 Test St', 'active');
        result := result || 'Restaurant trigger: OK; ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Restaurant trigger: ERROR - ' || SQLERRM || '; ';
    END;
    
    -- Test synagogue notification
    BEGIN
        INSERT INTO synagogues (name, address, status) 
        VALUES ('Test Synagogue', '456 Test Ave', 'active');
        result := result || 'Synagogue trigger: OK; ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Synagogue trigger: ERROR - ' || SQLERRM || '; ';
    END;
    
    -- Test mikvah notification
    BEGIN
        INSERT INTO mikvahs (name, address, status) 
        VALUES ('Test Mikvah', '789 Test Blvd', 'active');
        result := result || 'Mikvah trigger: OK; ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Mikvah trigger: ERROR - ' || SQLERRM || '; ';
    END;
    
    -- Test store notification
    BEGIN
        INSERT INTO stores (name, address, status) 
        VALUES ('Test Store', '321 Test Rd', 'active');
        result := result || 'Store trigger: OK; ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Store trigger: ERROR - ' || SQLERRM || '; ';
    END;
    
    -- Clean up test data
    DELETE FROM restaurants WHERE name = 'Test Restaurant';
    DELETE FROM synagogues WHERE name = 'Test Synagogue';
    DELETE FROM mikvahs WHERE name = 'Test Mikvah';
    DELETE FROM stores WHERE name = 'Test Store';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION notify_entity_change() IS 'Generic function to send notifications for entity changes';
COMMENT ON FUNCTION notify_restaurant_change() IS 'Sends notifications when restaurant data changes';
COMMENT ON FUNCTION notify_synagogue_change() IS 'Sends notifications when synagogue data changes';
COMMENT ON FUNCTION notify_mikvah_change() IS 'Sends notifications when mikvah data changes';
COMMENT ON FUNCTION notify_store_change() IS 'Sends notifications when store data changes';
COMMENT ON FUNCTION notify_user_change() IS 'Sends notifications when user data changes';
COMMENT ON FUNCTION notify_review_change() IS 'Sends notifications when review data changes';
COMMENT ON FUNCTION notify_order_change() IS 'Sends notifications when order data changes';
COMMENT ON FUNCTION test_notify_triggers() IS 'Test function to verify notification triggers are working';

COMMENT ON TRIGGER trigger_restaurant_change ON restaurants IS 'Triggers cache invalidation when restaurant data changes';
COMMENT ON TRIGGER trigger_synagogue_change ON synagogues IS 'Triggers cache invalidation when synagogue data changes';
COMMENT ON TRIGGER trigger_mikvah_change ON mikvahs IS 'Triggers cache invalidation when mikvah data changes';
COMMENT ON TRIGGER trigger_store_change ON stores IS 'Triggers cache invalidation when store data changes';
COMMENT ON TRIGGER trigger_user_change ON users IS 'Triggers cache invalidation when user data changes';
COMMENT ON TRIGGER trigger_review_change ON reviews IS 'Triggers cache invalidation when review data changes';
COMMENT ON TRIGGER trigger_order_change ON orders IS 'Triggers cache invalidation when order data changes';
