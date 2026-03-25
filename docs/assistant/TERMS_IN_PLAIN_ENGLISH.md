# Terms In Plain English

- `harness`: the set of repo docs, workflows, validators, and helper files that tell Codex how to work safely in this repo.
- `bootstrap`: the reusable starter system that seeds and syncs that harness.
- `HARNESS_PROFILE.json`: the file that says what kind of project this is and which bootstrap modules should be active.
- `BOOTSTRAP_STATE.json`: the generated summary of what the bootstrap profile resolves to right now.
- `HARNESS_OUTPUT_MAP.json`: the mapping file that says when a generic bootstrap output should point at an existing repo-local file instead.
- `manifest.json`: the machine-readable routing map for assistant workflows.
- `ExecPlan`: a written execution plan for major or multi-file work.
- `local-first`: your data stays on the current device/browser unless you export it yourself.
- `validation`: a command that checks whether the repo still follows its expected rules.
