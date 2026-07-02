import { act, fireEvent, render, screen } from '@testing-library/react'
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
      x,
      y,
      onClick,
      onDblClick,
      onDragEnd,
    }: {
      children?: import('react').ReactNode
      className?: string
      name?: string
      text?: string
      x?: number
      y?: number
      onClick?: () => void
      onDblClick?: () => void
      onDragEnd?: (event: { target: { x: () => number; y: () => number } }) => void
    }) => (
      <div
        className={className}
        data-konva={type}
        data-name={name}
        onClick={onClick}
        onDoubleClick={onDblClick}
        onMouseUp={() =>
          name === 'freeform-vertex-handle'
            ? onDragEnd?.({ target: { x: () => 120, y: () => 80 } })
            : undefined
        }
        tabIndex={name === 'freeform-vertex-handle' ? 0 : undefined}
        data-x={x}
        data-y={y}
      >
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
  function freeformProject() {
    const project = createProject('Freeform Stage', 'freeform-stage', 1700000000000)
    project.die = {
      ...project.die,
      width: 240,
      height: 160,
      shape: 'freeform',
      freeform: {
        vertices: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0.75, y: 1 },
          { x: 0.1, y: 0.8 },
        ],
      },
    }
    return project
  }

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

  it('renders freeform vertex handles and edge insertion targets', () => {
    render(
      <ChipStage
        project={freeformProject()}
        selectedBlockId={null}
        selectedStudioItem={null}
        onSelectBlock={vi.fn()}
        onSelectStudioItem={vi.fn()}
        onTransformBlock={vi.fn()}
        onTransformSticker={vi.fn()}
        onTransformSpray={vi.fn()}
      />,
    )

    expect(document.querySelectorAll('[data-name="freeform-vertex-handle"]')).toHaveLength(4)
    expect(document.querySelectorAll('[data-name="freeform-edge-target"]')).toHaveLength(4)
  })

  it('moves, adds, and deletes freeform vertices through normalized callbacks', async () => {
    const user = userEvent.setup()
    const onMoveFreeformVertex = vi.fn()
    const onAddFreeformVertex = vi.fn()
    const onDeleteFreeformVertex = vi.fn()
    render(
      <ChipStage
        project={freeformProject()}
        selectedBlockId={null}
        selectedStudioItem={null}
        onSelectBlock={vi.fn()}
        onSelectStudioItem={vi.fn()}
        onTransformBlock={vi.fn()}
        onTransformSticker={vi.fn()}
        onTransformSpray={vi.fn()}
        onMoveFreeformVertex={onMoveFreeformVertex}
        onAddFreeformVertex={onAddFreeformVertex}
        onDeleteFreeformVertex={onDeleteFreeformVertex}
      />,
    )

    const firstHandle = document.querySelector('[data-name="freeform-vertex-handle"]')
    expect(firstHandle).toBeInTheDocument()
    fireEvent.mouseUp(firstHandle!)
    expect(onMoveFreeformVertex).toHaveBeenCalledWith(0, { x: 0.5, y: 0.5 })

    const firstEdge = document.querySelector('[data-name="freeform-edge-target"]')
    expect(firstEdge).toBeInTheDocument()
    fireEvent.doubleClick(firstEdge!)
    expect(onAddFreeformVertex).toHaveBeenCalledWith(1, { x: 0.5, y: 0 })

    await user.click(firstHandle!)
    await user.keyboard('{Delete}')
    expect(onDeleteFreeformVertex).toHaveBeenCalledWith(0)
  })
})
