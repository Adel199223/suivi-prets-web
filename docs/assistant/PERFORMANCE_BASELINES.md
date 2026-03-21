# Performance Baselines

- Keep `node_modules`, `dist`, and `output` excluded from watchers and search.
- Prefer derived selectors over repeated full-table scans inside render loops.
- Keep workbook parsing in explicit user actions, not app boot.
- Keep large import previews summarized by debt and issue counts first.
- Keep spreadsheet parsing code behind a lazy route or import boundary so the main dashboard bundle stays smaller.
