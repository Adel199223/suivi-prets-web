import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOT_DIR, validateAgentDocs } from '../../tooling/validate-agent-docs.mjs'

describe('validateAgentDocs', () => {
  it('passes for the current repo', () => {
    expect(validateAgentDocs(DEFAULT_ROOT_DIR)).toEqual([])
  })

  it('detects a missing root file', () => {
    const errors = validateAgentDocs(path.join(DEFAULT_ROOT_DIR, '__missing__'))
    expect(errors.length).toBeGreaterThan(0)
  })
})
