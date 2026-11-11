'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import SupportForm from './SupportForm'
import styles from './help.module.css'

interface Msg { role: 'user' | 'assistant'; content: string }

const T = {
  open: { en: 'Help', fr: 'Aide' },
  title: { en: 'Zahir assistant', fr: 'Assistant Zahir' },
  hello: {
    en: 'Hello! Ask me anything about using Zahir Guest. If I cannot help, I will pass you to our team.',
    fr: "Bonjour ! Posez-moi vos questions sur l'utilisation de Zahir Guest. Si je ne peux pas vous aider, je vous mets en relation avec notre équipe.",
  },
  placeholder: { en: 'Type your question…', fr: 'Écrivez votre question…' },
  send: { en: 'Send', fr: 'Envoyer' },
  thinking: { en: 'Thinking…', fr: 'Je réfléchis…' },
  contact: { en: 'Contact support', fr: 'Contacter le support' },
  close: { en: 'Close', fr: 'Fermer' },
  disclaimer: { en: 'AI assistant: answers may contain mistakes.', fr: "Assistant IA : les réponses peuvent contenir des erreurs." },
}

export default function HelpCoach({ lang }: { lang: 'en' | 'fr' }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [escalate, setEscalate] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const t = (k: { en: string; fr: string }) => k[lang]

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, loading, showSupport, open])

  // Keep the audit form uncluttered on phones: the coach is reachable from the Help page there
  if (pathname?.startsWith('/dashboard/audit/')) return null

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json().catch(() => ({}))
      setMessages([...next, { role: 'assistant', content: data.reply ?? (lang === 'en' ? 'Sorry, something went wrong.' : "Désolé, une erreur est survenue.") }])
      if (data.escalate) setEscalate(true)
    } catch {
      setMessages([...next, { role: 'assistant', content: lang === 'en' ? 'Sorry, something went wrong.' : "Désolé, une erreur est survenue." }])
      setEscalate(true)
    }
    setLoading(false)
  }

  const lastQuestion = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const transcript = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')

  return (
    <>
      {!open && (
        <button type="button" className={styles.fab} onClick={() => setOpen(true)} aria-label={t(T.open)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span>{t(T.open)}</span>
        </button>
      )}

      {open && (
        <div className={styles.panel} role="dialog" aria-label={t(T.title)}>
          <div className={styles.panelHead}>
            <span>{t(T.title)}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={t(T.close)} className={styles.panelClose}>×</button>
          </div>

          <div className={styles.messages}>
            <div className={`${styles.bubble} ${styles.bot}`}>{t(T.hello)}</div>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.bubble} ${m.role === 'user' ? styles.me : styles.bot}`}>{m.content}</div>
            ))}
            {loading && <div className={`${styles.bubble} ${styles.bot} ${styles.dim}`}>{t(T.thinking)}</div>}

            {(escalate || messages.length >= 4) && !showSupport && (
              <button type="button" className={styles.escalateBtn} onClick={() => setShowSupport(true)}>{t(T.contact)}</button>
            )}
            {showSupport && <SupportForm lang={lang} initialMessage={lastQuestion} transcript={transcript} />}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className={styles.inputRow}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder={t(T.placeholder)} maxLength={1000} aria-label={t(T.placeholder)} />
            <button type="submit" disabled={loading || !input.trim()}>{t(T.send)}</button>
          </form>
          <div className={styles.disclaimer}>{t(T.disclaimer)}</div>
        </div>
      )}
    </>
  )
}
