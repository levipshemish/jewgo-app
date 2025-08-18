#!/usr/bin/env python3
"""Import Kosher Miami CSV into restaurants table.

Usage:
  python scripts/maintenance/import_km_csv.py /absolute/path/to/kosher_miami_establishments.csv

Requirements:
  - DATABASE_URL must be set in the environment
  - Uses backend EnhancedDatabaseManager via sys.path injection
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from typing import Any, Dict, Optional


def determine_kosher_category(business_type: str) -> Optional[str]:
    """Map KM Type to one of meat/dairy/pareve; return None to skip non-eateries.

    Rules:
      - If type contains 'Meat' -> meat
      - Else if contains 'Dairy' -> dairy
      - Else if contains 'Pareve' -> pareve
      - Skip if contains Catering, Grocery, Butcher, Bakery, Commercial, Wholesale, Misc
    """
    if not business_type:
        return None

    t = business_type.strip()
    # Exclude non-restaurant categories
    exclude_tokens = [
        "Catering",
        "Grocery",
        "Butcher",
        "Bakery",
        "Commercial",
        "Wholesale",
        "Misc",
    ]
    if any(tok.lower() in t.lower() for tok in exclude_tokens):
        return None

    if "Meat" in t:
        return "meat"
    if "Dairy" in t:
        return "dairy"
    if "Pareve" in t or "Parev" in t:
        return "pareve"

    return None


def parse_bool_from_text(value: str) -> bool:
    """Return True if the CSV text indicates a positive/available flag."""
    if not value:
        return False
    v = value.strip().lower()
    return any(tok in v for tok in ["all items", "available", "products baked on premises", "yes"]) and not v.startswith("no")


def build_restaurant_record(row: Dict[str, str]) -> Optional[Dict[str, Any]]:
    name = (row.get("Name") or "").strip()
    business_type = (row.get("Type") or "").strip()
    area = (row.get("Area") or "").strip()
    address = (row.get("Address") or "").strip()
    phone = (row.get("Phone") or "").strip()
    cholov_text = (row.get("Cholov Yisroel") or "").strip()
    pas_text = (row.get("Pas Yisroel") or "").strip()

    category = determine_kosher_category(business_type)
    if not name or not category:
        return None

    # Required fields fallbacks
    city = area if area else "City not provided"
    state = "FL"
    zip_code = "00000"
    address_val = address if address else "Address not provided"
    phone_number = phone if phone else "Phone not provided"

    is_cholov_yisroel = category == "dairy" and parse_bool_from_text(cholov_text)
    is_pas_yisroel = parse_bool_from_text(pas_text)
    cholov_stam = category == "dairy" and not is_cholov_yisroel

    return {
        "name": name,
        "address": address_val,
        "city": city,
        "state": state,
        "zip_code": zip_code,
        "phone_number": phone_number,
        "kosher_category": category,
        "listing_type": "restaurant",
        "certifying_agency": "Kosher Miami",
        "is_cholov_yisroel": is_cholov_yisroel,
        "is_pas_yisroel": is_pas_yisroel,
        "cholov_stam": cholov_stam,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Import KM CSV into restaurants table")
    parser.add_argument("csv_file", help="Path to kosher_miami_establishments.csv")
    args = parser.parse_args()

    csv_path = os.path.abspath(args.csv_file)
    if not os.path.exists(csv_path):
        print(f"error: file not found -> {csv_path}")
        return 2

    # Ensure DATABASE_URL is present
    if not os.environ.get("DATABASE_URL"):
        print("error: DATABASE_URL is not set in environment")
        return 3

    # Add backend to import path
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
    # If running from project root, adjust path to actual backend dir
    if not os.path.exists(backend_path) or not os.path.isdir(backend_path):
        backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
    sys.path.append(backend_path)

    try:
        from backend.database.database_manager_v3 import EnhancedDatabaseManager  # type: ignore
    except Exception as e:  # pragma: no cover
        print(f"error: failed to import EnhancedDatabaseManager: {e}")
        return 4

    db = EnhancedDatabaseManager(os.environ.get("DATABASE_URL"))
    if not db.connect():
        print("error: failed to connect to database")
        return 5

    total = 0
    inserted = 0
    updated = 0
    skipped = 0
    failed = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            record = build_restaurant_record(row)
            if not record:
                skipped += 1
                continue

            try:
                result = db.upsert_restaurant(record)
                action = result.get("action")
                if action == "inserted":
                    inserted += 1
                elif action == "updated":
                    updated += 1
                else:
                    failed += 1
            except Exception:
                failed += 1

    print(
        "| import_summary |",
        {
            "total": total,
            "inserted": inserted,
            "updated": updated,
            "skipped": skipped,
            "failed": failed,
        },
    )

    try:
        db.close()
    except Exception:
        pass

    return 0 if failed == 0 else 6


if __name__ == "__main__":
    raise SystemExit(main())


