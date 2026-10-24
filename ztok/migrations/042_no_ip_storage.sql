-- ztok no longer stores IP addresses in any form. Wipe anything recorded before.
UPDATE user_events SET ip_hash = NULL, ip_sealed = NULL WHERE ip_hash IS NOT NULL OR ip_sealed IS NOT NULL;
UPDATE sessions SET ip_hash = NULL, ip_sealed = NULL WHERE ip_hash IS NOT NULL OR ip_sealed IS NOT NULL;
DELETE FROM video_views WHERE viewer LIKE 'ip:%';
DELETE FROM settings WHERE key = 'ipkey';
