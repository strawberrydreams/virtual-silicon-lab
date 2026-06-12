import { useAuthStore } from '../../stores/authStoreContext'
import { AuthApiError, ServerUnreachableError } from './authApi'

function describeAuthError(error: unknown): string {
  if (error instanceof AuthApiError) return error.message
  if (error instanceof ServerUnreachableError) {
    return 'Share server is unreachable. Local editing is unaffected.'
  }
  return 'Something went wrong. Please try again.'
}

const panelClass =
  'rounded-lg border border-[var(--v2-border)] bg-[var(--v2-panel)] p-6 shadow-[0_0_24px_var(--v2-shadow)]'
const fieldClass =
  'mt-1 w-full rounded border border-[var(--v2-border)] bg-[var(--v2-bg-2)] px-3 py-2 text-sm text-[var(--v2-text)] outline-none focus:border-[var(--v2-accent)]'
const labelClass = 'block text-xs uppercase tracking-[0.18em] text-[var(--v2-muted)]'
const buttonClass =
  'mt-4 rounded border border-[var(--v2-accent)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--v2-accent)] hover:bg-[var(--v2-accent)] hover:text-[var(--v2-bg)]'

export function AccountPage() {
  const auth = useAuthStore()

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-[var(--v2-text)]">
      <p className="text-xs uppercase tracking-[0.45em] text-[var(--v2-accent)]">Share Core</p>
      <h1 className="mt-2 text-2xl uppercase tracking-[0.18em]">Account</h1>

      {auth.status === 'unknown' && (
        <p className="mt-8 text-sm text-[var(--v2-muted)]">Checking session...</p>
      )}

      {auth.status === 'offline' && (
        <section className={`${panelClass} mt-8`}>
          <h2 className="text-sm uppercase tracking-[0.18em]">Share server is offline</h2>
          <p className="mt-3 text-sm text-[var(--v2-muted)]">
            Accounts and publishing are unavailable right now. Local editing, autosave, and
            exports are unaffected.
          </p>
        </section>
      )}

      {auth.status === 'anonymous' && <AnonymousPanels />}
      {auth.status === 'authenticated' && auth.user !== null && <ProfilePanel />}
    </main>
  )
}

function AnonymousPanels() {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <section className={panelClass}>
        <h2 className="text-sm uppercase tracking-[0.18em]">Sign In</h2>
        {/* Task 14: sign-in form */}
      </section>
      <section className={panelClass}>
        <h2 className="text-sm uppercase tracking-[0.18em]">Create Account</h2>
        {/* Task 14: signup form */}
      </section>
    </div>
  )
}

function ProfilePanel() {
  return (
    <section className={`${panelClass} mt-8`}>
      {/* Task 15: profile management */}
    </section>
  )
}
