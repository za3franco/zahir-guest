'use client'

interface Props {
  userId: string
  userName: string
  lang: string
}

export default function DeleteUserButton({ userId, userName, lang }: Props) {
  return (
    <form action={`/api/users/${userId}`} method="POST">
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--color-terracotta)' }}
        onClick={e => {
          if (!confirm(lang === 'en' ? `Remove ${userName}?` : `Supprimer ${userName} ?`)) e.preventDefault()
        }}
      >
        {lang === 'en' ? 'Remove' : 'Supprimer'}
      </button>
    </form>
  )
}
