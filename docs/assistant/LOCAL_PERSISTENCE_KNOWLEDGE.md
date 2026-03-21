# Local Persistence Knowledge

## Purpose

This document is the persistence source of truth for local storage, import sessions, and backups.

## Stores

- `borrowers`: core borrower records
- `debts`: debt records under a borrower
- `entries`: append-oriented ledger entries
- `imports`: import audit sessions
- `meta`: app-wide key/value data such as `lastBackupAt`

## Contracts

- Monetary values are stored as integer cents.
- `periodKey` uses `YYYY-MM`.
- `occurredOn` is optional ISO `YYYY-MM-DD`.
- `entry.signature` is the normalized dedupe key for repeated imports.
- Backup format is versioned as `AppBackupV1`.
- `lastBackupAt` in `meta` is the freshness marker used for backup reminders.

## Safety Rules

- Schema changes require migration review and targeted tests.
- Replace-from-backup must clear and restore stores in one transaction.
- Replace-from-backup should present a human-readable summary before destructive confirmation.
- Import merge must be additive except for exact duplicate suppression.
- Backup guidance should treat persistent storage as helpful but insufficient without exported JSON backups.
