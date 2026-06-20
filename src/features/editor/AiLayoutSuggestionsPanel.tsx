import { useState } from 'react'
import type { AiLayoutSuggestion } from '../../domain/ai/aiLayoutSuggestion'
import { deriveAiLayoutContext } from '../../domain/ai/deriveAiLayoutContext'
import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'
import { liveAiSuggestApi, type AiSuggestApi } from './aiSuggestApi'

type Props = {
  project: Project
  onApply: (suggestion: AiLayoutSuggestion) => void
  api?: AiSuggestApi
}

function messageForError(error: unknown): string {
  if (error instanceof AiServerUnreachableError) return 'AI server is unreachable. Try again later.'
  if (error instanceof AiApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Sign in to use AI suggestions.'
      case 'QUOTA_EXCEEDED':
        return 'Daily AI limit reached. Try again tomorrow.'
      case 'AI_UNAVAILABLE':
        return 'The AI provider is unavailable right now.'
      default:
        return error.message
    }
  }
  return 'Something went wrong fetching suggestions.'
}

export function AiLayoutSuggestionsPanel({ project, onApply, api = liveAiSuggestApi }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [suggestions, setSuggestions] = useState<AiLayoutSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)

  async function suggest() {
    setStatus('loading')
    setError(null)
    setSuggestions([])
    try {
      const next = await api.generateSuggestions(deriveAiLayoutContext(project))
      setSuggestions(next)
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setStatus('idle')
    }
  }

  function removeAt(index: number) {
    setSuggestions((current) => current.filter((_, candidateIndex) => candidateIndex !== index))
  }

  function accept(index: number) {
    onApply(suggestions[index])
    removeAt(index)
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-cyan-900 bg-[#040a0f] p-2">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">
        AI Layout Suggestions
      </h2>
      <button
        type="button"
        className="rounded border border-cyan-700 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
        onClick={suggest}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Thinking…' : '✨ Suggest improvements'}
      </button>

      {error !== null ? (
        <p className="text-[11px] text-amber-400" role="alert">
          {error}
        </p>
      ) : null}

      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}:${suggestion.x}:${suggestion.y}:${index}`}
          className="flex flex-col gap-1 rounded border border-cyan-800 bg-[#06121a] p-2 text-cyan-100"
        >
          <p className="text-sm font-semibold">{suggestion.type}</p>
          {suggestion.reason !== undefined ? (
            <p className="text-[11px] text-cyan-300">{suggestion.reason}</p>
          ) : null}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="rounded border border-cyan-500 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-50 hover:border-cyan-300"
              onClick={() => accept(index)}
            >
              Accept
            </button>
            <button
              type="button"
              className="rounded border border-cyan-900 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-300 hover:border-cyan-600"
              onClick={() => removeAt(index)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
