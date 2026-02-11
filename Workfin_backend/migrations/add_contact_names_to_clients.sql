-- Add contact person's first and last name to clients table
ALTER TABLE "denpay-dev".clients
ADD COLUMN IF NOT EXISTS contact_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS contact_last_name VARCHAR(100);

-- Update existing records to have default empty values
UPDATE "denpay-dev".clients
SET contact_first_name = '', contact_last_name = ''
WHERE contact_first_name IS NULL OR contact_last_name IS NULL;

-- Add comment
COMMENT ON COLUMN "denpay-dev".clients.contact_first_name IS 'First name of primary contact person';
COMMENT ON COLUMN "denpay-dev".clients.contact_last_name IS 'Last name of primary contact person';
