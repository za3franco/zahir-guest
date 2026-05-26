'use client'

import { useState } from 'react'
import styles from './CampaignStatusActions.module.css'

const T = {
  startReview: { en: 'Mark as under review', fr: 'Marquer en révision' },
  finalize: { en: 'Finalize campaign', fr: 'Finaliser la campagne' },
  publish: { en: 'Publish report', fr: 'Publier le rapport' },
  viewAudit: { en: 'View audit responses', fr: 'Voir les réponses' },
  adminNotes: { en: 'Admin notes (optional)', fr: 'Notes administrateur (optionnel)' },
  notesPlaceholder: { en: 'Add internal notes about this campaign…', fr: 'Ajoutez des notes internes sur cette campagne…' },
  saveNotes: { en: 'Save notes', fr: 'Enregistrer les notes' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  confirmPublish: { en: 'Publish this report? The property manager will be notified.', fr: 'Publier ce rapport ? Le directeur d\'établissement sera notifié.' },
  confirmFinalize: { en: 'Finalize this campaign?', fr: 'Finaliser cette campagne ?' },
  statusInfo: {
    assigned: { en: 'Waiting for the auditor to begin the audit.', fr: 'En attente que l\'auditeur commence l\'audit.' },
    in_progress: { en: 'The auditor is currently conducting the audit.', fr: 'L\'auditeur conduit actuellement l\'audit.' },
    submitted: { en: 'The audit has been submitted and is ready for your review.', fr: 'L\'audit a été soumis et est prêt pour votre révision.' },
    under_review: { en: 'You are reviewing this audit. Finalize when ready.', fr: 'Vous révisez cet audit. Finalisez quand vous êtes prêt.' },
    finalized: { en: 'This campaign is finalized. Publish to share with the property manager.', fr: 'Cette campagne est finalisée. Publiez pour partager avec le directeur.' },
    published: { en: 'This report has been published and shared with the property manager.', fr: 'Ce rapport a été publié et partagé avec le directeur d\'établissement.' },
  },
}

interface Props {
  campaignId: string
  status: string
  auditorId: string | null
  lang: string
}

export default function CampaignStatusActions({ campaignId, status, auditorId, lang }: Props) {
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']

  async function updateStatus(newStatus: string) {
    if (newStatus === 'published') {
      if (!confirm(t(T.confirmPublish))) return
    }
    if (newStatus === 'finalized') {
      if (!confirm(t(T.confirmFinalize))) return
    }

    setLoading(true)
    try {
      await fetch(`/api/campaigns/${campaignId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      window.location.reload()
    } catch {
      setLoading(false)
    }
  }

  async function saveNotesFn() {
    setSavingNotes(true)
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: notes }),
      })
      window.location.reload()
    } catch {
      setSavingNotes(false)
    }
  }

  const statusInfo = T.statusInfo[status as keyof typeof T.statusInfo]

  return (
    <div className={styles.panel}>
      {/* Status info */}
      {statusInfo && (
        <div className={styles.statusInfo}>
          <p>{t(statusInfo)}</p>
        </div>
      )}

      {/* Action buttons based on status */}
      <div className={styles.actions}>
        {status === 'submitted' && (
          <button
            onClick={() => updateStatus('under_review')}
            className="btn btn-primary"
            disabled={loading}
          >
            {t(T.startReview)}
          </button>
        )}

        {status === 'under_review' && (
          <>
            <a
              
            <button
              onClick={() => updateStatus('finalized')}
              className="btn btn-primary"
              disabled={loading}
            >
              {t(T.finalize)}
            </button>
          </>
        )}

        {status === 'finalized' && (
          <>
            <a
              
            <button
              onClick={() => updateStatus('published')}
              className="btn btn-primary"
              disabled={loading}
            >
              {t(T.publish)}
            </button>
          </>
        )}

        {status === 'published' && (
          <a
            
        )}
      </div>

      {/* Admin notes */}
      {['submitted', 'under_review', 'finalized'].includes(status) && (
        <div className={styles.notesSection}>
          <label className={styles.notesLabel}>{t(T.adminNotes)}</label>
          <textarea
            className={styles.notesInput}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t(T.notesPlaceholder)}
            rows={4}
          />
          <button
            onClick={saveNotesFn}
            className="btn btn-ghost btn-sm"
            disabled={savingNotes || !notes.trim()}
          >
            {savingNotes ? t(T.saving) : t(T.saveNotes)}
          </button>
        </div>
      )}
    </div>
  )
}
