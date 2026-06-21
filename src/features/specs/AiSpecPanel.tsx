import { useState } from 'react'
import { deriveAiChipContext } from '../../domain/ai/deriveAiChipContext'
import type { FakeSpec, Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError, liveAiCopyApi, type AiCopyApi } from './aiCopyApi'

type Props = {
  project: Project
  onApply: (spec: FakeSpec) => void
  api?: AiCopyApi
}

function messageForError(error: unknown): string {
  if (error instanceof AiServerUnreachableError) return 'AI server is unreachable. Try again later.'
  if (error instanceof AiApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Sign in to use AI generation.'
      case 'QUOTA_EXCEEDED':
        return 'Daily AI limit reached. Try again tomorrow.'
      case 'AI_UNAVAILABLE':
        return 'The AI provider is unavailable right now.'
      default:
        return error.message
    }
  }
  return 'Something went wrong generating copy.'
}

export function AiSpecPanel({ project, onApply, api = liveAiCopyApi }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [preview, setPreview] = useState<FakeSpec | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('loading')
    setError(null)
    setPreview(null)
    try {
      const spec = await api.generateCopy(deriveAiChipContext(project))
      setPreview(spec)
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setStatus('idle')
    }
  }

  function apply() {
    if (preview === null) return
    onApply(preview)
    setPreview(null)
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-cyan-900 bg-[#040a0f] p-2">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">AI Spec Copy</h2>
      <button
        type="button"
        className="rounded border border-cyan-700 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
        onClick={generate}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Generating…' : '✨ Generate from this chip'}
      </button>

      {error !== null && (
        <p className="text-[11px] text-amber-400" role="alert">
          {error}
        </p>
      )}

      {preview !== null && (
        <div className="flex flex-col gap-1 rounded border border-cyan-800 bg-[#06121a] p-2 text-cyan-100">
          <p className="text-sm font-semibold">
            <span>{preview.brand}</span> <span>{preview.series}</span>
          </p>
          <p className="text-[11px] text-cyan-300">{preview.description}</p>
          {preview.features.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-cyan-200">
              {preview.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          )}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="rounded border border-cyan-500 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-50 hover:border-cyan-300"
              onClick={apply}
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded border border-cyan-900 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-300 hover:border-cyan-600"
              onClick={() => setPreview(null)}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
