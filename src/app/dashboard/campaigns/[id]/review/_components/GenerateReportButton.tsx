'use client'

import { useState } from 'react'
import styles from './GenerateReportButton.module.css'

const T = {
  generate: { en: 'Generate report', fr: 'Générer le rapport' },
  generating: { en: 'Generating…', fr: 'Génération en cours…' },
  regenerate: { en: 'Regenerate', fr: 'Régénérer' },
  viewAndPrint: { en: 'View & save PDF ↗', fr: 'Voir & PDF ↗' },
  error: { en: 'Generation failed. Try again.', fr: 'Échec. Réessayez.' },
}

interface Props {
  reportId: string
  hasHtml: boolean
  lang: string
}

export default function GenerateReportButton({ reportId, hasHtml, lang }: Props) {
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(hasHtml)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}/generate`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t(T.error))
        return
      }

      setReady(true)
    } catch {
      setError(t(T.error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <button
          onClick={handleGenerate}
          className="btn btn-ghost btn-sm"
          disabled={loading}
        >
          {loading ? t(T.generating) : ready ? t(T.regenerate) : t(T.generate)}
        </button>

        {ready && (
          <a
            href={`/dashboard/reports/${reportId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            {t(T.viewAndPrint)}
          </a>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
