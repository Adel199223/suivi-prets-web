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
  '.vscode/mcp.json.example',
  'docs/assistant/APP_KNOWLEDGE.md',
  'docs/assistant/INDEX.md',
  'docs/assistant/manifest.json',
  'docs/assistant/GOLDEN_PRINCIPLES.md',
  'docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md',
  'docs/assistant/LOCALIZATION_GLOSSARY.md',
  'docs/assistant/PERFORMANCE_BASELINES.md',
  'docs/assistant/CODEX_ENVIRONMENT.md',
  'docs/assistant/HARNESS_PROFILE.json',
  'docs/assistant/HARNESS_OUTPUT_MAP.json',
  'docs/assistant/CAPABILITY_DISCOVERY.md',
  'docs/assistant/DIAGNOSTICS.md',
  'docs/assistant/ISSUE_MEMORY.md',
  'docs/assistant/ISSUE_MEMORY.json',
  'docs/assistant/LOCAL_ENVIRONMENT.md',
  'docs/assistant/QA_CHECKS.md',
  'docs/assistant/RELEASE_CHECKLIST.md',
  'docs/assistant/SAFE_COMMANDS.md',
  'docs/assistant/TERMS_IN_PLAIN_ENGLISH.md',
  'docs/assistant/exec_plans/PLANS.md',
  'docs/assistant/exec_plans/active/.gitkeep',
  'docs/assistant/exec_plans/completed/.gitkeep',
  'docs/assistant/features/APP_USER_GUIDE.md',
  'docs/assistant/features/DEBT_TRACKING_USER_GUIDE.md',
  'docs/assistant/runtime/BOOTSTRAP_STATE.json',
  'docs/assistant/runtime/CANONICAL_BUILD.json',
  'docs/assistant/schemas/HARNESS_PROFILE.schema.json',
  'docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json',
  'docs/assistant/templates/BOOTSTRAP_VERSION.json',
  'docs/assistant/templates/CODEX_PROJECT_BOOTSTRAP_PROMPT.md',
  'docs/assistant/workflows/LOAN_LEDGER_WORKFLOW.md',
  'docs/assistant/workflows/IMPORT_MERGE_WORKFLOW.md',
  'docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md',
  'docs/assistant/workflows/LOCALIZATION_WORKFLOW.md',
  'docs/assistant/workflows/PERFORMANCE_WORKFLOW.md',
  'docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md',
  'docs/assistant/workflows/CI_REPO_WORKFLOW.md',
  'docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md',
  'docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md',
  'docs/assistant/workflows/PROJECT_HARNESS_SYNC_WORKFLOW.md',
  'docs/assistant/workflows/SESSION_RESUME.md',
  'tooling/bootstrap_profile_wizard.py',
  'tooling/check_harness_profile.py',
  'tooling/preview_harness_sync.py',
  'tooling/harness_profile_lib.py'
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
  'docs_maintenance',
  'project_harness_sync'
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

const REQUIRED_MANIFEST_KEYS = ['version', 'canonical', 'bridges', 'user_guides', 'workflows', 'global_commands', 'contracts', 'bootstrap', 'last_updated']

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

