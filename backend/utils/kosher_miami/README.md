# Kosher Miami Utility

A comprehensive utility for scraping, processing, and importing kosher restaurant data from koshermiami.org into the JewGo database system.

## 🏗️ System Architecture

The Kosher Miami utility is organized into a modular package structure:

```
backend/utils/kosher_miami/
├── __init__.py          # Package initialization and exports
├── scraper.py           # Web scraping functionality
├── processor.py         # Data processing and filtering
├── analyzer.py          # Data analysis and reporting
├── importer.py          # Database import with geocoding
├── main.py              # Interactive CLI interface
├── requirements.txt     # Python dependencies
└── README.md           # This documentation
```

## 🚀 Quick Start

### Prerequisites

1. **Python 3.11** (required)
2. **Environment Variables:**
   - `DATABASE_URL`: PostgreSQL connection string
   - `GOOGLE_MAPS_API_KEY`: For address geocoding

### Installation

```bash
# Install dependencies
pip install -r backend/utils/kosher_miami/requirements.txt

# Set up environment variables
export DATABASE_URL="your_postgresql_connection_string"
export GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
```

### Basic Usage

```bash
# Run the interactive utility
python scripts/kosher_miami_runner.py

# Or run individual components
python -m backend.utils.kosher_miami.main
```

## 📋 Features

### 🔄 Data Scraping
- **Web Scraping**: Automated scraping from koshermiami.org using Playwright
- **Data Extraction**: Parses HTML tables to extract restaurant information
- **Export Options**: Saves data to JSON and CSV formats

### 🧠 Data Processing
- **Filtering Rules**: Implements business logic for restaurant categorization
- **Type Classification**: Handles single and mixed kosher types
- **Data Normalization**: Standardizes field names and formats

### 📊 Data Analysis
- **Comprehensive Reporting**: Detailed analysis of importable vs filtered data
- **Statistics**: Counts by kosher type, area, and certification status
- **Export Reports**: Generates analysis files for review

### 🗄️ Database Import
- **Geocoding**: Automatic address geocoding using Google Maps API
- **Duplicate Protection**: Upsert functionality prevents duplicate entries
- **Data Validation**: Ensures required fields are present
- **Error Handling**: Graceful handling of import failures

## 🎯 Data Processing Rules

### Kosher Type Classification

The system applies the following rules to determine kosher categories:

1. **Single Types**: Direct mapping (Dairy → Dairy, Meat → Meat, Pareve → Pareve)
2. **Mixed Categories**: Priority-based selection:
   - "Pareve, Dairy" → "Dairy"
   - "Pareve, Bakery" → "Pareve"
   - "Pareve, Meat" → "Meat"

### Filtering Rules

**Excluded Categories** (standalone only):
- Catering
- Grocery
- Butcher
- Bakery
- Commercial
- Misc
- Take Out
- Wholesale Only

**Note**: Mixed categories like "Pareve, Bakery" are handled by the kosher type classification rules.

## 📁 Output Files

The utility generates several output files in the `data/` directory:

- `kosher_miami_importable_YYYYMMDD_HHMMSS.json`: Restaurants ready for import
- `kosher_miami_filtered_out_YYYYMMDD_HHMMSS.json`: Excluded restaurants
- `kosher_miami_raw_YYYYMMDD_HHMMSS.json`: Raw scraped data
- `kosher_miami_raw_YYYYMMDD_HHMMSS.csv`: Raw scraped data (CSV format)

## 🗄️ Database Schema

The utility imports data into the following database fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Restaurant name |
| `address` | String | Street address |
| `city` | String | City name |
| `state` | String | State abbreviation |
| `zip_code` | String | ZIP code |
| `phone_number` | String | Contact phone |
| `kosher_category` | String | Kosher type (Dairy/Meat/Pareve) |
| `listing_type` | String | Always "restaurant" |
| `certifying_agency` | String | Always "ORB" |
| `is_cholov_yisroel` | Boolean | Cholov Yisroel certification |
| `is_pas_yisroel` | Boolean | Pas Yisroel certification |
| `latitude` | Float | GPS latitude (if geocoded) |
| `longitude` | Float | GPS longitude (if geocoded) |

