import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { UserProfile } from '@/types/auth'

export interface PresentUser {
  userId: string
  displayName: string
  activeFile: string | null
}

/**
 * Real presence via Supabase Realtime (spec §29) — who else is looking at
 * this project right now, and which file they're on. Requires Supabase;
 * returns an empty list otherwise rather than fabricating collaborators.
 */
export function usePresence(projectId: string, user: UserProfile | null, activeFile: string | null): PresentUser[] {
  const [users, setUsers] = useState<PresentUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const activeFileRef = useRef(activeFile)
  activeFileRef.current = activeFile

  useEffect(() => {
    const client = supabase
    if (!client || !user) return

    const channel = client.channel(`presence:project:${projectId}`, {
      // `private: true` routes the subscribe attempt through Supabase
      // Realtime Authorization (RLS on realtime.messages — see migration
      // 0003) instead of allowing any authenticated client to join by
      // guessing the project id.
      config: { presence: { key: user.id }, private: true },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ displayName: string; activeFile: string | null }>()
        const present = Object.entries(state)
          .filter(([userId]) => userId !== user.id)
          .map(([userId, entries]) => ({
            userId,
            displayName: entries[0]?.displayName ?? 'Someone',
            activeFile: entries[0]?.activeFile ?? null,
          }))
        setUsers(present)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ displayName: user.displayName, activeFile: activeFileRef.current })
        }
      })

    return () => {
      channelRef.current = null
      void channel.untrack()
      void client.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.id])

  useEffect(() => {
    if (!user) return
    void channelRef.current?.track({ displayName: user.displayName, activeFile })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile])

  return users
}
