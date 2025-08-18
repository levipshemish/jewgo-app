import asyncio
import csv
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from playwright.async_api import async_playwright






#!/usr/bin/env python3
"""Kosher Miami Scraper.

Web scraping functionality for koshermiami.org to extract kosher establishment data.
"""

class KosherMiamiScraper:
    """Scraper for koshermiami.org establishment data."""

    def __init__(self, output_dir: str = "data") -> None:
        # Use the main data directory at project root
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

        # Output file paths
        self.csv_file = self.output_dir / "kosher_miami_establishments.csv"
        self.json_file = self.output_dir / "kosher_miami_establishments.json"
        self.html_file = self.output_dir / "kosher_miami_table.html"

        # Scraping configuration
        self.base_url = "https://koshermiami.org/establishments/"
        self.timeout = 30000  # 30 seconds

    async def scrape_data(self) -> list[dict]:
        """Scrape kosher establishment data from koshermiami.org.

        Returns:
            List of establishment dictionaries

        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                await page.goto(self.base_url, timeout=self.timeout)

                # Ensure we're in List View mode
                await page.click("text=List View")
                await page.wait_for_selector("div.row.desctop", timeout=self.timeout)

                rows = await page.locator("div.row.desctop").all()

                data = []
                for i, row in enumerate(rows):
                    try:
                        fields = await row.locator(".value").all_inner_texts()
                        if len(fields) < 9:
                            continue  # Skip malformed rows

                        entry = {
                            "Name": fields[0].strip(),
                            "Type": fields[1].strip(),
                            "Area": fields[2].strip(),
                            "Address": fields[3].strip(),
                            "Phone": fields[4].strip(),
                            "Cholov Yisroel": fields[5].strip(),
                            "Pas Yisroel": fields[6].strip(),
                            "Yoshon": fields[7].strip(),
                            "Bishul Yisroel Tuna": fields[8].strip(),
                        }
                        data.append(entry)

                        if (i + 1) % 10 == 0:
                            pass

                    except Exception as e:
                        continue

                await browser.close()

                # Save data to files
                await self._save_data(data)

                return data

            except Exception as e:
                await browser.close()
                msg = f"Scraping failed: {e}"
                raise Exception(msg)

    async def _save_data(self, data: list[dict]) -> None:
        """Save scraped data to CSV and JSON files."""
        if not data:
            return

        # Save to CSV
        try:
            with open(self.csv_file, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
        except Exception as e:
            pass

        # Save to JSON
        try:
            with open(self.json_file, mode="w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            pass

    def get_data_files(self) -> dict[str, Path]:
        """Get paths to data files."""
        return {
            "csv": self.csv_file,
            "json": self.json_file,
            "html": self.html_file,
        }

    def data_exists(self) -> bool:
        """Check if scraped data files exist."""
        return self.json_file.exists() and self.csv_file.exists()

    def get_last_scrape_time(self) -> datetime | None:
        """Get the last time data was scraped."""
        if self.json_file.exists():
            return datetime.fromtimestamp(self.json_file.stat().st_mtime)
        return None


async def main() -> None:
    """Test function for the scraper."""
    scraper = KosherMiamiScraper()
    data = await scraper.scrape_data()


if __name__ == "__main__":
    asyncio.run(main())
