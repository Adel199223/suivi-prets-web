# ExecPlans

Use this file as the lifecycle and format source of truth for ExecPlans in this repo.

## When ExecPlans Are Required

- Major or multi-file work
- Changes that cross code, docs, and validation concerns
- Work that will likely involve multiple validation passes

## Active And Completed Plans

- Draft active plans in `docs/assistant/exec_plans/active/`
- Move completed plans to `docs/assistant/exec_plans/completed/`

## Required Sections

- Title
- Goal
- Decisions Locked Up Front
- Implementation Scope
- Validation Plan
- Docs Sync Impact
- Completion Notes

## Rules

- Make the plan decision-complete before large implementation work starts.
- Keep plans concrete enough that another engineer or agent can execute them.
- If scope changes materially, update the active plan before continuing.
