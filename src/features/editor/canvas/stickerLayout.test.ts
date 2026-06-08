import { describe, expect, it } from 'vitest'
import { resolveStickerLayout } from './stickerLayout'

describe('resolveStickerLayout', () => {
  it('maps each sticker kind to a distinct visual form', () => {
    expect(resolveStickerLayout('badge', 'STAR').form).toBe('circle')
    expect(resolveStickerLayout('mascot', 'MAX').form).toBe('star')
    expect(resolveStickerLayout('warning', '!').form).toBe('triangle')
    expect(resolveStickerLayout('label', 'LABEL').form).toBe('pill')
  })

  it('grows the text label pill with longer text', () => {
    const short = resolveStickerLayout('label', 'A')
    const long = resolveStickerLayout('label', 'A MUCH LONGER LABEL')

    expect(long.width).toBeGreaterThan(short.width)
  })

  it('keeps icon stickers a fixed size regardless of text length', () => {
    const short = resolveStickerLayout('badge', 'A')
    const long = resolveStickerLayout('badge', 'A MUCH LONGER LABEL')

    expect(long.width).toBe(short.width)
  })
})
