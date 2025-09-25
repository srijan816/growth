#!/bin/bash

# Database configuration
DB_NAME="growth_compass"
DB_USER="${DB_USER:-tikaram}"

echo "🔍 Checking PostgreSQL status..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it with: brew install postgresql@14"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
    echo "⚠️  PostgreSQL is not running. Starting it now..."
    
    # Remove stale PID file if exists
    PID_FILE="/opt/homebrew/var/postgresql@14/postmaster.pid"
    if [ -f "$PID_FILE" ]; then
        PID=$(head -1 "$PID_FILE" 2>/dev/null)
        if [ ! -z "$PID" ] && ! ps -p "$PID" > /dev/null 2>&1; then
            echo "🧹 Removing stale PID file..."
            rm -f "$PID_FILE"
        fi
    fi
    
    # Start PostgreSQL
    brew services start postgresql@14
    
    # Wait for PostgreSQL to start
    for i in {1..10}; do
        if pg_isready -q 2>/dev/null; then
            echo "✅ PostgreSQL started successfully"
            break
        fi
        echo "⏳ Waiting for PostgreSQL to start... ($i/10)"
        sleep 2
    done
    
    if ! pg_isready -q 2>/dev/null; then
        echo "❌ Failed to start PostgreSQL. Check logs: tail -50 /opt/homebrew/var/log/postgresql@14.log"
        exit 1
    fi
else
    echo "✅ PostgreSQL is running"
fi

# Check if database exists
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "✅ Database '$DB_NAME' exists"
    
    # Check if database has tables
    TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo "✅ Database has $TABLE_COUNT tables"
        
        # Check key table data
        STUDENT_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM students;" 2>/dev/null | xargs)
        COURSE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM courses;" 2>/dev/null | xargs)
        USER_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
        
        echo "📊 Database statistics:"
        echo "   - Users: $USER_COUNT"
        echo "   - Students: $STUDENT_COUNT"
        echo "   - Courses: $COURSE_COUNT"
    else
        echo "⚠️  Database exists but has no tables. Run 'npm run migrate' to set up the schema."
    fi
else
    echo "⚠️  Database '$DB_NAME' does not exist"
    echo "Creating database..."
    
    createdb -U "$DB_USER" "$DB_NAME"
    
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
        echo "Run 'npm run migrate' to set up the schema"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
fi

echo "🚀 Database is ready!"