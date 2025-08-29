# !/usr/bin/env python3
"""Kosher Miami Utility - Main Interactive Interface.
This module provides an interactive command-line interface for the Kosher Miami utility,
allowing users to run the complete workflow or individual components.
Features:
- Interactive menu system
- Complete workflow execution
- Individual component execution
- Progress tracking and reporting
- Error handling and user feedback
Usage:
    python -m backend.utils.kosher_miami.main
    python scripts/kosher_miami_runner.py
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any
from .analyzer import KosherMiamiAnalyzer
from .importer import KosherMiamiImporter
from .processor import KosherMiamiProcessor
from .scraper import KosherMiamiScraper


class KosherMiamiUtility:
    """Main utility class for managing the complete Kosher Miami workflow.
    This class orchestrates the scraping, processing, analysis, and import
    of kosher restaurant data from koshermiami.org into the JewGo database.
    """

    def __init__(self) -> None:
        """Initialize the Kosher Miami utility with all components."""
        self.scraper = KosherMiamiScraper()
        self.processor = KosherMiamiProcessor()
        self.analyzer = KosherMiamiAnalyzer()
        self.importer = KosherMiamiImporter()
        # Ensure data directory exists
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)

    async def scrape_fresh_data(self) -> dict[str, Any]:
        """Scrape fresh data from koshermiami.org.
        Returns:
            Dict containing scraped data and metadata
        """
        try:
            # Scrape data using Playwright
            data = await self.scraper.scrape_data()
            # Save raw data with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            raw_json_file = self.data_dir / f"kosher_miami_raw_{timestamp}.json"
            raw_csv_file = self.data_dir / f"kosher_miami_raw_{timestamp}.csv"
            # Save as JSON
            with open(raw_json_file, "w", encoding="utf-8") as f:
                json.dump(data["restaurants"], f, indent=2, ensure_ascii=False)
            # Save as CSV
            self.scraper.save_to_csv(data["restaurants"], raw_csv_file)
            return data
        except Exception:
            return None

    def analyze_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """Analyze scraped data and apply filtering rules.
        Args:
            data: Scraped restaurant data
        Returns:
            Dict containing analysis results and filtered data
        """
        try:
            # Analyze data with current filtering rules
            analysis = self.analyzer.analyze_filtering_rules(data["restaurants"])
            # Save analysis results
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            importable_file = (
                self.data_dir / f"kosher_miami_importable_{timestamp}.json"
            )
            filtered_file = (
                self.data_dir / f"kosher_miami_filtered_out_{timestamp}.json"
            )
            # Save importable data
            with open(importable_file, "w", encoding="utf-8") as f:
                json.dump(analysis["importable"], f, indent=2, ensure_ascii=False)
            # Save filtered out data
            with open(filtered_file, "w", encoding="utf-8") as f:
                json.dump(analysis["filtered_out"], f, indent=2, ensure_ascii=False)
            return analysis
        except Exception:
            return None

    def import_to_database(self, analysis: dict[str, Any]) -> dict[str, Any]:
        """Import filtered data to the database with geocoding.
        Args:
            analysis: Analysis results containing importable data
        Returns:
            Dict containing import results and statistics
        """
        try:
            # Import restaurants to database
            results = self.importer.import_restaurants(analysis["importable"])
            if results["failed_imports"] > 0:
                for _error in results.get("errors", []):
                    pass
            return results
        except Exception:
            return None

    async def run_complete_workflow(self) -> bool:
        """Run the complete Kosher Miami workflow.
        This method orchestrates the entire process:
        1. Scrape fresh data from koshermiami.org
        2. Analyze and filter the data
        3. Import filtered data to the database
        Returns:
            bool: True if workflow completed successfully, False otherwise
        """
        try:
            # Step 1: Scrape data
            data = await self.scrape_fresh_data()
            if not data:
                return False
            # Step 2: Analyze data
            analysis = self.analyze_data(data)
            if not analysis:
                return False
            # Step 3: Import to database
            return self.import_to_database(analysis)
        except Exception:
            return False

    def show_data_files(self) -> None:
        """Display available data files in the data directory."""
        if not self.data_dir.exists():
            return
        files = list(self.data_dir.glob("kosher_miami_*.json"))
        files.extend(self.data_dir.glob("kosher_miami_*.csv"))
        if not files:
            return
        # Group files by type
        raw_files = [f for f in files if "raw_" in f.name]
        importable_files = [f for f in files if "importable_" in f.name]
        filtered_files = [f for f in files if "filtered_out_" in f.name]
        if raw_files:
            for file in sorted(raw_files, reverse=True):
                _ = file.stat().st_size / 1024  # KB
        if importable_files:
            for file in sorted(importable_files, reverse=True):
                _ = file.stat().st_size / 1024  # KB
        if filtered_files:
            for file in sorted(filtered_files, reverse=True):
                _ = file.stat().st_size / 1024  # KB


def display_menu() -> None:
    """Display the main interactive menu."""


async def main() -> None:
    """Main interactive function for the Kosher Miami utility.
    Provides a user-friendly interface for running the utility's various
    functions and workflows.
    """
    utility = KosherMiamiUtility()
    while True:
        display_menu()
        try:
            choice = input("🎯 Enter your choice (0-5): ").strip()
            if choice == "0":
                break
            if choice == "1":
                # Scrape fresh data
                await utility.scrape_fresh_data()
            elif choice == "2":
                # Analyze existing data
                # Look for the most recent raw data file
                raw_files = list(utility.data_dir.glob("kosher_miami_raw_*.json"))
                if raw_files:
                    latest_file = max(raw_files, key=lambda f: f.stat().st_mtime)
                    with open(latest_file, encoding="utf-8") as f:
                        data = {"restaurants": json.load(f)}
                    utility.analyze_data(data)
                else:
                    pass
            elif choice == "3":
                # Import to database
                # Look for the most recent importable data file
                importable_files = list(
                    utility.data_dir.glob("kosher_miami_importable_*.json"),
                )
                if importable_files:
                    latest_file = max(importable_files, key=lambda f: f.stat().st_mtime)
                    with open(latest_file, encoding="utf-8") as f:
                        importable_data = json.load(f)
                    analysis = {"importable": importable_data}
                    utility.import_to_database(analysis)
                else:
                    pass
            elif choice == "4":
                # Run complete workflow
                await utility.run_complete_workflow()
            elif choice == "5":
                # Show data files
                utility.show_data_files()
            else:
                pass
        except KeyboardInterrupt:
            break
        except Exception:
            pass


if __name__ == "__main__":
    # Run the main interactive interface
    asyncio.run(main())
