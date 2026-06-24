import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../../../domain/project'
import { createHeroChip } from '../../../domain/heroChip'
import { createProject } from '../../../domain/projectFactory'
import { ChipArtwork } from './ChipArtwork'

vi.mock('react-konva', async () => {
  function node(type: string) {
    return ({
      children,
      name,
      text,
      'data-testid': testId,
      ...props
    }: {
      children?: import('react').ReactNode
      name?: string
      text?: string
      'data-testid'?: string
    } & Record<string, unknown>) => (
      <div
        data-konva={type}
        data-name={name}
        data-testid={testId}
        data-props={JSON.stringify(props)}
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
    Line: node('Line'),
    Rect: node('Rect'),
    RegularPolygon: node('RegularPolygon'),
    Shape: node('Shape'),
    Star: node('Star'),
    Text: node('Text'),
  }
})

class FakeImage {
  private readonly loadListeners = new Set<(event: Event) => void>()
  src = ''

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type !== 'load') return
    this.loadListeners.add(listener as (event: Event) => void)
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type !== 'load') return
    this.loadListeners.delete(listener as (event: Event) => void)
  }

  load() {
    const event = new Event('load')
    for (const listener of this.loadListeners) listener(event)
  }
}

function imageProject(imageDataUrl: string): Project {
  const project = createProject('Image Overlay', 'image-overlay', 100)
  return {
    ...project,
    blocks: [
      {
        id: 'tile-1',
        type: 'CPU',
        category: 'real',
        x: 24,
        y: 24,
        w: 160,
        h: 96,
        rotation: 0,
        glow: true,
        zIndex: 0,
        imageDataUrl,
      },
    ],
  }
}

