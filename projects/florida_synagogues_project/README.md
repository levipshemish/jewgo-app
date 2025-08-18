# Florida Synagogues Project

## 🎯 **Project Overview**

A comprehensive dataset of 224 permanent Florida synagogues, cleaned and organized for production use.

**Status**: ✅ COMPLETED  
**Last Updated**: August 7, 2024  
**Total Synagogues**: 224  

---

## 📁 **Project Structure**

```
florida_synagogues_project/
├── README.md                           # 📖 This file
├── data/                               # 📊 DATASETS
│   ├── florida_synagogues_final.csv    # 🎯 MAIN CLEANED DATASET (224 synagogues)
│   ├── florida_synagogues_complete_table.md  # 📋 COMPLETE TABLE VIEW
│   └── florida_shuls_complete.csv      # 📊 ORIGINAL UNFILTERED DATA (330 entries)
├── scripts/                            # 🔧 DEVELOPMENT SCRIPTS
│   ├── fl_shuls_scraper.py             # 🕷️ ENHANCED WEB SCRAPER
│   └── florida_shuls_comprehensive.py  # 🔄 MAIN COMPREHENSIVE SCRIPT
├── docs/                               # 📚 DOCUMENTATION
│   ├── FLORIDA_SHULS_SCRAPER_README.md # 📖 ORIGINAL SCRAPER DOCUMENTATION
│   └── FLORIDA_SHULS_FINAL_SUMMARY.md  # 📋 ORIGINAL PROJECT SUMMARY
└── reports/                            # 📊 PROJECT REPORTS
    ├── FLORIDA_SYNAGOGUES_FINAL_REPORT.md      # 📊 COMPREHENSIVE PROJECT REPORT
    └── FLORIDA_SYNAGOGUES_CLEANUP_SUMMARY.md   # 🧹 CLEANUP SUMMARY
```

---

## 🚀 **Quick Start**

### **View the Data**
```bash
# Main cleaned dataset (224 synagogues)
open data/florida_synagogues_final.csv

# Complete table view
open data/florida_synagogues_complete_table.md
```

### **Run the Scraper**
```bash
# Activate virtual environment
source ../backend/venv_py311/bin/activate

# Run comprehensive scraper
python scripts/florida_shuls_comprehensive.py --mode full --output both
```

---

## 📊 **Dataset Statistics**

### **Main Dataset**: `data/florida_synagogues_final.csv`
- **Total Synagogues**: 224
- **Data Fields**: 27 per synagogue
- **Quality**: 100% relevant entries
- **Size**: ~52KB

### **Affiliation Breakdown**
- **Chabad**: 91 synagogues (40.6%)
- **Unknown**: 108 synagogues (48.2%)
- **Modern Orthodox**: 11 synagogues (4.9%)
- **Sephardi**: 9 synagogues (4.0%)
- **Orthodox**: 3 synagogues (1.3%)

### **Top Cities**
1. **Miami**: 20 synagogues (8.9%)
2. **Fort Lauderdale**: 13 synagogues (5.8%)
3. **Miami Beach**: 10 synagogues (4.5%)
4. **Aventura**: 9 synagogues (4.0%)
5. **Boca Raton**: 9 synagogues (4.0%)

---

## 📋 **Data Fields**

### **Basic Information**
- Name, City, Affiliation, Rabbi, Address

### **Contact Information**
- Phone, Email, Website, Social Media

### **Prayer Times**
- Shacharit, Mincha, Maariv, Shabbat, Sunday, Weekday

### **Additional Information**
- Kosher Info, Parking, Accessibility, Additional Info

### **Enhanced Analysis**
- Data Quality Score, Is Chabad, Is Young Israel, Is Sephardic

---

## 🔧 **Development**

### **Scripts**
- **`scripts/fl_shuls_scraper.py`**: Enhanced web scraper for GoDaven.com
- **`scripts/florida_shuls_comprehensive.py`**: Main script with all functionality

### **Data Processing**
- **Filtering**: Removed 106 non-relevant entries (cruise ships, hotels, temporary services)
- **Enhancement**: Added 39 new synagogues from additional community data
- **Categorization**: Detailed affiliation analysis and special categories

---

## 📚 **Documentation**

### **Reports**
- **`reports/FLORIDA_SYNAGOGUES_FINAL_REPORT.md`**: Comprehensive project documentation
- **`reports/FLORIDA_SYNAGOGUES_CLEANUP_SUMMARY.md`**: Cleanup and organization summary

### **Original Documentation**
- **`docs/FLORIDA_SHULS_SCRAPER_README.md`**: Original scraper documentation
- **`docs/FLORIDA_SHULS_FINAL_SUMMARY.md`**: Original project summary

---

## 🎯 **Usage Examples**

### **Database Import**
```sql
-- PostgreSQL
COPY synagogues FROM 'data/florida_synagogues_final.csv' WITH CSV HEADER;

-- MySQL
LOAD DATA INFILE 'data/florida_synagogues_final.csv' INTO TABLE synagogues;
```

### **API Development**
Perfect for building:
- Synagogue finder applications
- Jewish community directories
- Prayer time applications
- Kosher restaurant finders

### **Data Analysis**
```python
import pandas as pd

# Load the dataset
df = pd.read_csv('data/florida_synagogues_final.csv')

# Filter Chabad synagogues
chabad_synagogues = df[df['Is_Chabad'] == 'Yes']

# Group by city
city_counts = df.groupby('City').size().sort_values(ascending=False)
```

---

## ✅ **Project Status**

### **Completed**
- ✅ **Data Collection**: 224 permanent Florida synagogues
- ✅ **Data Cleaning**: 100% relevant entries
- ✅ **Data Enhancement**: Contact info fields ready
- ✅ **Documentation**: Comprehensive reports
- ✅ **Organization**: Clean folder structure

### **Ready for Production**
- ✅ **Dataset Quality**: 100% relevant synagogues
- ✅ **Multiple Formats**: CSV and Markdown table
- ✅ **Comprehensive Coverage**: Statewide Florida
- ✅ **Full Documentation**: Complete project history

---

## 📞 **Support**

For questions or enhancements:
- Review the documentation in `docs/` and `reports/`
- Check the original scraper in `scripts/`
- Use the main dataset in `data/`

---

**🎉 PROJECT COMPLETED AND ORGANIZED!**

*Data Source: GoDaven.com + Additional Community Data*  
*Last Updated: August 7, 2024*  
*Total Entries: 224 Synagogues*  
*Status: Production Ready*
