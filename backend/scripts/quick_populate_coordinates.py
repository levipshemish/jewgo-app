#!/usr/bin/env python3
"""Quick populate shuls coordinates."""

import os
import sys

# Set environment variables directly
os.environ['DATABASE_URL'] = 'postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require'
os.environ['GOOGLE_PLACES_API_KEY'] = 'AIzaSyCl7ryK-cp9EtGoYMJ960P1jZO-nnTCCqM'

# Now import and run the populate script
from populate_shuls_coordinates import main

if __name__ == "__main__":
    main()
