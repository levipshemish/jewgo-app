# !/usr/bin/env python3
"""
Create Shtetl Marketplace Table - Direct SQL Migration
=====================================================
Creates a separate shtetl_marketplace table specifically for
Jewish community marketplace items.
"""
import os
import sys
from sqlalchemy import create_engine, text

# Add the parent directory to the path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
from utils.logging_config import get_logger

logger = get_logger(__name__)


class ShtetlTableMigration:
    """Shtetl marketplace table migration."""

    def __init__(self, database_url: str = None):
        """Initialize the migration."""
        self.database_url = database_url or os.getenv("DATABASE_URL")
        self.engine = None
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")

    def connect(self) -> bool:
        """Connect to the database."""
        try:
            logger.info("🔗 Connecting to database...")
            self.engine = create_engine(self.database_url)
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False

    def create_shtetl_marketplace_table(self) -> bool:
        """Create the shtetl_marketplace table."""
        try:
            logger.info("🏛️ Creating shtetl_marketplace table...")
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS shtetl_marketplace (
                -- System fields
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                -- Basic item information
                title VARCHAR(500) NOT NULL,
                description TEXT,
                price_cents INTEGER DEFAULT 0 NOT NULL,
                currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
                -- Location
                city VARCHAR(100) NOT NULL,
                state VARCHAR(50) NOT NULL,
                zip_code VARCHAR(20),
                latitude FLOAT,
                longitude FLOAT,
                -- Categories specific to Jewish community
                category_name VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                -- Images
                thumbnail VARCHAR(2000),
                images TEXT[], -- Array of image URLs
                -- Seller information
                seller_name VARCHAR(255) NOT NULL,
                seller_phone VARCHAR(50),
                seller_email VARCHAR(255),
                seller_user_id VARCHAR(100),
                -- Jewish community features
                kosher_agency VARCHAR(100),
                kosher_level VARCHAR(50),
                kosher_verified BOOLEAN DEFAULT FALSE NOT NULL,
                rabbi_endorsed BOOLEAN DEFAULT FALSE NOT NULL,
                community_verified BOOLEAN DEFAULT FALSE NOT NULL,
                -- Gemach (free loan) features
                is_gemach BOOLEAN DEFAULT FALSE NOT NULL,
                gemach_type VARCHAR(50),
                loan_duration_days INTEGER,
                return_condition VARCHAR(200),
                -- Jewish calendar features
                holiday_category VARCHAR(50),
                seasonal_item BOOLEAN DEFAULT FALSE NOT NULL,
                available_until DATE,
                -- Item metadata
                condition VARCHAR(20) DEFAULT 'good' NOT NULL,
                stock_quantity INTEGER DEFAULT 1 NOT NULL,
                is_available BOOLEAN DEFAULT TRUE NOT NULL,
                is_featured BOOLEAN DEFAULT FALSE NOT NULL,
                -- Community ratings
                rating FLOAT DEFAULT 0.0 NOT NULL,
                review_count INTEGER DEFAULT 0 NOT NULL,
                -- Business logic
                status VARCHAR(20) DEFAULT 'active' NOT NULL,
                transaction_type VARCHAR(20) DEFAULT 'sale' NOT NULL,
                -- Search and discovery
                tags TEXT[],
                keywords VARCHAR(500),
                -- Additional information
                pickup_instructions TEXT,
                notes TEXT,
                contact_preference VARCHAR(20) DEFAULT 'phone' NOT NULL,
                -- Constraints
                CONSTRAINT check_shtetl_price_positive CHECK (price_cents >= 0),
                CONSTRAINT check_shtetl_stock_positive CHECK (stock_quantity >= 0),
                CONSTRAINT check_shtetl_rating_range CHECK (rating >= 0 AND rating <= 5),
                CONSTRAINT check_shtetl_status_valid CHECK (status IN ('active', 'sold', 'loaned', 'inactive', 'pending')),
                CONSTRAINT check_shtetl_condition_valid CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
                CONSTRAINT check_shtetl_transaction_type_valid CHECK (transaction_type IN ('sale', 'gemach', 'trade', 'donation')),
                CONSTRAINT check_shtetl_contact_preference_valid CHECK (contact_preference IN ('phone', 'email', 'whatsapp', 'text'))
            );
            """
            with self.engine.connect() as conn:
                conn.execute(text(create_table_sql))
                conn.commit()
            logger.info("✅ shtetl_marketplace table created successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Error creating shtetl_marketplace table: {e}")
            return False

    def create_indexes(self) -> bool:
        """Create indexes for performance."""
        try:
            logger.info("📊 Creating indexes for shtetl_marketplace...")
            indexes_sql = """
            -- Performance indexes
            CREATE INDEX IF NOT EXISTS idx_shtetl_title ON shtetl_marketplace(title);
            CREATE INDEX IF NOT EXISTS idx_shtetl_category ON shtetl_marketplace(category_name);
            CREATE INDEX IF NOT EXISTS idx_shtetl_subcategory ON shtetl_marketplace(subcategory);
            CREATE INDEX IF NOT EXISTS idx_shtetl_seller_name ON shtetl_marketplace(seller_name);
            CREATE INDEX IF NOT EXISTS idx_shtetl_price ON shtetl_marketplace(price_cents);
            CREATE INDEX IF NOT EXISTS idx_shtetl_status ON shtetl_marketplace(status);
            CREATE INDEX IF NOT EXISTS idx_shtetl_is_gemach ON shtetl_marketplace(is_gemach);
            CREATE INDEX IF NOT EXISTS idx_shtetl_is_featured ON shtetl_marketplace(is_featured);
            CREATE INDEX IF NOT EXISTS idx_shtetl_kosher_agency ON shtetl_marketplace(kosher_agency);
            CREATE INDEX IF NOT EXISTS idx_shtetl_community_verified ON shtetl_marketplace(community_verified);
            CREATE INDEX IF NOT EXISTS idx_shtetl_created_at ON shtetl_marketplace(created_at);
            CREATE INDEX IF NOT EXISTS idx_shtetl_location ON shtetl_marketplace(city, state);
            CREATE INDEX IF NOT EXISTS idx_shtetl_holiday_category ON shtetl_marketplace(holiday_category);
            CREATE INDEX IF NOT EXISTS idx_shtetl_transaction_type ON shtetl_marketplace(transaction_type);
            """
            with self.engine.connect() as conn:
                conn.execute(text(indexes_sql))
                conn.commit()
            logger.info("✅ Indexes created successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Error creating indexes: {e}")
            return False

    def run(self):
        """Run the shtetl table migration."""
        logger.info("🏛️ Starting Shtetl Marketplace Table Creation...")
        if not self.connect():
            logger.error("❌ Failed to connect to database")
            return False
        # Create table
        if not self.create_shtetl_marketplace_table():
            logger.error("❌ Failed to create shtetl_marketplace table")
            return False
        # Create indexes
        if not self.create_indexes():
            logger.error("❌ Failed to create indexes")
            return False
        logger.info("🎉 Shtetl marketplace table creation completed successfully!")
        logger.info("")
        logger.info("📋 Next steps:")
        logger.info("1. Create shtetl-specific backend API endpoints")
        logger.info("2. Update frontend to use separate shtetl API")
        logger.info("3. Add shtetl community data")
        logger.info("4. Test shtetl marketplace functionality")
        return True


if __name__ == "__main__":
    migration = ShtetlTableMigration()
    migration.run()
