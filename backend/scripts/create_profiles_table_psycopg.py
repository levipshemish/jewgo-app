#!/usr/bin/env python3
"""Create profiles table using psycopg2 directly."""

import os
import sys

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def create_profiles_table():
    """Create the profiles table and indexes."""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found")
            return False

        print(f"🔗 Connecting to database...")

        # Convert SQLAlchemy URL to psycopg2 format
        pg_url = database_url.replace("postgresql+psycopg://", "postgresql://")

        # Connect to database
        conn = psycopg2.connect(pg_url)
        cursor = conn.cursor()

        print("✅ Connected to database successfully")

        # Check if profiles table already exists
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'profiles'
            );
        """
        )

        if cursor.fetchone()[0]:
            print("✅ Profiles table already exists!")
            cursor.close()
            conn.close()
            return True

        print("📋 Creating profiles table...")

        # Create profiles table
        cursor.execute(
            """
            CREATE TABLE profiles (
                id VARCHAR(50) PRIMARY KEY,
                username VARCHAR(30) UNIQUE NOT NULL,
                display_name VARCHAR(50) NOT NULL,
                bio TEXT,
                location VARCHAR(100),
                website VARCHAR(255),
                phone VARCHAR(20),
                date_of_birth DATE,
                avatar_url VARCHAR(500),
                preferences JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        """
        )

        print("✅ Profiles table created successfully")

        # Create indexes
        print("🔍 Creating indexes...")

        # Index on username for fast lookups
        cursor.execute(
            """
            CREATE INDEX idx_profiles_username ON profiles (username);
        """
        )

        # Case-insensitive index on username for public profile lookups
        cursor.execute(
            """
            CREATE INDEX idx_profiles_username_ci ON profiles (LOWER(username));
        """
        )

        # Index on created_at for sorting
        cursor.execute(
            """
            CREATE INDEX idx_profiles_created_at ON profiles (created_at);
        """
        )

        # Index on updated_at for sorting
        cursor.execute(
            """
            CREATE INDEX idx_profiles_updated_at ON profiles (updated_at);
        """
        )

        print("✅ Indexes created successfully")

        # Add constraints
        print("🔒 Adding constraints...")

        # Username format constraint (alphanumeric, hyphens, underscores, 3-30 chars)
        cursor.execute(
            """
            ALTER TABLE profiles 
            ADD CONSTRAINT chk_username_format 
            CHECK (username ~ '^[a-zA-Z0-9_-]{3,30}$');
        """
        )

        # Display name length constraint
        cursor.execute(
            """
            ALTER TABLE profiles 
            ADD CONSTRAINT chk_display_name_length 
            CHECK (LENGTH(display_name) >= 1 AND LENGTH(display_name) <= 50);
        """
        )

        # Bio length constraint
        cursor.execute(
            """
            ALTER TABLE profiles 
            ADD CONSTRAINT chk_bio_length 
            CHECK (LENGTH(bio) <= 1000);
        """
        )

        print("✅ Constraints added successfully")

        # Create trigger for updated_at
        print("🔄 Creating updated_at trigger...")

        cursor.execute(
            """
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """
        )

        cursor.execute(
            """
            CREATE TRIGGER update_profiles_updated_at 
            BEFORE UPDATE ON profiles 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        """
        )

        print("✅ Updated_at trigger created successfully")

        # Commit the transaction
        conn.commit()

        print("\n🎉 Profiles table setup completed successfully!")

        # Verify the table was created
        cursor.execute(
            """
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            ORDER BY ordinal_position;
        """
        )

        print(f"\n📊 Profiles table structure:")
        for row in cursor.fetchall():
            nullable = "NULL" if row[2] == "YES" else "NOT NULL"
            print(f"   - {row[0]}: {row[1]} ({nullable})")

        # Check indexes
        cursor.execute(
            """
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'profiles';
        """
        )

        print(f"\n🔍 Indexes on profiles table:")
        for row in cursor.fetchall():
            print(f"   - {row[0]}: {row[1][:100]}...")

        # Close connection
        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        if "conn" in locals():
            conn.rollback()
            conn.close()
        return False


if __name__ == "__main__":
    print("🚀 Creating profiles table...")
    success = create_profiles_table()
    if success:
        print("\n✅ Profiles table creation completed successfully")
    else:
        print("\n❌ Profiles table creation failed")
        sys.exit(1)
