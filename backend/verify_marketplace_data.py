#!/usr/bin/env python3
"""Verify and display marketplace data."""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def verify_marketplace_data():
    """Verify and display marketplace data."""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url.startswith('postgresql+psycopg://'):
        database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM marketplace")
        total_count = cursor.fetchone()[0]
        
        print(f"📊 TOTAL MARKETPLACE LISTINGS: {total_count}")
        print("=" * 80)
        
        # Get category breakdown
        cursor.execute("SELECT category, COUNT(*) FROM marketplace GROUP BY category ORDER BY COUNT(*) DESC")
        category_counts = cursor.fetchall()
        
        print("\n📈 CATEGORY BREAKDOWN:")
        print("-" * 40)
        for category, count in category_counts:
            print(f"   {category}: {count} listings")
        
        # Get sample listings by category
        cursor.execute("""
            SELECT title, price, category, vendor_name, is_featured, is_on_sale, kosher_agency 
            FROM marketplace 
            ORDER BY category, title
        """)
        listings = cursor.fetchall()
        
        print("\n📋 DETAILED LISTINGS BY CATEGORY:")
        print("=" * 80)
        
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
    verify_marketplace_data()
