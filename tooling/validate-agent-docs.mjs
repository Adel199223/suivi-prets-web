import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const THIS_FILE = fileURLToPath(import.meta.url)
const TOOLING_DIR = path.dirname(THIS_FILE)
export const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..')

export const REQUIRED_FILES = [
  'AGENTS.md',
  'agent.md',
  'APP_KNOWLEDGE.md',
  'ROADMAP.md',
  '.codex/config.toml',
  '.codex/agents/debt_domain_reviewer.toml',
  '.codex/agents/import_merge_reviewer.toml',
  '.codex/agents/ui_validation_runner.toml',
  '.codex/agents/docs_sync_gardener.toml',
  'docs/assistant/APP_KNOWLEDGE.md',
  'docs/assistant/INDEX.md',
  'docs/assistant/manifest.json',
  'docs/assistant/GOLDEN_PRINCIPLES.md',
  'docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md',
  'docs/assistant/LOCALIZATION_GLOSSARY.md',
  'docs/assistant/PERFORMANCE_BASELINES.md',
  'docs/assistant/exec_plans/PLANS.md',
  'docs/assistant/features/APP_USER_GUIDE.md',
  'docs/assistant/features/DEBT_TRACKING_USER_GUIDE.md',
  'docs/assistant/workflows/LOAN_LEDGER_WORKFLOW.md',
  'docs/assistant/workflows/IMPORT_MERGE_WORKFLOW.md',
  'docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md',
  'docs/assistant/workflows/LOCALIZATION_WORKFLOW.md',
  'docs/assistant/workflows/PERFORMANCE_WORKFLOW.md',
  'docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md',
  'docs/assistant/workflows/CI_REPO_WORKFLOW.md',
  'docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md',
  'docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md'
]

export const REQUIRED_WORKFLOW_IDS = [
  'loan_ledger',
  'import_merge',
  'ui_surface_validation',
  'localization',
  'workspace_performance',
  'reference_discovery',
  'ci_repo_ops',
  'commit_publish_ops',
  'docs_maintenance'
]

const REQUIRED_USER_GUIDE_HEADINGS = [
  '## Use This Guide When',
  '## Do Not Use This Guide For',
  '## For Agents: Support Interaction Contract',
  '## Canonical Deference Rule',
  '## Quick Start (No Technical Background)',
  '## Terms in Plain English'
]

const REQUIRED_WORKFLOW_HEADINGS = [
  '## What This Workflow Is For',
  '## Expected Outputs',
  '## When To Use',
  '## What Not To Do',
  '## Primary Files',
  '## Minimal Commands',
  '## Targeted Tests',
  '## Failure Modes and Fallback Steps',
  '## Handoff Checklist'
]

const REQUIRED_RUNBOOK_HEADINGS = ['## Approval Gates', '## ExecPlans', '## Worktree Isolation']

const REQUIRED_RUNBOOK_PHRASES = [
  'Would you like me to run Assistant Docs Sync for this change now?',
  'REFERENCE_DISCOVERY_WORKFLOW.md',
  'UI_SURFACE_VALIDATION_WORKFLOW.md',
  'APP_USER_GUIDE.md',
  'Sub-Agent'
]

const REQUIRED_MANIFEST_KEYS = ['version', 'canonical', 'bridges', 'user_guides', 'workflows', 'global_commands', 'contracts', 'last_updated']

const REQUIRED_CONTRACT_KEYS = [
  'template_read_policy',
  'post_change_docs_sync_prompt_policy',
  'sub_agent_routing_policy',
  'validation_environment_policy',
  'artifact_capture_policy',
  'validation_fallback_policy',
  'user_guides_support_usage_policy',
  'user_guides_canonical_deference_policy',
  'user_guides_update_sync_policy',
  'golden_principles_source_of_truth',
  'execplan_policy',
  'approval_gates_policy',
  'worktree_isolation_policy',
  'local_persistence_source_of_truth',
  'ui_surface_validation_policy',
  'benchmark_matrix_policy',
  'inspiration_reference_discovery_policy'
]

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function exists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath))
}

export function validateAgentDocs(rootDir = DEFAULT_ROOT_DIR) {
  const errors = []

  for (const relativePath of REQUIRED_FILES) {
    if (!exists(rootDir, relativePath)) {
      errors.push(`Missing required file: ${relativePath}`)
    }
  }

  for (const relativePath of ['AGENTS.md', 'agent.md']) {
    if (!exists(rootDir, relativePath)) {
      continue
    }
    const text = readText(rootDir, relativePath)
    for (const heading of REQUIRED_RUNBOOK_HEADINGS) {
      if (!text.includes(heading)) {
        errors.push(`${relativePath} is missing required heading: ${heading}`)
      }
    }
    for (const phrase of REQUIRED_RUNBOOK_PHRASES) {
      if (!text.includes(phrase)) {
        errors.push(`${relativePath} is missing required routing phrase: ${phrase}`)
      }
    }
  }

  for (const relativePath of ['docs/assistant/features/APP_USER_GUIDE.md', 'docs/assistant/features/DEBT_TRACKING_USER_GUIDE.md']) {
    if (!exists(rootDir, relativePath)) {
      continue
    }
    const text = readText(rootDir, relativePath)
    for (const heading of REQUIRED_USER_GUIDE_HEADINGS) {
      if (!text.includes(heading)) {
        errors.push(`${relativePath} is missing user-guide heading: ${heading}`)
      }
    }
  }

  for (const relativePath of [
    'docs/assistant/workflows/LOAN_LEDGER_WORKFLOW.md',
    'docs/assistant/workflows/IMPORT_MERGE_WORKFLOW.md',
    'docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md',
    'docs/assistant/workflows/LOCALIZATION_WORKFLOW.md',
    'docs/assistant/workflows/PERFORMANCE_WORKFLOW.md',
    'docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md',
    'docs/assistant/workflows/CI_REPO_WORKFLOW.md',
    'docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md',
    'docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md'
  ]) {
    if (!exists(rootDir, relativePath)) {
      continue
    }
    const text = readText(rootDir, relativePath)
    for (const heading of REQUIRED_WORKFLOW_HEADINGS) {
      if (!text.includes(heading)) {
        errors.push(`${relativePath} is missing workflow heading: ${heading}`)
      }
    }
    if (!text.includes("Don't use this workflow when")) {
      errors.push(`${relativePath} is missing explicit negative routing language`)
    }
    if (!text.includes('Instead use')) {
      errors.push(`${relativePath} is missing explicit alternative routing language`)
    }
  }

  if (!exists(rootDir, 'docs/assistant/manifest.json')) {
    return errors
  }

  const manifest = JSON.parse(readText(rootDir, 'docs/assistant/manifest.json'))
  for (const key of REQUIRED_MANIFEST_KEYS) {
    if (!(key in manifest)) {
      errors.push(`Manifest is missing required key: ${key}`)
    }
  }
  const workflowIds = new Set(manifest.workflows.map((workflow) => workflow.id))
  for (const workflowId of REQUIRED_WORKFLOW_IDS) {
    if (!workflowIds.has(workflowId)) {
      errors.push(`Manifest is missing required workflow id: ${workflowId}`)
    }
  }
  for (const key of REQUIRED_CONTRACT_KEYS) {
    if (!(key in manifest.contracts)) {
      errors.push(`Manifest contracts is missing required key: ${key}`)
    }
  }

  return errors
}

function main() {
  const errors = validateAgentDocs()
  if (errors.length > 0) {
    console.error('Agent docs validation failed:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exitCode = 1
    return
  }

  console.log('Agent docs validation passed.')
}

if (process.argv[1] === THIS_FILE) {
  main()
}
