-- ============================================================================
-- Canteen Management - PostgreSQL Initialization Script
-- Runs once when the database container is first created.
-- ============================================================================

-- Enable commonly needed extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create application schemas
CREATE SCHEMA IF NOT EXISTS canteen;

-- Grant default privileges so the application user can operate freely
ALTER DEFAULT PRIVILEGES IN SCHEMA canteen
    GRANT ALL ON TABLES TO CURRENT_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA canteen
    GRANT ALL ON SEQUENCES TO CURRENT_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA canteen
    GRANT EXECUTE ON FUNCTIONS TO CURRENT_USER;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Canteen database initialized successfully at %', NOW();
END
$$;
