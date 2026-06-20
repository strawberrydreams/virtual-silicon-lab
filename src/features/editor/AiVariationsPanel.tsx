import { useState } from 'react'
import { deriveAiVariationContext } from '../../domain/ai/deriveAiVariationContext'
import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from './aiVariationsApi'
import { liveAiVariationsApi, type AiVariationsApi } from './aiVariationsApi'
import { MobileChipPreview } from './MobileChipPreview'

type Props = {
  project: Project
  onSaveVariation: (variation: Project) => Promise<unknown>
  api?: AiVariationsApi
}

function messageForError(error: unknown): string {
  if (error instanceof AiServerUnreachableError) return 'AI server is unreachable. Try again later.'
  if (error instanceof AiApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Sign in to use AI variations.'
      case 'QUOTA_EXCEEDED':
        return 'Daily AI limit reached. Try again tomorrow.'
      case 'AI_UNAVAILABLE':
        return 'The AI provider is unavailable right now.'
      default:
        return error.message
    }
  }
  return 'Something went wrong generating variations.'
}

export function AiVariationsPanel({ project, onSaveVariation, api = liveAiVariationsApi }: Props) {
  const [count, setCount] = useState(3)
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [variations, setVariations] = useState<Project[]>([])
  const [savedIndices, setSavedIndices] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('loading')
    setError(null)
    setVariations([])
    setSavedIndices(new Set())
    try {
      const next = await api.generateVariations(deriveAiVariationContext(project), count)
      setVariations(next)
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setStatus('idle')
    }
  }

  async function save(index: number) {
    try {
      await onSaveVariation(variations[index])
      setSavedIndices((current) => new Set(current).add(index))
    } catch (caught) {
      setError(messageForError(caught))
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-cyan-900 bg-[#040a0f] p-2">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">AI Variations</h2>
      <div className="flex items-center gap-2">
        <label
          className="text-[11px] uppercase tracking-wider text-cyan-300"
          htmlFor="ai-variation-count"
        >
          Count
        </label>
        <select
          id="ai-variation-count"
          aria-label="Variation count"
          className="rounded border border-cyan-800 bg-[#06121a] px-1 py-0.5 text-[11px] text-cyan-100"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
        <button
          type="button"
          className="rounded border border-cyan-700 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
          onClick={generate}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Generating…' : '✨ Generate variations'}
        </button>
      </div>

      {error !== null ? (
        <p className="text-[11px] text-amber-400" role="alert">
          {error}
        </p>
      ) : null}

      {variations.map((variation, index) => (
        <div
          key={`${variation.id}:${index}`}
          className="flex flex-col gap-1 rounded border border-cyan-800 bg-[#06121a] p-2 text-cyan-100"
        >
          <MobileChipPreview project={variation} />
          <p className="text-sm font-semibold">{variation.name}</p>
          <p className="text-[11px] text-cyan-300">
            {variation.theme} · {variation.blocks.length} blocks
          </p>
          {savedIndices.has(index) ? (
            <span className="text-[11px] uppercase tracking-wider text-emerald-300">Saved ✓</span>
          ) : (
            <button
              type="button"
              className="rounded border border-cyan-500 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-50 hover:border-cyan-300"
              onClick={() => save(index)}
            >
              Save as new project
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
