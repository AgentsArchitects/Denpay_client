-- Add first_name and last_name columns to auth.invitations table
ALTER TABLE auth.invitations
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Update existing invitations to have default names
UPDATE auth.invitations
SET first_name = '', last_name = ''
WHERE first_name IS NULL OR last_name IS NULL;
