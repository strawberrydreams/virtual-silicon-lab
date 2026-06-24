import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../../domain/projectFactory'
import { ChipStage } from './ChipStage'

vi.mock('react-konva', async () => {
  function node(type: string) {
    return ({
      children,
      className,
      name,
      text,
    }: {
      children?: import('react').ReactNode
      className?: string
      name?: string
      text?: string
    }) => (
      <div className={className} data-konva={type} data-name={name}>
        {text}
        {children}
      </div>
    )
  }
  return {
    Circle: node('Circle'),
    Group: node('Group'),
    Image: node('Image'),
    Layer: node('Layer'),
    Line: node('Line'),
    Rect: node('Rect'),
    RegularPolygon: node('RegularPolygon'),
    Shape: node('Shape'),
    Stage: node('Stage'),
    Star: node('Star'),
    Text: node('Text'),
    Transformer: node('Transformer'),
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChipStage canvas chrome', () => {
  it('renders coordinate gutters, zoom controls, and canvas status readouts', async () => {
    const user = userEvent.setup()
    const project = createProject('Coordinate Chrome', 'coordinate-chrome', 1700000000000)

    render(
      <ChipStage
        project={project}
        selectedBlockId={null}
        selectedStudioItem={null}
        onSelectBlock={vi.fn()}
        onSelectStudioItem={vi.fn()}
        onTransformBlock={vi.fn()}
        onTransformSticker={vi.fn()}
        onTransformSpray={vi.fn()}
      />,
    )

    expect(screen.getByRole('region', { name: 'Chip coordinate workspace' })).toBeInTheDocument()
    expect(screen.getByLabelText('Column coordinates')).toHaveTextContent('01')
    expect(screen.getByLabelText('Column coordinates')).toHaveTextContent('16')
    expect(screen.getByLabelText('Row coordinates')).toHaveTextContent('A')
    expect(screen.getByLabelText('Row coordinates')).toHaveTextContent('P')
    expect(screen.getByRole('group', { name: 'Canvas zoom controls' })).toBeInTheDocument()
    expect(screen.getByText('Zoom 100%')).toBeInTheDocument()
    const status = screen.getByRole('region', { name: 'Canvas status readouts' })
    expect(status).toHaveTextContent('VIEW 100%')
    expect(status).toHaveTextContent('GRID 10µm')
    expect(status).toHaveTextContent('SNAP ON')
    expect(status).toHaveTextContent('DRC OFF')
    expect(status).not.toHaveTextContent('12:41:33')
    expect(status).not.toHaveTextContent('X ')
    expect(status).not.toHaveTextContent('Y ')

    await user.click(screen.getByRole('button', { name: 'Zoom in' }))

    expect(screen.getByText('Zoom 110%')).toBeInTheDocument()
    expect(status).toHaveTextContent('VIEW 110%')
  })

  it('passes layer visibility into the rendered chip layers', () => {
    const project = createProject('Layer Chrome', 'layer-chrome', 1700000000000)

    render(
      <ChipStage
        project={project}
        selectedBlockId={null}
        selectedStudioItem={null}
        layerVisibility={{
          M1: true,
          M2: false,
          M3: true,
          M4: true,
          M5: true,
          Label: true,
        }}
        onSelectBlock={vi.fn()}
        onSelectStudioItem={vi.fn()}
        onTransformBlock={vi.fn()}
        onTransformSticker={vi.fn()}
        onTransformSpray={vi.fn()}
      />,
    )

    expect(document.querySelector('[data-name="chip-layer-traces"]')).not.toBeInTheDocument()
  })

  it('starts one ambient rAF loop when editor ambient motion is enabled', () => {
    let rafCallback: FrameRequestCallback | null = null
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallback = callback
      return 10
    })
    const cancelAnimationFrame = vi.fn()
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)

    render(
      <ChipStage
        project={createProject('Ambient Loop', 'ambient-loop', 1700000000000)}
        selectedBlockId={null}
        selectedStudioItem={null}
        ambientMotionEnabled={true}
        ambientMotionBudget={{ tier: 'full', animateGlow: true, animateTraces: true, reason: null }}
        onSelectBlock={vi.fn()}
        onSelectStudioItem={vi.fn()}
        onTransformBlock={vi.fn()}
        onTransformSticker={vi.fn()}
        onTransformSpray={vi.fn()}
      />,
    )

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('region', { name: 'Canvas status readouts' })).toHaveTextContent(
      'MOTION FULL',
    )

    act(() => rafCallback?.(6000))

    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
  })

  it('does not start rAF when ambient motion is disabled or degraded to static', () => {
    const requestAnimationFrame = vi.fn()
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)

    render(
      <ChipStage
        project={createProject('Ambient Static', 'ambient-static', 1700000000000)}
        selectedBlockId={null}
        selectedStudioItem={null}
        ambientMotionEnabled={true}
        ambientMotionBudget={{
          tier: 'static',
          animateGlow: false,
          animateTraces: false,
          reason: 'Project is too dense for editor ambient motion.',
        }}
        onSelectBlock={vi.fn()}
        onSelectStudioItem={vi.fn()}
        onTransformBlock={vi.fn()}
        onTransformSticker={vi.fn()}
        onTransformSpray={vi.fn()}
      />,
    )

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(screen.getByRole('region', { name: 'Canvas status readouts' })).toHaveTextContent(
      'MOTION OFF',
    )
  })
})