const REQUIRED_BOOTSTRAP_KEYS = ['profile', 'state', 'output_map', 'templates_root', 'sync_workflow']

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function readJson(rootDir, relativePath, errors) {
  try {
    return JSON.parse(readText(rootDir, relativePath))
  } catch (error) {
    errors.push(`Invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
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
    'docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md',
    'docs/assistant/workflows/PROJECT_HARNESS_SYNC_WORKFLOW.md'
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

  const manifest = exists(rootDir, 'docs/assistant/manifest.json')
    ? readJson(rootDir, 'docs/assistant/manifest.json', errors)
    : null
  const harnessProfile = exists(rootDir, 'docs/assistant/HARNESS_PROFILE.json')
    ? readJson(rootDir, 'docs/assistant/HARNESS_PROFILE.json', errors)
    : null
  const harnessOutputMap = exists(rootDir, 'docs/assistant/HARNESS_OUTPUT_MAP.json')
    ? readJson(rootDir, 'docs/assistant/HARNESS_OUTPUT_MAP.json', errors)
    : null
  const bootstrapState = exists(rootDir, 'docs/assistant/runtime/BOOTSTRAP_STATE.json')
    ? readJson(rootDir, 'docs/assistant/runtime/BOOTSTRAP_STATE.json', errors)
    : null
  const issueMemory = exists(rootDir, 'docs/assistant/ISSUE_MEMORY.json')
    ? readJson(rootDir, 'docs/assistant/ISSUE_MEMORY.json', errors)
    : null
  const canonicalBuild = exists(rootDir, 'docs/assistant/runtime/CANONICAL_BUILD.json')
    ? readJson(rootDir, 'docs/assistant/runtime/CANONICAL_BUILD.json', errors)
    : null

  if (manifest) {
    for (const key of REQUIRED_MANIFEST_KEYS) {
      if (!(key in manifest)) {
        errors.push(`Manifest is missing required key: ${key}`)
      }
    }

    const workflowIds = new Set(Array.isArray(manifest.workflows) ? manifest.workflows.map((workflow) => workflow.id) : [])
    for (const workflowId of REQUIRED_WORKFLOW_IDS) {
      if (!workflowIds.has(workflowId)) {
        errors.push(`Manifest is missing required workflow id: ${workflowId}`)
      }
    }

    if (!manifest.contracts || typeof manifest.contracts !== "object") {
      errors.push('Manifest contracts must be an object')
    } else {
      for (const key of REQUIRED_CONTRACT_KEYS) {
        if (!(key in manifest.contracts)) {
          errors.push(`Manifest contracts is missing required key: ${key}`)
        }
      }
    }

    if (!manifest.bootstrap || typeof manifest.bootstrap !== "object") {
      errors.push('Manifest bootstrap must be an object')
    } else {
      for (const key of REQUIRED_BOOTSTRAP_KEYS) {
        if (!(key in manifest.bootstrap)) {
          errors.push(`Manifest bootstrap is missing required key: ${key}`)
        } else if (typeof manifest.bootstrap[key] !== 'string' || !manifest.bootstrap[key].trim()) {
          errors.push(`Manifest bootstrap key must be a non-empty string: ${key}`)
        } else if (!exists(rootDir, manifest.bootstrap[key])) {
          errors.push(`Manifest bootstrap path does not exist: ${manifest.bootstrap[key]}`)
        }
      }
    }
  }

  if (harnessProfile) {
    if (harnessProfile.schema_version !== 1) {
      errors.push('HARNESS_PROFILE.json schema_version must equal 1')
    }
    if (harnessProfile.project?.name !== 'suivi-prets-web') {
      errors.push('HARNESS_PROFILE.json project.name must equal suivi-prets-web')
    }
    if (harnessProfile.bootstrap?.archetype !== 'web_app') {
      errors.push('HARNESS_PROFILE.json bootstrap.archetype must equal web_app')
    }
    if (harnessProfile.bootstrap?.mode !== 'standard') {
      errors.push('HARNESS_PROFILE.json bootstrap.mode must equal standard')
    }
  }

  if (harnessOutputMap) {
    const mappings = Array.isArray(harnessOutputMap.output_mappings) ? harnessOutputMap.output_mappings : null
    if (!mappings) {
      errors.push('HARNESS_OUTPUT_MAP.json must contain an output_mappings array')
    } else {
      const hasIndexMapping = mappings.some((mapping) =>
        mapping?.resolved_output === 'docs/assistant/START_HERE.md' &&
        Array.isArray(mapping?.sync_targets) &&
        mapping.sync_targets.includes('docs/assistant/INDEX.md')
      )
      if (!hasIndexMapping) {
        errors.push('HARNESS_OUTPUT_MAP.json must map docs/assistant/START_HERE.md to docs/assistant/INDEX.md')
      }
    }
  }

  if (bootstrapState) {
    if (bootstrapState.schema_version !== 1) {
      errors.push('BOOTSTRAP_STATE.json schema_version must equal 1')
    }
    if (!Array.isArray(bootstrapState.resolved?.modules)) {
      errors.push('BOOTSTRAP_STATE.json resolved.modules must be an array')
    }
  }

  if (issueMemory) {
    if (issueMemory.schema_version !== 1) {
      errors.push('ISSUE_MEMORY.json schema_version must equal 1')
    }
    if (!Array.isArray(issueMemory.entries)) {
      errors.push('ISSUE_MEMORY.json entries must be an array')
    }
  }

  if (canonicalBuild) {
    if (canonicalBuild.schema_version !== 1) {
      errors.push('CANONICAL_BUILD.json schema_version must equal 1')
    }
    if (typeof canonicalBuild.canonical_url !== 'string' || !canonicalBuild.canonical_url) {
      errors.push('CANONICAL_BUILD.json canonical_url must be a non-empty string')
    }
    if (!canonicalBuild.canonical_commands || typeof canonicalBuild.canonical_commands !== 'object') {
      errors.push('CANONICAL_BUILD.json canonical_commands must be an object')
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
