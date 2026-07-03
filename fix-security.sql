-- Run this SQL in Supabase SQL Editor
-- This moves the admin passcode to server-side verification

-- Settings table to store passcode securely in database
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO system_settings (key, value) 
VALUES ('admin_passcode', '13911400') 
ON CONFLICT (key) DO NOTHING;

-- RPC function: verifies passcode server-side (client never sees the password)
CREATE OR REPLACE FUNCTION verify_admin_passcode(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stored_code TEXT;
BEGIN
    SELECT value INTO stored_code FROM system_settings WHERE key = 'admin_passcode';
    RETURN code = stored_code;
END;
$$;

-- RLS for system_settings: only service_role can read/write
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON system_settings FOR ALL USING (false);