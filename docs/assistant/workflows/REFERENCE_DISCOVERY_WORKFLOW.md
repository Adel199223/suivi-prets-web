# Reference Discovery Workflow

## What This Workflow Is For

Use this workflow when the user requests parity or inspiration from a named app, product, or site.

## Expected Outputs

- Clear reference summary
- Product-appropriate deltas instead of blind copying
- Benchmark notes only when truly needed

## When To Use

- Named-product parity requests
- Inspiration-driven UI or workflow requests

## What Not To Do

Don't use this workflow when the user only wants the local product improved without any named reference. Instead use the relevant product workflow.

## Primary Files

- `docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
```

## Targeted Tests

- `npm run validate:agent-docs`

## Failure Modes and Fallback Steps

- If references conflict with local product reality, keep the local product constraints.
- Only build a benchmark matrix when parity-sensitive UI decisions actually depend on it.

## Handoff Checklist

- Confirm named references
- Confirm kept constraints
- Confirm benchmark scope if any
