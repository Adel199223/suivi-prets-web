import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ImportPreview, WorkbookImportPreviewV1 } from '../../../src/domain/types'

const fixtureDir = path.dirname(fileURLToPath(import.meta.url))

export function importFixturePath(name: string): string {
  return path.join(fixtureDir, name)
}

export function readImportPreviewArtifact(name: string): WorkbookImportPreviewV1 {
  return JSON.parse(fs.readFileSync(importFixturePath(name), 'utf8')) as WorkbookImportPreviewV1
}

export function readImportPreview(name: string): ImportPreview {
  return readImportPreviewArtifact(name).preview
}

export function buildImportPreviewFile(name: string): File {
  return new File([fs.readFileSync(importFixturePath(name))], name, {
    type: 'application/json'
  })
}
