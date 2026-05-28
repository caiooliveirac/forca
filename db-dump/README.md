# Database dump: `galgenspiel`

Generated on 2026-05-28T14:12:18Z before archiving this application.

## Contents
- `galgenspiel.sql.gz` — full pg_dump (gzipped), generated with:
  ```bash
  pg_dump -p 5432 -d galgenspiel --clean --if-exists --no-owner --no-privileges | gzip -9
  ```

## Tables
- users, game_rounds, player_stats, word_errors


## Restore
```bash
createdb galgenspiel
gunzip -c galgenspiel.sql.gz | psql -d galgenspiel
```

Or in one shot (PostgreSQL must already have the target user/db):
```bash
gunzip -c galgenspiel.sql.gz | psql -d galgenspiel
```
