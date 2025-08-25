# Database Connectivity Fix

## Issue Summary

The application is experiencing a network connectivity error:
```
psycopg2.OperationalError: connection to server at "141.148.50.111", port 5432 failed: No route to host
```

This indicates that the deployment environment (Render) cannot reach the PostgreSQL server running on your Ubuntu server at IP `141.148.50.111`.

## Root Cause

The `DATABASE_URL` environment variable is configured to point to your self-hosted PostgreSQL server, but cloud deployment platforms like Render cannot access private IP addresses or servers that aren't publicly accessible.

## Solutions

### Option 1: Use Neon PostgreSQL (Recommended)

Neon provides a free PostgreSQL database that's accessible from cloud deployments.

#### Step 1: Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub or email
3. Create a new project

#### Step 2: Get Database URL
1. In your Neon dashboard, click on your project
2. Go to "Connection Details"
3. Copy the connection string
4. It will look like: `postgresql://username:password@host.neon.tech:5432/database_name`

#### Step 3: Update Environment Variables
In your Render deployment environment variables, set:
```
DATABASE_URL=postgresql://username:password@host.neon.tech:5432/database_name
```

### Option 2: Make Your Ubuntu Server Publicly Accessible

If you want to keep using your Ubuntu server, you need to:

1. **Configure PostgreSQL for remote connections**:
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/*/main/postgresql.conf
   
   # Change listen_addresses
   listen_addresses = '*'
   
   # Edit client authentication
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   
   # Add line for remote connections
   host    all             all             0.0.0.0/0               md5
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **Configure firewall**:
   ```bash
   # Allow PostgreSQL port
   sudo ufw allow 5432
   ```

3. **Use your public IP address** in the DATABASE_URL

### Option 3: Use Supabase (Alternative Cloud Database)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get the connection string from Settings > Database
4. Update your DATABASE_URL environment variable

## Testing the Connection

After updating the DATABASE_URL, test the connection:

```bash
# Run the database connection test
cd backend
python test_db_connection.py
```

## Security Considerations

- Never commit database credentials to version control
- Use environment variables for all sensitive configuration
- Consider using connection pooling for production databases
- Regularly rotate database passwords

## Next Steps

1. Choose a solution from the options above
2. Update the DATABASE_URL environment variable in your deployment platform
3. Test the connection using the provided test script
4. Monitor the application logs to ensure connectivity is restored
