import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { StudioColorSettings } from '../../domain/project'
import { createDefaultStudioState } from '../../domain/studioDefaults'
import { ColorSettingsPanel } from './ColorSettingsPanel'

describe('ColorSettingsPanel', () => {
  it('edits each render element with solid and two-color gradient paints', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [colorSettings, setColorSettings] = useState<StudioColorSettings>(
        createDefaultStudioState().colorSettings,
      )
      return (
        <ColorSettingsPanel
          colorSettings={colorSettings}
          onChange={(target, paint) => {
            setColorSettings((current) => ({ ...current, [target]: paint }))
            onChange(target, paint)
          }}
        />
      )
    }

    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'Tile' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gradient' }))
    await userEvent.clear(screen.getByLabelText('Gradient from'))
    await userEvent.type(screen.getByLabelText('Gradient from'), '#112233')
    await userEvent.clear(screen.getByLabelText('Gradient to'))
    await userEvent.type(screen.getByLabelText('Gradient to'), '#445566')

    expect(onChange).toHaveBeenCalledWith('tile', {
      mode: 'gradient',
      from: '#112233',
      to: '#445566',
    })
  })
})
