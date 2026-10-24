ALTER TABLE users ADD COLUMN banner_name text CHECK (banner_name ~ '^banner-[0-9]+-[0-9a-f-]{36}\.jpg$');