function konvaProps<T>(selector: string): T {
  const node = document.querySelector(selector)
  expect(node).toBeInTheDocument()
  const props = node?.getAttribute('data-props')
  expect(props).toBeTruthy()
  return JSON.parse(props ?? '{}') as T
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChipArtwork studio layers', () => {
  it('renders parametric dies and seal rings through shared outline shapes', () => {
    const project = createProject('Parametric Artwork', 'parametric-artwork', 100)
    project.die = { ...project.die, shape: 'rounded-rect' }

    render(<ChipArtwork project={project} />)

    expect(document.querySelector('[data-name="parametric-die-shape"]')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-name="parametric-seal-ring"]')).toHaveLength(2)
  })

  it('keeps legacy dies on their existing primitive branch', () => {
    render(<ChipArtwork project={createProject('Legacy Artwork', 'legacy-artwork', 100)} />)
    expect(document.querySelector('[data-name="parametric-die-shape"]')).not.toBeInTheDocument()
  })

  it('applies finish recipe values to rendered package highlight and die outline', () => {
    const matteProject: Project = {
      ...createProject('Matte Artwork', 'matte-artwork', 100),
      theme: 'neon',
      finish: 'matte',
    }
    const metallicProject: Project = {
      ...createProject('Metallic Artwork', 'metallic-artwork', 100),
      theme: 'neon',
      finish: 'metallic',
    }

    const { unmount } = render(<ChipArtwork project={matteProject} />)
    const matteDie = konvaProps<{ stroke: string; strokeWidth: number }>(
      '[data-name="chip-die-base"]',
    )
    const matteHighlight = konvaProps<{ opacity: number }>('[data-name="chip-package-highlight"]')

    unmount()
    render(<ChipArtwork project={metallicProject} />)

    const metallicDie = konvaProps<{ stroke: string; strokeWidth: number }>(
      '[data-name="chip-die-base"]',
    )
    const metallicHighlight = konvaProps<{ opacity: number }>(
      '[data-name="chip-package-highlight"]',
    )

    expect(metallicDie.stroke).toBe(matteDie.stroke)
    expect(metallicDie.strokeWidth).toBeGreaterThan(matteDie.strokeWidth)
    expect(metallicHighlight.opacity).toBeGreaterThan(matteHighlight.opacity)
  })

  it('renders block material overrides while inherited blocks use the chip finish', () => {
    const base = createProject('Block Finish Artwork', 'block-finish-artwork', 100)
    const project: Project = {
      ...base,
      finish: 'metallic',
      blocks: [
        {
          id: 'inherited',
          type: 'CPU',
          category: 'real',
          x: 24,
          y: 24,
          w: 120,
          h: 80,
          rotation: 0,
          glow: true,
          zIndex: 0,
        },
        {
          id: 'override',
          type: 'GPU',
          category: 'real',
          x: 180,
          y: 24,
          w: 120,
          h: 80,
          rotation: 0,
          glow: true,
          finish: 'matte',
          zIndex: 1,
        },
      ],
    }

    render(<ChipArtwork project={project} />)

    const blockBodies = Array.from(document.querySelectorAll('[data-name="chip-block-body"]')).map(
      (node) => JSON.parse(node.getAttribute('data-props') ?? '{}') as { strokeWidth: number },
    )

    expect(blockBodies).toHaveLength(2)
    expect(blockBodies[0].strokeWidth).toBeGreaterThan(blockBodies[1].strokeWidth)
  })

  it('renders studio sprays and stickers through the shared artwork path', () => {
    const project: Project = {
      ...createProject('Studio Artwork', 'studio-artwork', 100),
      studio: {
        ...createProject('Studio Artwork', 'studio-artwork', 100).studio,
        sprays: [
          {
            id: 'spray-1',
            x: 120,
            y: 120,
            radius: 90,
            color: '#ff70dc',
            intensity: 0.75,
            blend: 'screen',
          },
        ],
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge',
            x: 160,
            y: 140,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    }

    render(<ChipArtwork project={project} />)

    expect(screen.getByText('STAR')).toBeInTheDocument()
    expect(document.querySelector('[data-name="studio-spray"]')).toBeInTheDocument()
    expect(document.querySelector('[data-name="studio-sticker"]')).toBeInTheDocument()
  })

  it('allows the editor to provide interactive studio item renderers', () => {
    const project: Project = {
      ...createProject('Studio Artwork', 'studio-artwork', 100),
      studio: {
        ...createProject('Studio Artwork', 'studio-artwork', 100).studio,
        sprays: [
          {
            id: 'spray-1',
            x: 120,
            y: 120,
            radius: 90,
            color: '#ff70dc',
            intensity: 0.75,
            blend: 'screen',
          },
        ],
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge',
            x: 160,
            y: 140,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    }

    render(
      <ChipArtwork
        project={project}
        renderStudioSpray={(spray) => <div data-testid={`interactive-${spray.id}`} />}
        renderStudioSticker={(sticker) => <div data-testid={`interactive-${sticker.id}`} />}
      />,
    )

    expect(screen.getByTestId('interactive-spray-1')).toBeInTheDocument()
    expect(screen.getByTestId('interactive-sticker-1')).toBeInTheDocument()
  })

  it('omits hidden render layers from the Konva artwork tree', () => {
    const project = createProject('Layer Visibility', 'layer-visibility', 100)

    render(
      <ChipArtwork
        project={project}
        layerVisibility={{
          M1: true,
          M2: false,
          M3: true,
          M4: true,
          M5: true,
          Label: true,
        }}
      />,
    )

    expect(document.querySelector('[data-name="chip-layer-micro"]')).toBeInTheDocument()
    expect(document.querySelector('[data-name="chip-layer-traces"]')).not.toBeInTheDocument()
  })

  it('applies ambient trace shimmer and glow pulse only when a frame is provided', () => {
    const project = createHeroChip('ambient-artwork', 1700000000000)

    const { rerender } = render(<ChipArtwork project={project} />)

    const staticTrace = konvaProps<{ dashOffset?: number; opacity: number }>(
      '[data-name="ambient-trace-line"]',
    )
    const staticGlow = konvaProps<{ shadowBlur: number; opacity: number }>(
      '[data-name="chip-glass-glow"]',
    )
    expect(staticTrace.dashOffset).toBe(0)
    expect(staticGlow.shadowBlur).toBeGreaterThan(0)

    rerender(
      <ChipArtwork
        project={project}
        ambientAnimation={{
          glowOpacityScale: 1.08,
          glowBlurScale: 1.16,
          traceOpacityScale: 0.82,
          traceDashOffset: 12,
        }}
      />,
    )

    const animatedTrace = konvaProps<{ dash: number[]; dashOffset: number; opacity: number }>(
      '[data-name="ambient-trace-line"]',
    )
    const animatedGlow = konvaProps<{ shadowBlur: number; opacity: number }>(
      '[data-name="chip-glass-glow"]',
    )
    expect(animatedTrace.dash).toEqual([18, 30])
    expect(animatedTrace.dashOffset).toBe(12)
    expect(animatedTrace.opacity).toBeLessThan(staticTrace.opacity)
    expect(animatedGlow.shadowBlur).toBeGreaterThan(staticGlow.shadowBlur)
    expect(animatedGlow.opacity).toBeGreaterThan(staticGlow.opacity)
  })

  it('does not keep rendering a stale custom image while a replacement is loading', () => {
    const images: FakeImage[] = []
    vi.stubGlobal(
      'Image',
      class extends FakeImage {
        constructor() {
          super()
          images.push(this)
        }
      },
    )

    const { rerender } = render(<ChipArtwork project={imageProject('data:image/png;base64,AAA')} />)
    expect(document.querySelector('[data-konva="Image"]')).not.toBeInTheDocument()

    act(() => images[0].load())
    expect(document.querySelector('[data-konva="Image"]')).toBeInTheDocument()

    rerender(<ChipArtwork project={imageProject('data:image/png;base64,BBB')} />)

    expect(document.querySelector('[data-konva="Image"]')).not.toBeInTheDocument()
  })
})
