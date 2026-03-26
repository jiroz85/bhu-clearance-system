-- Add UserStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
    END IF;
END$$;

-- Add status column to app_users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'ACTIVE';

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);

-- Update existing users to have ACTIVE status
UPDATE app_users 
SET status = 'ACTIVE' 
WHERE status IS NULL;
