import type { PresentUser } from '@/features/collaboration/usePresence'

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

export function PresenceAvatars({ users }: { users: PresentUser[] }) {
  if (users.length === 0) return null

  return (
    <div className="flex -space-x-2">
      {users.slice(0, 4).map((u) => (
        <div
          key={u.userId}
          title={u.activeFile ? `${u.displayName} — ${u.activeFile}` : u.displayName}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-hairline bg-signal-violet/20 text-[10px] font-medium text-signal-violet"
        >
          {initials(u.displayName)}
        </div>
      ))}
      {users.length > 4 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-hairline bg-surface-hover text-[10px] text-graphite-400">
          +{users.length - 4}
        </div>
      )}
    </div>
  )
}
