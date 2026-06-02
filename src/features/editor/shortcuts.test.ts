import { describe, expect, it } from 'vitest'
import { resolveShortcut } from './shortcuts'

describe('resolveShortcut', () => {
  it('maps undo and redo', () => {
    expect(resolveShortcut({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: false })).toBe('undo')
    expect(resolveShortcut({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: true })).toBe('redo')
    expect(resolveShortcut({ key: 'z', metaKey: false, ctrlKey: true, shiftKey: false })).toBe('undo')
  })

  it('maps delete, duplicate, reorder, and deselect', () => {
    expect(resolveShortcut({ key: 'Backspace', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('delete')
    expect(resolveShortcut({ key: 'Delete', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('delete')
    expect(resolveShortcut({ key: 'd', metaKey: true, ctrlKey: false, shiftKey: false })).toBe('duplicate')
    expect(resolveShortcut({ key: ']', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('bringForward')
    expect(resolveShortcut({ key: '[', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('sendBackward')
    expect(resolveShortcut({ key: 'Escape', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('deselect')
  })

  it('returns null for unmapped keys', () => {
    expect(resolveShortcut({ key: 'a', metaKey: false, ctrlKey: false, shiftKey: false })).toBeNull()
  })
})
