import type { Migration } from './db'

export const migrations: Migration[] = [
  {
    id: '001_accounts',
    up: (db) => {
      db.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX idx_sessions_user_id ON sessions(user_id);
      `)
    },
  },
  {
    id: '002_published_chips',
    up: (db) => {
      db.exec(`
        CREATE TABLE published_chips (
          id TEXT PRIMARY KEY,
          owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          source_project_id TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          project_json TEXT NOT NULL,
          die_image_data_url TEXT NOT NULL,
          poster_image_data_url TEXT NOT NULL,
          is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
          version INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          published_at INTEGER NOT NULL DEFAULT 0,
          UNIQUE(owner_user_id, source_project_id)
        );
        CREATE INDEX idx_published_chips_owner_user_id ON published_chips(owner_user_id);
        CREATE INDEX idx_published_chips_public_updated ON published_chips(is_public, updated_at DESC);
      `)
    },
  },
  {
    id: '003_published_chip_image_paths',
    up: (db) => {
      db.exec(`
        ALTER TABLE published_chips ADD COLUMN die_image_path TEXT;
        ALTER TABLE published_chips ADD COLUMN poster_image_path TEXT;
      `)
    },
  },
  {
    id: '004_moderation',
    up: (db) => {
      db.exec(`
        ALTER TABLE published_chips ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible';
        ALTER TABLE published_chips ADD COLUMN hidden_at INTEGER;
        ALTER TABLE published_chips ADD COLUMN hidden_by TEXT;
        ALTER TABLE published_chips ADD COLUMN hidden_reason TEXT;
        CREATE TABLE reports (
          id TEXT PRIMARY KEY,
          published_chip_id TEXT NOT NULL REFERENCES published_chips(id) ON DELETE CASCADE,
          reporter_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          reason TEXT,
          status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
          created_at INTEGER NOT NULL,
          resolved_at INTEGER,
          resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
        CREATE INDEX idx_reports_chip ON reports(published_chip_id);
      `)
    },
  },
]
