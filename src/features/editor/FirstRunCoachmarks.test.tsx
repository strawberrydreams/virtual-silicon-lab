import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FirstRunCoachmarks } from './FirstRunCoachmarks'

vi.mock('../../stores/onboardingStore', () => ({
  useOnboardingStore: () => ({
    editorTourDismissed: false,
    dismissEditorTour: vi.fn(),
  }),
}))

describe('FirstRunCoachmarks', () => {
  it('separates palette command bar copy from Appearance finish copy', () => {
    render(<FirstRunCoachmarks />)

    expect(
      screen.getByText(
        'Choose a palette in the command bar, then tune surface finish in Appearance.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Pick a finish in the command bar.')).not.toBeInTheDocument()
  })
})
