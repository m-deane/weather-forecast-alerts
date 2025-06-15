#!/bin/bash

# Script to run data migration in Docker

echo "Starting database migration process..."

# Initialize database schema
echo "1. Initializing database schema..."
docker-compose exec api python init_database.py

if [ $? -ne 0 ]; then
    echo "Database initialization failed!"
    exit 1
fi

echo "Database initialized successfully."

# Run data migration
echo "2. Running data migration..."
docker-compose exec api python data_migration.py

if [ $? -ne 0 ]; then
    echo "Data migration failed!"
    exit 1
fi

echo "Data migration completed successfully."

# Show migration stats
echo "3. Checking migration results..."
docker-compose exec db psql -U mountain_weather_user -d mountain_weather -c "
SELECT 
    'Locations' as entity, COUNT(*) as count FROM locations
UNION ALL
SELECT 
    'Weather Records' as entity, COUNT(*) as count FROM weather_data
UNION ALL
SELECT 
    'Areas' as entity, COUNT(*) as count FROM areas
UNION ALL
SELECT 
    'Weather Sources' as entity, COUNT(*) as count FROM weather_sources;"

echo "Migration process completed!"