# Backup and Restore

Use SQLite online backup before public launch and before risky moderation or migration work.

## Backup

```bash
npx tsx server/scripts/backup.ts server/data/vsl.sqlite backups
```

The default DB path is `server/data/vsl.sqlite` (`<VSL_DATA_DIR>/vsl.sqlite` when `VSL_DATA_DIR`
is set). The script uses SQLite's online backup API, so it is safe to run against a live server
in WAL mode; it prints the written `.bak` path. The `backups/` directory is git-ignored.

Verify a fresh backup before trusting it:

```bash
sqlite3 backups/<file>.bak "PRAGMA integrity_check;"   # expect: ok
```

Schedule the same command from cron or the host scheduler. Keep at least daily backups plus a manual backup before deploys.

## Restore

1. Stop the server process.
2. Copy the chosen `.bak` file over the configured SQLite database path (`server/data/vsl.sqlite`).
   Remove any stale `-wal`/`-shm` sidecar files for that DB before starting.
3. Start the server.
4. Verify `/api/health`, `/api/gallery`, and admin login.

If gallery abuse is in progress, set `VSL_GALLERY_LOCKDOWN=true` before restarting, then unlock after review.
