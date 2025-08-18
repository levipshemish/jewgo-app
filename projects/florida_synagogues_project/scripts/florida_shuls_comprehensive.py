#!/usr/bin/env python3
"""
Comprehensive Florida Shuls Data Collection and Enhancement Script

This script provides multiple approaches to collect and enhance Florida synagogue data:
1. Basic scraping from GoDaven.com
2. Data enrichment and analysis
3. Export to multiple formats
4. Summary statistics and insights

Usage:
    python florida_shuls_comprehensive.py --mode [basic|enhanced|full|enrich]
"""

import sys
import os
import csv
import json
import time
import argparse
from datetime import datetime

# Import our scraping modules
from fl_shuls_scraper import (
    get_florida_localities,
    get_shuls_from_city,
    parse_shul_details,
)


def run_basic_scraper():
    """Run the basic scraper to get fundamental data"""
    print("🔍 Running Basic Florida Shuls Scraper")
    print("=" * 50)

    all_data = []
    localities = get_florida_localities()
    print(f"[+] Found {len(localities)} FL localities.")

    for i, (city, city_url) in enumerate(localities, 1):
        print(f"[{i}/{len(localities)}] Processing {city}")
        shuls = get_shuls_from_city(city, city_url)
        print(f"    Found {len(shuls)} shuls in {city}")

        for j, (city, shul_id, slug, url) in enumerate(shuls, 1):
            print(f"      [{j}/{len(shuls)}] Processing: {slug}")
            data = parse_shul_details(city, shul_id, slug, url)
            if data:
                all_data.append(data)
                print(f"        ✓ {data['Name']}")
            else:
                print(f"        ✗ Failed to parse {slug}")
            time.sleep(1)  # Be polite to the server

    return all_data


def enrich_data(data):
    """Enrich the scraped data with additional analysis"""
    print("\n🔧 Enriching Data with Additional Analysis")
    print("=" * 50)

    enriched_data = []

    for i, shul in enumerate(data, 1):
        print(f"Enriching {i}/{len(data)}: {shul.get('Name', 'Unknown')}")

        enriched = shul.copy()

        # Add data quality metrics
        enriched["Data_Quality_Score"] = 0
        if shul.get("Name"):
            enriched["Data_Quality_Score"] += 1
        if shul.get("Address"):
            enriched["Data_Quality_Score"] += 1
        if shul.get("Rabbi"):
            enriched["Data_Quality_Score"] += 1
        if shul.get("Phone"):
            enriched["Data_Quality_Score"] += 1
        if shul.get("Email"):
            enriched["Data_Quality_Score"] += 1
        if shul.get("Website"):
            enriched["Data_Quality_Score"] += 1

        # Add categorization
        name_lower = shul.get("Name", "").lower()
        enriched["Is_Chabad"] = (
            "Yes"
            if any(word in name_lower for word in ["chabad", "lubavitch"])
            else "No"
        )
        enriched["Is_Young_Israel"] = "Yes" if "young israel" in name_lower else "No"
        enriched["Is_Sephardic"] = (
            "Yes"
            if any(word in name_lower for word in ["sephardic", "sefardi"])
            else "No"
        )

        # Add location analysis
        address = shul.get("Address", "")
        if address:
            enriched["Has_Address"] = "Yes"
            # Extract state and zip code
            if "FL" in address:
                enriched["State"] = "FL"
            if any(char.isdigit() for char in address[-5:]):
                enriched["Has_Zip"] = "Yes"
            else:
                enriched["Has_Zip"] = "No"
        else:
            enriched["Has_Address"] = "No"
            enriched["State"] = ""
            enriched["Has_Zip"] = "No"

        enriched_data.append(enriched)

    return enriched_data


def save_data(data, filename_prefix, mode="csv"):
    """Save data to file(s)"""
    os.makedirs("data", exist_ok=True)

    if mode in ["csv", "both"]:
        csv_filename = f"data/{filename_prefix}.csv"
        fieldnames = data[0].keys() if data else []

        with open(csv_filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)

        print(f"✓ CSV data saved to '{csv_filename}'")

    if mode in ["json", "both"]:
        json_filename = f"data/{filename_prefix}.json"
        with open(json_filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"✓ JSON data saved to '{json_filename}'")


