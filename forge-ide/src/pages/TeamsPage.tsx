import { useEffect, useState } from 'react'
import { Mail, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, EmptyState, Spinner } from '@/components/ui/misc'
import { ConfigNotice } from '@/components/ConfigNotice'
import { TeamService } from '@/services/TeamService'
import type { Team, TeamInvitation, TeamMember, TeamRole } from '@/types/team'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

export function TeamsPage() {
  const user = useAuthStore((s) => s.user)
  const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [myInvitations, setMyInvitations] = useState<TeamInvitation[]>([])

  async function refreshTeams() {
    const list = await TeamService.listForUser()
    setTeams(list)
    if (!selected && list.length > 0) setSelected(list[0])
  }

  useEffect(() => {
    if (!TeamService.isAvailable) {
      setLoading(false)
      return
    }
    Promise.all([refreshTeams(), user?.email ? TeamService.listInvitationsForEmail(user.email) : Promise.resolve([])])
      .then(([, invitations]) => setMyInvitations(invitations))
      .catch((err) => toast.error('Failed to load teams', err instanceof Error ? err.message : undefined))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!TeamService.isAvailable) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-graphite-50">Teams</h1>
        <div className="mt-6">
          <ConfigNotice>Teams require Supabase to be configured — they need a shared backend to work across members.</ConfigNotice>
        </div>
      </div>
    )
  }

  async function handleCreateTeam() {
    const name = prompt('Team name')
    if (!name || !user) return
    try {
      const team = await TeamService.create(name, user.id)
      setTeams((prev) => [team, ...prev])
      setSelected(team)
    } catch (err) {
      toast.error('Failed to create team', err instanceof Error ? err.message : undefined)
    }
  }

  async function respond(invitation: TeamInvitation, accept: boolean) {
    if (!user) return
    try {
      await TeamService.respondToInvitation(invitation.id, invitation.teamId, user.id, accept)
      setMyInvitations((prev) => prev.filter((i) => i.id !== invitation.id))
      if (accept) refreshTeams()
      toast.success(accept ? 'Invitation accepted' : 'Invitation declined')
    } catch (err) {
      toast.error('Failed to respond', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-graphite-50">Teams</h1>
        <Button variant="primary" onClick={handleCreateTeam}>
          <Plus size={15} /> New Team
        </Button>
      </div>

      {myInvitations.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-graphite-500">Pending invitations</p>
          {myInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-graphite-800 bg-graphite-900/50 px-4 py-2.5">
              <p className="text-sm text-graphite-300">
                Join <span className="font-medium text-graphite-100">{inv.teamName}</span> as {inv.role}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => respond(inv, false)}>
                  Decline
                </Button>
                <Button variant="primary" size="sm" onClick={() => respond(inv, true)}>
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-1">
          {loading ? (
            <Spinner />
          ) : teams.length === 0 ? (
            <p className="text-sm text-graphite-500">No teams yet.</p>
          ) : (
            teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelected(team)}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${selected?.id === team.id ? 'bg-graphite-800 text-graphite-100' : 'text-graphite-400 hover:bg-graphite-850'}`}
              >
                {team.name}
              </button>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <TeamDetail team={selected} currentUserId={user?.id ?? null} />
          ) : (
            <EmptyState icon={Users} title="No team selected" description="Create a team to start collaborating." />
          )}
        </div>
      </div>
    </div>
  )
}

function TeamDetail({ team, currentUserId }: { team: Team; currentUserId: string | null }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('developer')
  const isOwnerOrAdmin = members.some((m) => m.userId === currentUserId && (m.role === 'owner' || m.role === 'admin'))

  async function refresh() {
    const [m, i] = await Promise.all([TeamService.listMembers(team.id), TeamService.listInvitationsForTeam(team.id)])
    setMembers(m)
    setInvitations(i.filter((inv) => inv.status === 'pending'))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

  async function handleInvite() {
    if (!email.trim() || !currentUserId) return
    try {
      await TeamService.invite(team.id, email.trim(), role, currentUserId)
      setEmail('')
      toast.success('Invitation sent')
      refresh()
    } catch (err) {
      toast.error('Failed to invite', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-graphite-100">{team.name}</h2>
        <p className="text-sm text-graphite-500">{members.length} member{members.length === 1 ? '' : 's'}</p>
      </div>

      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between rounded-lg border border-graphite-800 px-3 py-2">
            <span className="text-sm text-graphite-200">{m.displayName}</span>
            <div className="flex items-center gap-2">
              {isOwnerOrAdmin && m.role !== 'owner' ? (
                <select
                  value={m.role}
                  onChange={(e) => TeamService.updateMemberRole(team.id, m.userId, e.target.value as TeamRole).then(refresh)}
                  className="rounded border border-graphite-700 bg-graphite-900 px-1.5 py-0.5 text-xs text-graphite-300"
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <Badge>{m.role}</Badge>
              )}
              {isOwnerOrAdmin && m.role !== 'owner' && (
                <button onClick={() => TeamService.removeMember(team.id, m.userId).then(refresh)} className="text-graphite-500 hover:text-signal-red">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOwnerOrAdmin && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-graphite-500">Invite a member</p>
          <div className="flex flex-wrap gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" type="email" className="max-w-56" />
            <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} className="rounded-lg border border-graphite-700 bg-graphite-900 px-2 text-sm text-graphite-300">
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button variant="primary" onClick={handleInvite} disabled={!email.trim()}>
              <UserPlus size={14} /> Invite
            </Button>
          </div>

          {invitations.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg bg-graphite-900/50 px-3 py-2 text-sm text-graphite-400">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} /> {inv.email} · {inv.role}
                  </span>
                  <button onClick={() => TeamService.revokeInvitation(inv.id).then(refresh)} className="text-xs text-graphite-500 hover:text-signal-red">
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
