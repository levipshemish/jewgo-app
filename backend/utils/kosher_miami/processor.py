import json
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

#!/usr/bin/env python3
"""Kosher Miami Processor.

Data processing, filtering, and analysis functionality for kosher establishment data.
"""


class KosherMiamiProcessor:
    """Processor for kosher establishment data."""

    def __init__(self, data_dir: str = "data") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

    def load_data(self, file_path: str) -> list[dict]:
        """Load data from JSON file."""
        try:
            with open(file_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            msg = f"Failed to load data from {file_path}: {e}"
            raise Exception(msg)

    def parse_html_data(self, html_file_path: str) -> list[dict]:
        """Parse data from HTML table file."""
        try:
            with open(html_file_path, encoding="utf-8") as f:
                soup = BeautifulSoup(f.read(), "html.parser")

            table = soup.find("table")
            if not table:
                msg = "No table found in HTML file"
                raise ValueError(msg)

            restaurants = []
            rows = table.find_all("tr")[1:]  # Skip header row

            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 6:
                    restaurant = {
                        "name": cells[0].get_text(strip=True),
                        "type": cells[1].get_text(strip=True),
                        "area": cells[2].get_text(strip=True),
                        "address": cells[3].get_text(strip=True),
                        "phone": cells[4].get_text(strip=True),
                        "certifying_agency": cells[5].get_text(strip=True),
                    }
                    restaurants.append(restaurant)

            return restaurants

        except Exception as e:
            msg = f"Failed to parse HTML data: {e}"
            raise Exception(msg)

    def should_ignore_restaurant(self, restaurant_type: str) -> bool:
        """Check if restaurant should be ignored based on type."""
        ignore_types = ["Catering", "Grocery", "Butcher", "Bakery"]
        return restaurant_type in ignore_types

    def determine_kosher_type(self, restaurant_type: str) -> str | None:
        """Determine kosher type based on business type with special rules."""
        if self.should_ignore_restaurant(restaurant_type):
            return None

        # Handle mixed categories
        if restaurant_type == "Pareve, Bakery":
            return "Pareve"
        if restaurant_type in {"Pareve, Dairy", "Dairy, Bakery"}:
            return "Dairy"
        if restaurant_type == "Meat, Bakery":
            return "Meat"

        # Single types
        valid_types = ["Dairy", "Meat", "Pareve"]
        if restaurant_type in valid_types:
            return restaurant_type

        return None

    def normalize_restaurant_data(self, restaurant: dict) -> dict:
        """Normalize restaurant data to handle different field name formats."""
        normalized = {}

        # Map capitalized field names to lowercase
        field_mapping = {
            "Name": "name",
            "Type": "type",
            "Area": "area",
            "Address": "address",
            "Phone": "phone",
            "Cholov Yisroel": "cholov_yisroel",
            "Pas Yisroel": "pas_yisroel",
            "Yoshon": "yoshon",
            "Bishul Yisroel Tuna": "bishul_yisroel_tuna",
        }

        for old_key, new_key in field_mapping.items():
            if old_key in restaurant:
                normalized[new_key] = restaurant[old_key]
            elif new_key in restaurant:
                normalized[new_key] = restaurant[new_key]

        return normalized

    def parse_certifications(self, cert_text: str) -> dict:
        """Parse kosher certifications from text."""
        cert_text = cert_text.lower()
        return {
            "is_cholov_yisroel": "cholov yisroel" in cert_text,
            "is_pas_yisroel": "pas yisroel" in cert_text,
            "is_yoshon": "yoshon" in cert_text,
            "is_bishul_yisroel_tuna": "bishul yisroel" in cert_text,
        }

    def filter_restaurants(self, restaurants: list[dict]) -> dict[str, list[dict]]:
        """Filter restaurants based on business type rules.

        Returns:
            Dictionary with 'importable' and 'filtered_out' lists

        """
        importable = []
        filtered_out = []

        for restaurant in restaurants:
            restaurant_type = restaurant.get("type", "")
            kosher_type = self.determine_kosher_type(restaurant_type)

            if kosher_type is None:
                filtered_out.append(restaurant)
            else:
                restaurant["kosher_type"] = kosher_type
                importable.append(restaurant)

        return {
            "importable": importable,
            "filtered_out": filtered_out,
        }

    def analyze_data(self, restaurants: list[dict]) -> dict:
        """Analyze restaurant data and generate statistics."""
        if not restaurants:
            return {}

        # Count by type
        type_counts = {}
        area_counts = {}

        for restaurant in restaurants:
            restaurant_type = restaurant.get("type", "Unknown")
            area = restaurant.get("area", "Unknown")

            type_counts[restaurant_type] = type_counts.get(restaurant_type, 0) + 1
            area_counts[area] = area_counts.get(area, 0) + 1

        return {
            "total_restaurants": len(restaurants),
            "type_breakdown": type_counts,
            "area_breakdown": area_counts,
            "analysis_date": datetime.now().isoformat(),
        }

    def export_analysis(self, analysis: dict, output_file: str) -> None:
        """Export analysis results to JSON file."""
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(analysis, f, indent=2, ensure_ascii=False)
        except Exception as e:
            pass

    def generate_summary_report(self, restaurants: list[dict]) -> str:
        """Generate a text summary report."""
        analysis = self.analyze_data(restaurants)

        report = []
        report.append("=" * 60)
        report.append("🍽️ KOSHER MIAMI DATA ANALYSIS")
        report.append("=" * 60)
        report.append(
            f"📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        report.append(f"📊 Total Restaurants: {analysis['total_restaurants']}")
        report.append("")

        # Type breakdown
        report.append("📋 BREAKDOWN BY TYPE:")
        report.append("-" * 30)
        for restaurant_type, count in sorted(analysis["type_breakdown"].items()):
            report.append(f"   {restaurant_type}: {count} restaurants")
        report.append("")

        # Area breakdown
        report.append("📍 BREAKDOWN BY AREA:")
        report.append("-" * 30)
        for area, count in sorted(analysis["area_breakdown"].items()):
            report.append(f"   {area}: {count} restaurants")

        return "\n".join(report)


def main() -> None:
    """Test function for the processor."""
    processor = KosherMiamiProcessor()

    # Example usage
    sample_data = [
        {"name": "Test Restaurant", "type": "Dairy", "area": "Miami Beach"},
        {"name": "Test Bakery", "type": "Bakery", "area": "Aventura"},
    ]

    filtered = processor.filter_restaurants(sample_data)
    analysis = processor.analyze_data(sample_data)


if __name__ == "__main__":
    main()