def generate_summary_report(data):
    """Generate a comprehensive summary report"""
    print("\n📊 Generating Summary Report")
    print("=" * 50)

    total_shuls = len(data)
    print(f"Total Shuls: {total_shuls}")

    # Affiliation breakdown
    affiliations = {}
    for shul in data:
        aff = shul.get("Affiliation", "Unknown")
        affiliations[aff] = affiliations.get(aff, 0) + 1

    print(f"\nAffiliation Breakdown:")
    for aff, count in sorted(affiliations.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_shuls) * 100
        print(f"  {aff}: {count} ({percentage:.1f}%)")

    # City breakdown
    cities = {}
    for shul in data:
        city = shul.get("City", "Unknown")
        cities[city] = cities.get(city, 0) + 1

    print(f"\nTop 10 Cities:")
    for city, count in sorted(cities.items(), key=lambda x: x[1], reverse=True)[:10]:
        percentage = (count / total_shuls) * 100
        print(f"  {city}: {count} ({percentage:.1f}%)")

    # Data quality analysis
    quality_scores = {}
    for shul in data:
        score = shul.get("Data_Quality_Score", 0)
        quality_scores[score] = quality_scores.get(score, 0) + 1

    print(f"\nData Quality Distribution:")
    for score in sorted(quality_scores.keys()):
        count = quality_scores[score]
        percentage = (count / total_shuls) * 100
        print(f"  Score {score}: {count} shuls ({percentage:.1f}%)")

    # Contact information availability
    shuls_with_phone = sum(1 for s in data if s.get("Phone"))
    shuls_with_email = sum(1 for s in data if s.get("Email"))
    shuls_with_website = sum(1 for s in data if s.get("Website"))
    shuls_with_address = sum(1 for s in data if s.get("Address"))
    shuls_with_rabbi = sum(1 for s in data if s.get("Rabbi"))

    print(f"\nContact Information Availability:")
    print(f"  Phone: {shuls_with_phone} ({shuls_with_phone/total_shuls*100:.1f}%)")
    print(f"  Email: {shuls_with_email} ({shuls_with_email/total_shuls*100:.1f}%)")
    print(
        f"  Website: {shuls_with_website} ({shuls_with_website/total_shuls*100:.1f}%)"
    )
    print(
        f"  Address: {shuls_with_address} ({shuls_with_address/total_shuls*100:.1f}%)"
    )
    print(f"  Rabbi: {shuls_with_rabbi} ({shuls_with_rabbi/total_shuls*100:.1f}%)")

    # Special categories
    chabad_count = sum(1 for s in data if s.get("Is_Chabad") == "Yes")
    young_israel_count = sum(1 for s in data if s.get("Is_Young_Israel") == "Yes")
    sephardic_count = sum(1 for s in data if s.get("Is_Sephardic") == "Yes")

    print(f"\nSpecial Categories:")
    print(f"  Chabad: {chabad_count} ({chabad_count/total_shuls*100:.1f}%)")
    print(
        f"  Young Israel: {young_israel_count} ({young_israel_count/total_shuls*100:.1f}%)"
    )
    print(f"  Sephardic: {sephardic_count} ({sephardic_count/total_shuls*100:.1f}%)")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Comprehensive Florida Shuls Data Collection"
    )
    parser.add_argument(
        "--mode",
        choices=["basic", "enhanced", "full", "enrich"],
        default="basic",
        help="Scraping mode",
    )
    parser.add_argument(
        "--output",
        choices=["csv", "json", "both"],
        default="both",
        help="Output format",
    )
    parser.add_argument(
        "--max", type=int, help="Maximum number of shuls to process (for testing)"
    )

    args = parser.parse_args()

    print("🏛️  Florida Shuls Data Collection System")
    print("=" * 60)
    print(f"Mode: {args.mode}")
    print(f"Output: {args.output}")
    if args.max:
        print(f"Max shuls: {args.max}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    if args.mode in ["basic", "enhanced", "full"]:
        # Run the scraper
        data = run_basic_scraper()

        if args.max and len(data) > args.max:
            data = data[: args.max]
            print(f"\n⚠️  Limited to {args.max} shuls for testing")

        if args.mode in ["enhanced", "full"]:
            # Enrich the data
            data = enrich_data(data)

        # Save the data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename_prefix = f"florida_shuls_{args.mode}_{timestamp}"
        save_data(data, filename_prefix, args.output)

        # Generate summary report
        generate_summary_report(data)

        print(f"\n✅ Completed! Processed {len(data)} shuls.")

    elif args.mode == "enrich":
        # Load existing data and enrich it
        print("Loading existing data...")
        data = []
        if os.path.exists("florida_shuls_full.csv"):
            with open("florida_shuls_full.csv", "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                data = list(reader)

        if data:
            enriched_data = enrich_data(data)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename_prefix = f"florida_shuls_enriched_{timestamp}"
            save_data(enriched_data, filename_prefix, args.output)
            generate_summary_report(enriched_data)
            print(f"\n✅ Enrichment completed! Processed {len(enriched_data)} shuls.")
        else:
            print("❌ No existing data found. Please run basic scraper first.")


if __name__ == "__main__":
    main()
