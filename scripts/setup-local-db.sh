#!/bin/bash

# Local PostgreSQL setup script
echo "Setting up local PostgreSQL database..."

# Start PostgreSQL service
sudo service postgresql start

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE clinic_management;
CREATE USER clinic_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE clinic_management TO clinic_user;
ALTER USER clinic_user CREATEDB;
\q
EOF

echo "Local database setup complete!"
echo "Database: clinic_management"
echo "Username: clinic_user"
echo "Password: password"