'use client'
import { useEffect, useRef, useState } from 'react'
import { copyText } from '@/lib/copyText'

export default function useCopyCode(code: string) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current) }, [])
  async function copy() {
    if (timeout.current) clearTimeout(timeout.current)
    const success = await copyText(code)
    setStatus(success ? 'copied' : 'error')
    if (success) timeout.current = setTimeout(() => setStatus('idle'), 2000)
    return success
  }
  return { copied: status === 'copied', failed: status === 'error', copy }
}
