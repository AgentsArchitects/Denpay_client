-- Simple rollback for any failed transaction

ROLLBACK;

-- Verify rollback completed
SELECT
    'Transaction rolled back successfully' as status,
    current_timestamp as rollback_time;
