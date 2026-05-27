'use client'

import { useState } from 'react'
import styles from './GenerateReportButton.module.css'

const T = {
  generate: { en: 'Generate report & PDF', fr: 'Générer le rapport & PDF' },
  generating: { en: 'Generating…', fr: 'Génération en cours…' },
  regenerate: { en: 'Regenerate report', fr: 'Régénérer le rapport' },
  downloadPdf: { en: 'Download PDF', fr: 'Télécharger le PDF' },
  generated: { en: 'Report generated', fr: 'Rapport généré' },
  error: { en: 'Generation failed. Try again.', fr: 'Échec de la génération. Réessayez.' },
  pdfFailed: { en: 'HTML saved but PDF generation failed. Try regenerating.', fr: 'HTML enregistré mais la génération PDF a échoué. Régénérez.' },
}

interface Props {
  reportId: string
  existingPdfUrl?: string | null
  lang: string
}

export default function GenerateReportButton({ reportId, existingPdfUrl, lang }: Props) {
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(existingPdfUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}/generate`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? t(T.error))
        return
      }

      if (data.pdf_url) {
        setPdfUrl(data.pdf_url)
      } else {
        setError(t(T.pdfFailed))
      }

      setGenerated(true)
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
          className={`btn btn-primary ${styles.generateBtn}`}
          disabled={loading}
        >
          {loading
            ? t(T.generating)
            : pdfUrl
            ? t(T.regenerate)
            : t(T.generate)}
        </button>

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-secondary ${styles.downloadBtn}`}
          >
            ↓ {t(T.downloadPdf)}
          </a>
        )}
      </div>

      {generated && !error && (
        <p className={styles.success}>✓ {t(T.generated)}</p>
      )}

      {error && (
        <p className={styles.error}>{error}</p>
      )}
    </div>
  )
}
