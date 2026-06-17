# Backup and Restore

Use SQLite online backup before public launch and before risky moderation or migration work.

## Backup

```bash
npx tsx server/scripts/backup.ts server/data/virtual-silicon-lab.sqlite backups
```

Schedule the same command from cron or the host scheduler. Keep at least daily backups plus a manual backup before deploys.

## Restore

1. Stop the server process.
2. Copy the chosen `.bak` file over the configured SQLite database path.
3. Start the server.
4. Verify `/api/health`, `/api/gallery`, and admin login.

If gallery abuse is in progress, set `VSL_GALLERY_LOCKDOWN=true` before restarting, then unlock after review.
