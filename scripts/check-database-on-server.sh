#!/bin/bash

# Script to check database content on server
SERVER_HOST="api.jewgo.app"
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/jewgo-app"
SSH_KEY=".secrets/ssh-key-2025-09-11.key"

echo "Checking database content on server..."

# Execute the debug script inside Docker container
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "
    docker exec jewgo_backend python3 -c \"
from database.connection_manager import DatabaseConnectionManager
from database.models import Restaurant
from dotenv import load_dotenv
import os
load_dotenv()

try:
    print('Connecting to database...')
    db_manager = DatabaseConnectionManager()
    with db_manager.session_scope() as session:
        total_count = session.query(Restaurant).count()
        print(f'Total restaurants: {total_count}')
        
        if total_count > 0:
            sample = session.query(Restaurant).limit(3).all()
            for r in sample:
                print(f'Restaurant: {r.name} - {r.city}, {r.state} (Status: {r.status})')
        
        # Check status distribution
        from sqlalchemy import func
        status_counts = session.query(Restaurant.status, func.count(Restaurant.id)).group_by(Restaurant.status).all()
        print('Status counts:', status_counts)
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
\"
"
