#!/usr/bin/env python3
"""Merge and clean marketplace data - remove duplicates and ensure data integrity."""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def merge_marketplace_data():
    """Merge and clean marketplace data, removing duplicates."""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url.startswith('postgresql+psycopg://'):
        database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("🔍 Analyzing existing marketplace data...")
        
        # Check current data
        cursor.execute("SELECT COUNT(*) FROM marketplace")
        total_listings = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM categories")
        total_categories = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM subcategories")
        total_subcategories = cursor.fetchone()[0]
        
        print(f"📊 Current data:")
        print(f"   Marketplace listings: {total_listings}")
        print(f"   Categories: {total_categories}")
        print(f"   Subcategories: {total_subcategories}")
        
        # Check for duplicate marketplace listings
        cursor.execute("""
            SELECT title, vendor_name, COUNT(*) 
            FROM marketplace 
            GROUP BY title, vendor_name 
            HAVING COUNT(*) > 1
        """)
        duplicates = cursor.fetchall()
        
        if duplicates:
            print(f"\n⚠️  Found {len(duplicates)} duplicate listings:")
            for title, vendor, count in duplicates:
                print(f"   - {title} by {vendor} ({count} times)")
            
            # Remove duplicates, keeping the most recent one
            print("\n🧹 Removing duplicate listings...")
            cursor.execute("""
                DELETE FROM marketplace 
                WHERE id NOT IN (
                    SELECT MAX(id) 
                    FROM marketplace 
                    GROUP BY title, vendor_name
                )
            """)
            deleted_count = cursor.rowcount
            print(f"   Removed {deleted_count} duplicate listings")
        else:
            print("\n✅ No duplicate listings found")
        
        # Check for duplicate categories
        cursor.execute("""
            SELECT name, COUNT(*) 
            FROM categories 
            GROUP BY name 
            HAVING COUNT(*) > 1
        """)
        duplicate_categories = cursor.fetchall()
        
        if duplicate_categories:
            print(f"\n⚠️  Found {len(duplicate_categories)} duplicate categories:")
            for name, count in duplicate_categories:
                print(f"   - {name} ({count} times)")
            
            # Remove duplicate categories, keeping the one with highest product_count
            print("\n🧹 Removing duplicate categories...")
            cursor.execute("""
                DELETE FROM categories 
                WHERE id NOT IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY product_count DESC, id DESC) as rn
                        FROM categories
                    ) t WHERE rn = 1
                )
            """)
            deleted_categories = cursor.rowcount
            print(f"   Removed {deleted_categories} duplicate categories")
        else:
            print("\n✅ No duplicate categories found")
        
        # Update product counts in categories
        print("\n📈 Updating product counts in categories...")
        cursor.execute("""
            UPDATE categories 
            SET product_count = (
                SELECT COUNT(*) 
                FROM marketplace 
                WHERE marketplace.category = categories.name
            )
        """)
        updated_categories = cursor.rowcount
        print(f"   Updated {updated_categories} categories")
        
        # Commit changes
        conn.commit()
        
        # Final verification
        cursor.execute("SELECT COUNT(*) FROM marketplace")
        final_listings = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM categories")
        final_categories = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM subcategories")
        final_subcategories = cursor.fetchone()[0]
        
        print(f"\n✅ Final data after cleanup:")
        print(f"   Marketplace listings: {final_listings}")
        print(f"   Categories: {final_categories}")
        print(f"   Subcategories: {final_subcategories}")
        
        # Show category breakdown
        cursor.execute("""
            SELECT c.name, c.product_count, c.color 
            FROM categories c 
            ORDER BY c.sort_order
        """)
        categories = cursor.fetchall()
        
        print(f"\n📂 Category breakdown:")
        print("-" * 50)
        for name, count, color in categories:
            print(f"🏷️  {name} - {count} products - {color}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def show_marketplace_summary():
    """Show a summary of the current marketplace data."""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url.startswith('postgresql+psycopg://'):
        database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("\n📋 MARKETPLACE DATA SUMMARY")
        print("=" * 60)
        
        # Get total counts
        cursor.execute("SELECT COUNT(*) FROM marketplace")
        total_listings = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM categories")
        total_categories = cursor.fetchone()[0]
        
        print(f"📊 Total Listings: {total_listings}")
        print(f"📂 Total Categories: {total_categories}")
        
        # Get sample listings by category
        cursor.execute("""
            SELECT m.title, m.price, m.category, m.vendor_name, m.is_featured, m.is_on_sale, m.kosher_agency 
            FROM marketplace m 
            ORDER BY m.category, m.title
        """)
        listings = cursor.fetchall()
        
        current_category = ""
        for listing in listings:
            title, price, category, vendor, featured, sale, kosher = listing
            
            if category != current_category:
                current_category = category
                print(f"\n🏷️  {current_category.upper()}:")
                print("-" * 40)
            
            # Format price
            if price == 0:
                price_str = "FREE"
            else:
                price_str = f"${price:,.2f}"
            
            # Add indicators
            indicators = []
            if featured:
                indicators.append("⭐")
            if sale:
                indicators.append("🔥")
            if kosher and kosher != "N/A":
                indicators.append("✓")
            
            indicator_str = " ".join(indicators)
            
            print(f"{indicator_str} {title}")
            print(f"   💰 {price_str} | 👤 {vendor}")
            if kosher and kosher != "N/A":
                print(f"   🕎 Kosher: {kosher}")
            print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    print("🔄 Merging and cleaning marketplace data...")
    success = merge_marketplace_data()
    if success:
        print("✅ Marketplace data merged and cleaned successfully!")
        show_marketplace_summary()
    else:
        print("❌ Failed to merge marketplace data")
