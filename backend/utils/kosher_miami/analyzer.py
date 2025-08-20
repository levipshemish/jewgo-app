import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .processor import KosherMiamiProcessor

#!/usr/bin/env python3
"""Kosher Miami Analyzer.

Comprehensive data analysis and reporting functionality for kosher establishment data.
"""


class KosherMiamiAnalyzer:
    """Analyzer for kosher establishment data."""

    def __init__(self, data_dir: str = "data") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.processor = KosherMiamiProcessor(data_dir)

    def analyze_filtering_rules(self, restaurants: list[dict]) -> dict:
        """Analyze data with filtering rules to show what will be imported vs filtered out."""
        all_data = []
        importable_data = []
        filtered_out_data = []

        for restaurant in restaurants:
            # Normalize the restaurant data
            normalized_restaurant = self.processor.normalize_restaurant_data(restaurant)
            restaurant_type = normalized_restaurant.get("type", "")
            kosher_type = self.processor.determine_kosher_type(restaurant_type)

            restaurant_copy = normalized_restaurant.copy()
            restaurant_copy["kosher_type"] = kosher_type

            all_data.append(restaurant_copy)

            if kosher_type is None:
                filtered_out_data.append(restaurant_copy)
            else:
                importable_data.append(restaurant_copy)

        return {
            "total": len(all_data),
            "importable": len(importable_data),
            "filtered_out": len(filtered_out_data),
            "importable_data": importable_data,
            "filtered_out_data": filtered_out_data,
        }

    def generate_filtering_report(self, analysis: dict) -> str:
        """Generate comprehensive filtering analysis report."""
        report = []
        report.append("=" * 80)
        report.append("🔍 KOSHER MIAMI DATA ANALYSIS - FILTERING RULES")
        report.append("=" * 80)
        report.append(
            f"📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        report.append("")

        # Summary statistics
        report.append("📊 SUMMARY STATISTICS")
        report.append("-" * 40)
        report.append(f"📋 Total restaurants found: {analysis['total']}")
        report.append(f"✅ Will be imported: {analysis['importable']}")
        report.append(f"❌ Will be filtered out: {analysis['filtered_out']}")
        report.append(
            f"📈 Import rate: {(analysis['importable']/analysis['total']*100):.1f}%",
        )
        report.append("")

        # Breakdown by kosher type for importable data
        kosher_type_counts = {}
        for restaurant in analysis["importable_data"]:
            kosher_type = restaurant["kosher_type"]
            kosher_type_counts[kosher_type] = kosher_type_counts.get(kosher_type, 0) + 1

        report.append("🍽️ IMPORTABLE RESTAURANTS BY KOSHER TYPE")
        report.append("-" * 40)
        for kosher_type, count in sorted(kosher_type_counts.items()):
            report.append(f"   {kosher_type}: {count} restaurants")
        report.append("")

        # Breakdown by original type for filtered out data
        original_type_counts = {}
        for restaurant in analysis["filtered_out_data"]:
            original_type = restaurant.get("type", "Unknown")
            original_type_counts[original_type] = (
                original_type_counts.get(original_type, 0) + 1
            )

        report.append("🚫 FILTERED OUT RESTAURANTS BY ORIGINAL TYPE")
        report.append("-" * 40)
        for original_type, count in sorted(original_type_counts.items()):
            report.append(f"   {original_type}: {count} restaurants")
        report.append("")

        # Show importable restaurants
        report.append("✅ RESTAURANTS TO BE IMPORTED")
        report.append("-" * 40)
        for i, restaurant in enumerate(analysis["importable_data"], 1):
            report.append(f"{i:3d}. {restaurant['name']}")
            report.append(
                f"     Type: {restaurant.get('type', 'N/A')} → {restaurant['kosher_type']}",
            )
            report.append(f"     Area: {restaurant.get('area', 'N/A')}")
            report.append(f"     Address: {restaurant.get('address', 'N/A')}")
            report.append("")

        # Show filtered out restaurants
        report.append("❌ RESTAURANTS TO BE FILTERED OUT")
        report.append("-" * 40)
        for i, restaurant in enumerate(analysis["filtered_out_data"], 1):
            report.append(f"{i:3d}. {restaurant['name']}")
            report.append(
                f"     Type: {restaurant.get('type', 'N/A')} → {restaurant['kosher_type']}",
            )
            report.append(f"     Area: {restaurant.get('area', 'N/A')}")
            report.append("")

        return "\n".join(report)

    def export_analysis_files(
        self,
        analysis: dict,
        timestamp: str | None = None,
    ) -> dict[str, str]:
        """Export analysis results to JSON files."""
        if timestamp is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Export importable data
        importable_file = self.data_dir / f"kosher_miami_importable_{timestamp}.json"
        with open(importable_file, "w", encoding="utf-8") as f:
            json.dump(analysis["importable_data"], f, indent=2, ensure_ascii=False)

        # Export filtered out data
        filtered_file = self.data_dir / f"kosher_miami_filtered_out_{timestamp}.json"
        with open(filtered_file, "w", encoding="utf-8") as f:
            json.dump(analysis["filtered_out_data"], f, indent=2, ensure_ascii=False)

        return {
            "importable": str(importable_file),
            "filtered_out": str(filtered_file),
        }

    def analyze_geographic_distribution(self, restaurants: list[dict]) -> dict:
        """Analyze geographic distribution of restaurants."""
        area_counts = {}
        city_counts = {}

        for restaurant in restaurants:
            area = restaurant.get("area", "Unknown")
            city = restaurant.get("city", "Unknown")

            area_counts[area] = area_counts.get(area, 0) + 1
            city_counts[city] = city_counts.get(city, 0) + 1

        return {
            "area_distribution": area_counts,
            "city_distribution": city_counts,
            "total_areas": len(area_counts),
            "total_cities": len(city_counts),
        }

    def analyze_certification_patterns(self, restaurants: list[dict]) -> dict:
        """Analyze kosher certification patterns."""
        cert_stats = {
            "cholov_yisroel": 0,
            "pas_yisroel": 0,
            "yoshon": 0,
            "bishul_yisroel_tuna": 0,
        }

        for restaurant in restaurants:
            cert_text = restaurant.get("certifying_agency", "").lower()

            if "cholov yisroel" in cert_text:
                cert_stats["cholov_yisroel"] += 1
            if "pas yisroel" in cert_text:
                cert_stats["pas_yisroel"] += 1
            if "yoshon" in cert_text:
                cert_stats["yoshon"] += 1
            if "bishul yisroel" in cert_text:
                cert_stats["bishul_yisroel_tuna"] += 1

        return cert_stats

    def generate_comprehensive_report(self, restaurants: list[dict]) -> str:
        """Generate a comprehensive analysis report."""
        # Basic analysis
        basic_analysis = self.processor.analyze_data(restaurants)

        # Filtering analysis
        filtering_analysis = self.analyze_filtering_rules(restaurants)

        # Geographic analysis
        geo_analysis = self.analyze_geographic_distribution(restaurants)

        # Certification analysis
        cert_analysis = self.analyze_certification_patterns(restaurants)

        # Generate report
        report = []
        report.append("=" * 80)
        report.append("🍽️ KOSHER MIAMI COMPREHENSIVE DATA ANALYSIS")
        report.append("=" * 80)
        report.append(
            f"📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        report.append("")

        # Basic statistics
        report.append("📊 BASIC STATISTICS")
        report.append("-" * 40)
        report.append(f"📋 Total Restaurants: {basic_analysis['total_restaurants']}")
        report.append(f"✅ Importable: {filtering_analysis['importable']}")
        report.append(f"❌ Filtered Out: {filtering_analysis['filtered_out']}")
        report.append(
            f"📈 Import Rate: {(filtering_analysis['importable']/filtering_analysis['total']*100):.1f}%",
        )
        report.append("")

        # Type breakdown
        report.append("📋 TYPE BREAKDOWN")
        report.append("-" * 40)
        for restaurant_type, count in sorted(basic_analysis["type_breakdown"].items()):
            report.append(f"   {restaurant_type}: {count} restaurants")
        report.append("")

        # Geographic breakdown
        report.append("📍 GEOGRAPHIC DISTRIBUTION")
        report.append("-" * 40)
        for area, count in sorted(geo_analysis["area_distribution"].items()):
            report.append(f"   {area}: {count} restaurants")
        report.append("")

        # Certification patterns
        report.append("🧼 KOSHER CERTIFICATION PATTERNS")
        report.append("-" * 40)
        report.append(
            f"   Cholov Yisroel: {cert_analysis['cholov_yisroel']} restaurants",
        )
        report.append(f"   Pas Yisroel: {cert_analysis['pas_yisroel']} restaurants")
        report.append(f"   Yoshon: {cert_analysis['yoshon']} restaurants")
        report.append(
            f"   Bishul Yisroel Tuna: {cert_analysis['bishul_yisroel_tuna']} restaurants",
        )
        report.append("")

        return "\n".join(report)


def main() -> None:
    """Test function for the analyzer."""
    analyzer = KosherMiamiAnalyzer()

    # Sample data
    sample_restaurants = [
        {"name": "Test Restaurant 1", "type": "Dairy", "area": "Miami Beach"},
        {"name": "Test Restaurant 2", "type": "Bakery", "area": "Aventura"},
        {"name": "Test Restaurant 3", "type": "Meat", "area": "Hollywood"},
    ]

    # Run analysis
    analysis = analyzer.analyze_filtering_rules(sample_restaurants)
    report = analyzer.generate_filtering_report(analysis)


if __name__ == "__main__":
    main()
