import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { validatePublishInput } from '../src/publish/validation'

const png = 'data:image/png;base64,iVBORw0KGgo='

function validPayload() {
  return {
    project: createProject('Ada Chip', 'project-1', 1_000),
    title: '  Ada Chip  ',
    dieImageDataUrl: png,
    posterImageDataUrl: png,
    isPublic: true,
  }
}

describe('validatePublishInput', () => {
  it('normalizes a valid publish payload', () => {
    const result = validatePublishInput(validPayload())

    expect(result).toMatchObject({
      ok: true,
      value: {
        title: 'Ada Chip',
        dieImageDataUrl: png,
        posterImageDataUrl: png,
        isPublic: true,
      },
    })
    expect(result.ok && result.value.project.id).toBe('project-1')
  })

  it('defaults visibility to private when isPublic is omitted', () => {
    const payload = validPayload() as Record<string, unknown>
    delete payload.isPublic

    expect(validatePublishInput(payload)).toMatchObject({
      ok: true,
      value: { isPublic: false },
    })
  })

  it('rejects invalid project JSON', () => {
    const result = validatePublishInput({ ...validPayload(), project: { schemaVersion: 999 } })
    expect(result).toEqual({ ok: false, message: 'Project snapshot is invalid.' })
  })

  it('rejects an empty or overlong title', () => {
    expect(validatePublishInput({ ...validPayload(), title: '   ' })).toEqual({
      ok: false,
      message: 'Title is required.',
    })
    expect(validatePublishInput({ ...validPayload(), title: 'x'.repeat(121) })).toEqual({
      ok: false,
      message: 'Title must be 120 characters or fewer.',
    })
  })

  it('rejects non-boolean visibility values', () => {
    expect(validatePublishInput({ ...validPayload(), isPublic: 'yes' })).toEqual({
      ok: false,
      message: 'isPublic must be a boolean.',
    })
  })

  it('rejects non-PNG image data URLs', () => {
    expect(validatePublishInput({ ...validPayload(), dieImageDataUrl: 'data:image/jpeg;base64,AAAA' })).toEqual({
      ok: false,
      message: 'dieImageDataUrl must be a PNG data URL.',
    })
    expect(validatePublishInput({ ...validPayload(), posterImageDataUrl: 'not-a-url' })).toEqual({
      ok: false,
      message: 'posterImageDataUrl must be a PNG data URL.',
    })
  })
})
