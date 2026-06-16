import { useState, type FormEvent } from 'react'
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
            Accounts and publishing are unavailable right now. Local editing, autosave, and exports
            are unaffected.
          </p>
        </section>
      )}

      {auth.status === 'anonymous' && <AnonymousPanels />}
      {auth.status === 'authenticated' && auth.user !== null && <ProfilePanel />}
    </main>
  )
}

function AnonymousPanels() {
  const auth = useAuthStore()
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <SignInForm />
      {auth.accessMode === 'closed' ? (
        <section className={panelClass}>
          <h2 className="text-sm uppercase tracking-[0.18em]">Create Account</h2>
          <p className="mt-3 text-sm text-[var(--v2-muted)]">
            Sign-ups are currently closed (private beta).
          </p>
        </section>
      ) : (
        <SignupForm />
      )}
    </div>
  )
}

function SignInForm() {
  const auth = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.login({ email, password })
    } catch (caught) {
      setError(describeAuthError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={panelClass}>
      <h2 className="text-sm uppercase tracking-[0.18em]">Sign In</h2>
      <form className="mt-4" onSubmit={submit}>
        <label className={labelClass} htmlFor="signin-email">
          Email
        </label>
        <input
          className={fieldClass}
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className={`${labelClass} mt-3`} htmlFor="signin-password">
          Password
        </label>
        <input
          className={fieldClass}
          id="signin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error !== null && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button className={buttonClass} disabled={busy} type="submit">
          Sign In
        </button>
      </form>
    </section>
  )
}

function SignupForm() {
  const auth = useAuthStore()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.signup({
        email,
        displayName,
        password,
        ...(auth.accessMode === 'invite' ? { inviteCode } : {}),
      })
    } catch (caught) {
      setError(describeAuthError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={panelClass}>
      <h2 className="text-sm uppercase tracking-[0.18em]">Create Account</h2>
      <form className="mt-4" onSubmit={submit}>
        <label className={labelClass} htmlFor="signup-email">
          New Email
        </label>
        <input
          className={fieldClass}
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className={`${labelClass} mt-3`} htmlFor="signup-display-name">
          Display Name
        </label>
        <input
          className={fieldClass}
          id="signup-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label className={`${labelClass} mt-3`} htmlFor="signup-password">
          New Password
        </label>
        <input
          className={fieldClass}
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {auth.accessMode === 'invite' && (
          <>
            <label className={`${labelClass} mt-3`} htmlFor="signup-invite-code">
              Invite Code
            </label>
            <input
              className={fieldClass}
              id="signup-invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </>
        )}
        {error !== null && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button className={buttonClass} disabled={busy} type="submit">
          Create Account
        </button>
      </form>
    </section>
  )
}

function ProfilePanel() {
  const auth = useAuthStore()
  const [displayName, setDisplayName] = useState(auth.user?.displayName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>, successMessage: string | null) {
    setMessage(null)
    setError(null)
    try {
      await action()
      setMessage(successMessage)
    } catch (caught) {
      setError(describeAuthError(caught))
    }
  }

  return (
    <section className={`${panelClass} mt-8`}>
      <h2 className="text-sm uppercase tracking-[0.18em]">{auth.user?.displayName}</h2>
      <p className="mt-2 text-sm text-[var(--v2-muted)]">{auth.user?.email}</p>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault()
          void run(() => auth.updateDisplayName(displayName), 'Display name updated.')
        }}
      >
        <label className={labelClass} htmlFor="profile-display-name">
          Display Name
        </label>
        <input
          className={fieldClass}
          id="profile-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <button className={buttonClass} type="submit">
          Save Name
        </button>
      </form>

      <form
        className="mt-6 border-t border-[var(--v2-border)] pt-6"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await auth.changePassword({ currentPassword, newPassword })
            setCurrentPassword('')
            setNewPassword('')
          }, 'Password updated.')
        }}
      >
        <label className={labelClass} htmlFor="profile-current-password">
          Current Password
        </label>
        <input
          className={fieldClass}
          id="profile-current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <label className={`${labelClass} mt-3`} htmlFor="profile-new-password">
          New Password
        </label>
        <input
          className={fieldClass}
          id="profile-new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button className={buttonClass} type="submit">
          Change Password
        </button>
      </form>

      <div className="mt-6 border-t border-[var(--v2-border)] pt-6">
        <button
          className={buttonClass}
          type="button"
          onClick={() => void run(() => auth.logout(), null)}
        >
          Sign Out
        </button>
      </div>

      <form
        className="mt-6 border-t border-[var(--v2-border)] pt-6"
        onSubmit={(e) => {
          e.preventDefault()
          void run(() => auth.deleteAccount(deletePassword), null)
        }}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-red-400">Danger Zone</p>
        <label className={`${labelClass} mt-3`} htmlFor="profile-delete-password">
          Confirm Password
        </label>
        <input
          className={fieldClass}
          id="profile-delete-password"
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
        />
        <button
          className="mt-4 rounded border border-red-400 px-4 py-2 text-xs uppercase tracking-[0.18em] text-red-400 hover:bg-red-400 hover:text-[var(--v2-bg)]"
          type="submit"
        >
          Delete Account
        </button>
      </form>

      {message !== null && <p className="mt-4 text-sm text-[var(--v2-accent)]">{message}</p>}
      {error !== null && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </section>
  )
}
