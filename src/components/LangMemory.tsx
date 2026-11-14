'use client'

import { useEffect } from 'react'
import { rememberLang, type Lang } from '@/lib/lang'

/** Renders nothing: records the language this page is shown in, so the next screens keep it. */
export default function LangMemory({ lang }: { lang: Lang }) {
  useEffect(() => { rememberLang(lang) }, [lang])
  return null
}
