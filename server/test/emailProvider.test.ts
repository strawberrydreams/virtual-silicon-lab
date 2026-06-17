import { describe, expect, it } from 'vitest'
import { FakeEmailProvider } from '../src/email/provider'

describe('email provider', () => {
  it('fake provider captures sent mail', async () => {
    const provider = new FakeEmailProvider()
    await provider.sendEmail({ to: 'u@b.c', subject: 'Verify', text: 'link', html: '<a>link</a>' })
    expect(provider.sent).toEqual([
      { to: 'u@b.c', subject: 'Verify', text: 'link', html: '<a>link</a>' },
    ])
  })
})
