import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { FakeSpecForm } from './FakeSpecForm'

describe('FakeSpecForm', () => {
  it('emits a copied spec when brand and features change', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [spec, setSpec] = useState(createProject('p', 'p1', 0).spec)
      return (
        <FakeSpecForm
          spec={spec}
          onChange={(next) => {
            setSpec(next)
            onChange(next)
          }}
        />
      )
    }
    render(<Harness />)
    await userEvent.clear(screen.getByLabelText('Brand'))
    await userEvent.type(screen.getByLabelText('Brand'), 'AURORA')
    await userEvent.clear(screen.getByLabelText('Features'))
    await userEvent.type(screen.getByLabelText('Features'), 'Lucid Cache{enter}Empathy Core')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        brand: 'AURORA',
        features: ['Lucid Cache', 'Empathy Core'],
      }),
    )
  })

  it('re-syncs the features textarea when the spec changes from outside', async () => {
    function Harness() {
      const [spec, setSpec] = useState(createProject('p', 'p1', 0).spec)
      return <FakeSpecForm spec={spec} onChange={setSpec} />
    }
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'AEGIS M-7' }))

    expect(screen.getByLabelText('Features')).toHaveValue(
      'Rad-Hardened\nFaraday Seal\nFailover Core',
    )
  })

  it('clamps core count edits so the spec sheet never emits negative cores', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [spec, setSpec] = useState(createProject('p', 'p1', 0).spec)
      return (
        <FakeSpecForm
          spec={spec}
          onChange={(next) => {
            setSpec(next)
            onChange(next)
          }}
        />
      )
    }
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('Cores'), { target: { value: '-12' } })

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ cores: 0 }))
    expect(screen.getByLabelText('Cores')).toHaveValue(0)
  })
})
