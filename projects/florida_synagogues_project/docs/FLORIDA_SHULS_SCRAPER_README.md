# Florida Shuls Data Collection System

This system provides comprehensive tools for collecting and enhancing Florida synagogue data from GoDaven.com and other sources.

## 📁 Files Overview

### Core Scraping Scripts
- **`fl_shuls_scraper.py`** - Enhanced version of the original scraper with additional data extraction
- **`fl_shuls_scraper_advanced.py`** - Advanced version with JavaScript rendering support (requires requests-html)
- **`florida_shuls_comprehensive.py`** - Main comprehensive script with multiple modes

### Utility Scripts
- **`test_enhanced_scraper.py`** - Test script for the enhanced scraper
- **`run_enhanced_scraper.py`** - Run enhanced scraper on limited number of shuls
- **`enrich_shuls_data.py`** - Enrich existing data with additional analysis

### Data Files
- **`florida_shuls_full.csv`** - Original scraped data (330 shuls)
- **`data/florida_shuls_enriched.csv`** - Enriched data with additional fields
- **`data/florida_shuls_sample_*.csv`** - Sample data for testing

## 🚀 Quick Start

### 1. Basic Usage
```bash
# Run the comprehensive scraper in basic mode
python florida_shuls_comprehensive.py --mode basic

# Run with limited shuls for testing
python florida_shuls_comprehensive.py --mode basic --max 10
```

### 2. Enhanced Data Collection
```bash
# Run with data enrichment
python florida_shuls_comprehensive.py --mode enhanced

# Run full analysis
python florida_shuls_comprehensive.py --mode full
```

### 3. Enrich Existing Data
```bash
# Enrich existing CSV data
python florida_shuls_comprehensive.py --mode enrich
```

## 📊 Data Fields Collected

### Basic Information
- **Name** - Synagogue name
- **Address** - Full address
- **City** - City/locality
- **Rabbi** - Rabbi name
- **Affiliation** - Inferred affiliation (Chabad, Orthodox, etc.)

### Contact Information
- **Phone** - Phone number (extracted from text)
- **Email** - Email address (extracted from text)
- **Website** - Website URL (extracted from links)
- **Social_Media** - Social media links

### Prayer Times
- **Shacharit** - Morning prayer times
- **Mincha** - Afternoon prayer times
- **Maariv** - Evening prayer times
- **Shabbat** - Shabbat prayer times
- **Sunday** - Sunday prayer times
- **Weekday** - Weekday prayer times

### Additional Information
- **Kosher_Info** - Kosher information
- **Parking** - Parking availability
- **Accessibility** - Accessibility features
- **Additional_Info** - Additional text content

### Enhanced Fields (from enrichment)
- **Data_Quality_Score** - Quality score (0-6)
- **Is_Chabad** - Whether it's a Chabad synagogue
- **Is_Young_Israel** - Whether it's a Young Israel synagogue
- **Is_Sephardic** - Whether it's a Sephardic synagogue
- **Has_Address** - Whether address is available
- **State** - State (FL)
- **Has_Zip** - Whether zip code is available

## 🔧 Script Modes

### Basic Mode
- Collects fundamental data from GoDaven.com
- Extracts basic contact information
- Saves to CSV and JSON formats

### Enhanced Mode
- Includes all basic functionality
- Adds data enrichment and analysis
- Provides data quality scoring

### Full Mode
- Complete data collection and analysis
- Comprehensive reporting
- Best for production use

### Enrich Mode
- Takes existing CSV data
- Adds analysis and categorization
- Useful for improving existing datasets

## 📈 Current Data Summary

Based on the existing data (330 shuls):

### Affiliation Breakdown
- **Unknown**: 57.3% (189 shuls)
- **Chabad**: 42.7% (141 shuls)

### Top Cities
1. **Orlando** - Multiple entries (tourism-related)
2. **Miami Beach** - Major Jewish community
3. **Fort Lauderdale** - Significant community
4. **Hollywood** - Growing community
5. **Aventura** - Affluent community

### Data Quality
- **Score 1**: 57.3% (189 shuls) - Basic information only
- **Score 2**: 42.7% (141 shuls) - Some additional details

## 🛠️ Technical Details

### Dependencies
```bash
pip install requests beautifulsoup4
```

### Optional Dependencies
```bash
pip install requests-html  # For JavaScript rendering
```

### Environment Setup
```bash
# Activate virtual environment
source backend/venv_py311/bin/activate

# Run scripts
python florida_shuls_comprehensive.py --mode basic
```

## 📝 Usage Examples

### Example 1: Quick Test
```bash
python run_enhanced_scraper.py --max 5
```

### Example 2: Full Data Collection
```bash
python florida_shuls_comprehensive.py --mode full --output both
```

### Example 3: Enrich Existing Data
```bash
python enrich_shuls_data.py
```

## 🔍 Data Sources

### Primary Source
- **GoDaven.com** - Main source for synagogue listings and basic information

### Limitations
- Site requires JavaScript for full content (some data may be limited)
- Contact information often not available in meta descriptions
- Prayer times may need manual verification

## 📊 Output Formats

### CSV Format
- Standard spreadsheet format
- Easy to import into Excel, Google Sheets, or databases
- Includes all collected fields

### JSON Format
- Structured data format
- Easy to process programmatically
- Includes nested data structures

## 🎯 Future Enhancements

### Planned Features
1. **Google Places API Integration** - Get additional contact information
2. **Web Scraping Enhancement** - Search individual synagogue websites
3. **Prayer Times Validation** - Verify and standardize prayer times
4. **Geocoding** - Add latitude/longitude coordinates
5. **Image Collection** - Gather synagogue photos
6. **Review Integration** - Collect user reviews and ratings

### Advanced Features
1. **Real-time Updates** - Monitor for new synagogues
2. **Data Validation** - Automated quality checks
3. **API Endpoint** - Provide data via REST API
4. **Mobile App Integration** - Direct integration with mobile apps

## 🤝 Contributing

To contribute to this project:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## 📄 License

This project is for educational and community use. Please respect the terms of service of data sources.

## 📞 Support

For questions or issues:
1. Check the existing data files
2. Review the script documentation
3. Test with limited data first
4. Report issues with specific error messages

---

**Last Updated**: December 2024
**Data Source**: GoDaven.com
**Total Shuls**: 330 (Florida)
**Data Quality**: Basic to Enhanced
