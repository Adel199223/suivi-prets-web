# Capability Discovery

Record only capabilities that materially affect workflow routing in this repo.

## Confirmed repo-relevant capabilities

- `npm`, Vite, Vitest, and the repo's Node-based validation scripts are part of the normal workflow.
- `python3` is used for bootstrap tooling and the local workbook preview fallback.
- WSL-safe command wrappers are the canonical validation path from this machine.
- The repo now contains a vendored bootstrap source in `docs/assistant/templates/` and a source kit in `bootstrap_harness_kit/`.

## Not currently enabled in the harness profile

- Codespaces
- Browser bridge integration
- OpenAI-specific bootstrap module activation
