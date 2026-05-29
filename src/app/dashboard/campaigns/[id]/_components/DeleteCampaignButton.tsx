'use client'

interface Props {
  campaignId: string
  status: string
  lang: string
}

export default function DeleteCampaignButton({ campaignId, status, lang }: Props) {
  // Cannot delete published campaigns
  if (status === 'published') return null

  const label = lang === 'en' ? 'Delete campaign' : 'Supprimer la campagne'
  const confirm = lang === 'en'
    ? 'Delete this campaign? All responses, photos and reports will be permanently removed. This cannot be undone.'
    : 'Supprimer cette campagne ? Toutes les réponses, photos et rapports seront définitivement supprimés. Cette action est irréversible.'

  return (
    <form
      action={`/api/campaigns/${campaignId}/delete`}
      method="POST"
      onSubmit={e => {
        if (!window.confirm(confirm)) e.preventDefault()
      }}
    >
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--color-terracotta)', borderColor: 'rgba(192,80,58,0.3)' }}
      >
        {label}
      </button>
    </form>
  )
}
