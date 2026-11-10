'use client'

// Restarts the guided tour from the Help page (the tour listens for the 'zg-start-tour' event)
export default function ReplayTourLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('zg-start-tour'))}
      style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-gold)', cursor: 'pointer', padding: '8px 14px', fontSize: '0.875rem', marginBottom: 'var(--space-6)' }}
    >
      {label}
    </button>
  )
}
