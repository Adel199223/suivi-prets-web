import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOT_DIR, validateWorkspaceHygiene } from '../../tooling/validate-workspace-hygiene.mjs'

describe('validateWorkspaceHygiene', () => {
  it('passes for the current repo', () => {
    expect(validateWorkspaceHygiene(DEFAULT_ROOT_DIR)).toEqual([])
  })
})
