CREATE TABLE IF NOT EXISTS cms_state (key TEXT PRIMARY KEY);
INSERT OR IGNORE INTO cms_state(key)
SELECT 'members_initialized' FROM content WHERE kind='member' AND published IS NOT NULL LIMIT 1;
CREATE TRIGGER IF NOT EXISTS member_first_insert AFTER INSERT ON content
WHEN NEW.kind='member' AND NEW.published IS NOT NULL
BEGIN INSERT OR IGNORE INTO cms_state(key) VALUES ('members_initialized'); END;
CREATE TRIGGER IF NOT EXISTS member_first_publish AFTER UPDATE OF published ON content
WHEN NEW.kind='member' AND NEW.published IS NOT NULL
BEGIN INSERT OR IGNORE INTO cms_state(key) VALUES ('members_initialized'); END;
