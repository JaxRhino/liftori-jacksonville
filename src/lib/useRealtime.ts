import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Handler = () => void

/**
 * Subscribe to Postgres changes on a table.
 * Calls onChange() whenever an INSERT/UPDATE/DELETE happens.
 * Channel cleanup is handled on unmount.
 */
export function useRealtime(table: string, onChange: Handler, deps: unknown[] = []) {
  const handlerRef = useRef(onChange)
  handlerRef.current = onChange

  useEffect(() => {
    let cancelled = false
    let channel: RealtimeChannel | null = null

    ;(async () => {
      channel = supabase
        .channel(`rt:${table}:${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          if (!cancelled) handlerRef.current()
        })
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