## 🗺️ Geocoding

### Address Processing
- **Google Maps API**: Uses Google Maps Geocoding API for address validation
- **Fallback Logic**: Uses original data if geocoding fails
- **Coordinate Storage**: Stores latitude/longitude for mapping features

### Geocoding Results
- **ZIP Code Extraction**: Automatically extracts ZIP codes from addresses
- **City/State Validation**: Ensures accurate city and state information
- **Address Standardization**: Normalizes address formats

## 🔄 Duplicate Protection

### Upsert Functionality
The system implements intelligent duplicate detection and handling:

1. **Duplicate Detection**: Matches restaurants by name + address combination
2. **Update Logic**: Updates existing records with new information
3. **Insert Logic**: Creates new records for unique restaurants
4. **Change Tracking**: Logs what fields were updated

### Benefits
- **Data Integrity**: Prevents duplicate restaurant entries
- **Data Freshness**: Updates existing records with latest information
- **Efficiency**: Reduces database clutter and improves query performance

## ⚠️ Error Handling

### Import Failures
- **Missing Addresses**: Restaurants without addresses are skipped
- **Geocoding Failures**: Uses fallback data when geocoding fails
- **Database Errors**: Logs errors and continues processing
- **Validation Errors**: Skips records with missing required fields

### Error Reporting
- **Detailed Logs**: Comprehensive error logging with context
- **Import Statistics**: Summary of successful vs failed imports
- **Error Categories**: Categorizes different types of failures

## 🧪 Testing

### Test Scripts
- `scripts/test_duplicate_protection.py`: Tests upsert functionality
- `scripts/kosher_miami_runner.py`: Main utility runner

### Test Coverage
- **Duplicate Detection**: Verifies upsert logic works correctly
- **Data Validation**: Tests field validation and error handling
- **Geocoding**: Validates address processing
- **Database Operations**: Tests CRUD operations

## 🔧 Configuration

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/db
GOOGLE_MAPS_API_KEY=your_api_key

# Optional
LOG_LEVEL=INFO
```

### API Keys
- **Google Maps API**: Required for address geocoding
- **Database URL**: PostgreSQL connection string

## 📈 Performance Considerations

### Optimization Features
- **Batch Processing**: Processes restaurants in batches
- **Connection Pooling**: Efficient database connection management
- **Error Recovery**: Continues processing after individual failures
- **Memory Management**: Processes data in chunks to avoid memory issues

### Monitoring
- **Progress Tracking**: Real-time progress updates during processing
- **Performance Metrics**: Tracks processing time and success rates
- **Resource Usage**: Monitors memory and API usage

## 🔄 Maintenance

### Regular Updates
- **Scheduled Runs**: Can be automated for regular data updates
- **Data Freshness**: Keeps restaurant information current
- **Change Detection**: Identifies new, updated, and removed restaurants

### Data Quality
- **Validation**: Ensures data quality before import
- **Cleaning**: Removes invalid or incomplete records
- **Standardization**: Normalizes data formats

## 🤝 Contributing

### Code Standards
- **Python 3.11**: Ensure compatibility with Python 3.11
- **Type Hints**: Use type hints for all function parameters
- **Documentation**: Add docstrings to all functions
- **Error Handling**: Implement proper error handling and logging

### Testing
- **Unit Tests**: Write tests for individual components
- **Integration Tests**: Test complete workflows
- **Error Scenarios**: Test error handling and edge cases

## 📞 Support

For issues or questions:
1. Check the error logs for detailed information
2. Verify environment variables are set correctly
3. Ensure database connection is working
4. Validate Google Maps API key is active

## 📄 License

This utility is part of the JewGo application and follows the same licensing terms. 