import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import csv
import re
import time
import json

BASE = "https://www.godaven.com"
USA_URL = f"{BASE}/list-shuls/countries/USA"


def get_florida_localities():
    res = requests.get(USA_URL)
    soup = BeautifulSoup(res.text, "html.parser")
    links = []
    for a in soup.select("a.capitalize"):
        if a.text.strip().endswith(", FL"):
            city = a.text.strip()[:-4].strip()
            href = a["href"]
            links.append((city, urljoin(BASE, href)))
    return links


def infer_affiliation(name):
    name_lower = name.lower()
    if "chabad" in name_lower or "lubavitch" in name_lower:
        return "Chabad"
    if "sephardic" in name_lower or "sefardi" in name_lower:
        return "Sephardi"
    if "young israel" in name_lower:
        return "Modern Orthodox"
    if "orthodox" in name_lower:
        return "Orthodox"
    if "conservative" in name_lower:
        return "Conservative"
    if "reform" in name_lower:
        return "Reform"
    return "Unknown"


def extract_contact_info(text):
    """Extract phone and email from text"""
    phone_pattern = r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"

    phones = re.findall(phone_pattern, text)
    emails = re.findall(email_pattern, text)

    return {"phone": phones[0] if phones else "", "email": emails[0] if emails else ""}


def extract_hours(text):
    """Extract prayer times and hours from text"""
    # Common prayer time patterns
    patterns = {
        "shacharit": r"shacharit[:\s]*(\d{1,2}:\d{2}\s*[AP]M)",
        "mincha": r"mincha[:\s]*(\d{1,2}:\d{2}\s*[AP]M)",
        "maariv": r"maariv[:\s]*(\d{1,2}:\d{2}\s*[AP]M)",
        "shabbat": r"shabbat[:\s]*(\d{1,2}:\d{2}\s*[AP]M)",
        "sunday": r"sunday[:\s]*(\d{1,2}:\d{2}\s*[AP]M)",
        "weekday": r"weekday[:\s]*(\d{1,2}:\d{2}\s*[AP]M)",
    }

    hours = {}
    for prayer, pattern in patterns.items():
        match = re.search(pattern, text.lower())
        if match:
            hours[prayer] = match.group(1).strip()

    return hours


def get_shuls_from_city(city, url):
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")
    links = soup.select("a.capitalize")
    shuls = []
    for a in links:
        href = a["href"]
        if href.startswith("/shul-details/"):
            slug = href.strip("/").split("/")[-1]
            id = href.strip("/").split("/")[-2]
            full_url = urljoin(BASE, href)
            shuls.append((city, id, slug, full_url))
    return shuls


def parse_shul_details(city, shul_id, slug, url):
    try:
        res = requests.get(url, timeout=15)
        soup = BeautifulSoup(res.text, "html.parser")

        # Get meta description
        meta = soup.find("meta", {"name": "description"})
        if not meta:
            return None

        desc = meta["content"]
        parts = [p.strip() for p in desc.split("|")]

        # Extract basic info
        name = (
            parts[0].replace("Shul info and minyanim times (zmanim) for -", "").strip()
        )
        address = parts[1].strip() if len(parts) > 1 else ""
        rabbi = parts[2].strip().replace("Rabbi", "Rabbi ") if len(parts) > 2 else ""
        affiliation = infer_affiliation(name)

        # Extract contact info and hours from the full page text
        full_text = soup.get_text()
        contact_info = extract_contact_info(full_text)
        hours_info = extract_hours(full_text)

        # Try to find additional information in the page
        additional_info = {}

        # Look for website links
        website_links = soup.find_all("a", href=re.compile(r"http"))
        websites = [
            link["href"] for link in website_links if "godaven.com" not in link["href"]
        ]
        additional_info["website"] = websites[0] if websites else ""

        # Look for social media
        social_media = []
        for link in website_links:
            href = link["href"].lower()
            if any(
                platform in href
                for platform in ["facebook.com", "twitter.com", "instagram.com"]
            ):
                social_media.append(link["href"])
        additional_info["social_media"] = "; ".join(social_media)

        # Extract any additional text that might contain useful info
        paragraphs = soup.find_all(["p", "div"])
        additional_text = " ".join(
            [p.get_text().strip() for p in paragraphs if p.get_text().strip()]
        )

        # Look for specific patterns in additional text
        if "kosher" in additional_text.lower():
            additional_info["kosher_info"] = "Yes"
        if "parking" in additional_text.lower():
            additional_info["parking"] = "Available"
        if (
            "wheelchair" in additional_text.lower()
            or "accessible" in additional_text.lower()
        ):
            additional_info["accessibility"] = "Wheelchair accessible"

        return {
            "Name": name,
            "Address": address,
            "City": city,
            "Rabbi": rabbi,
            "Affiliation": affiliation,
            "Phone": contact_info["phone"],
            "Email": contact_info["email"],
            "Website": additional_info.get("website", ""),
            "Social_Media": additional_info.get("social_media", ""),
            "Shacharit": hours_info.get("shacharit", ""),
            "Mincha": hours_info.get("mincha", ""),
            "Maariv": hours_info.get("maariv", ""),
            "Shabbat": hours_info.get("shabbat", ""),
            "Sunday": hours_info.get("sunday", ""),
            "Weekday": hours_info.get("weekday", ""),
            "Kosher_Info": additional_info.get("kosher_info", ""),
            "Parking": additional_info.get("parking", ""),
            "Accessibility": additional_info.get("accessibility", ""),
            "Additional_Info": (
                additional_text[:500] if additional_text else ""
            ),  # First 500 chars
            "URL": url,
        }

    except Exception as e:
        print(f"[!] Failed for {url}: {e}")
    return None


def main():
    all_data = []
    localities = get_florida_localities()
    print(f"[+] Found {len(localities)} FL localities.")

    for city, city_url in localities:
        print(f"  → {city}")
        shuls = get_shuls_from_city(city, city_url)
        print(f"    Found {len(shuls)} shuls in {city}")

        for city, shul_id, slug, url in shuls:
            print(f"      Processing: {slug}")
            data = parse_shul_details(city, shul_id, slug, url)
            if data:
                all_data.append(data)
                print(f"        ✓ {data['Name']}")
            else:
                print(f"        ✗ Failed to parse {slug}")
            time.sleep(1)  # Be polite to the server

    # Write to CSV with all new fields
    fieldnames = [
        "Name",
        "Address",
        "City",
        "Rabbi",
        "Affiliation",
        "Phone",
        "Email",
        "Website",
        "Social_Media",
        "Shacharit",
        "Mincha",
        "Maariv",
        "Shabbat",
        "Sunday",
        "Weekday",
        "Kosher_Info",
        "Parking",
        "Accessibility",
        "Additional_Info",
        "URL",
    ]

    with open("florida_shuls_enhanced.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_data)

    print(f"[✓] Done. {len(all_data)} records saved to 'florida_shuls_enhanced.csv'.")

    # Also save as JSON for easier processing
    with open("florida_shuls_enhanced.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)

    print(f"[✓] JSON data saved to 'florida_shuls_enhanced.json'.")


if __name__ == "__main__":
    main()
