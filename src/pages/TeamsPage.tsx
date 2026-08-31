import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { FolderGit2, Mail, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, EmptyState, Spinner } from '@/components/ui/misc'
import { ConfigNotice } from '@/components/ConfigNotice'
import { TeamService } from '@/services/TeamService'
import { ProjectService } from '@/services/ProjectService'
import type { Team, TeamInvitation, TeamMember, TeamRole } from '@/types/team'
import type { Project } from '@/types/project'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { describeError } from '@/lib/describeError'

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
      .catch((err) => toast.error('Failed to load teams', describeError(err)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!TeamService.isAvailable) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="type-display text-graphite-50">Teams</h1>
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
      toast.error('Failed to create team', describeError(err))
    }
  }

  async function respond(invitation: TeamInvitation, accept: boolean) {
    if (!user) return
    try {
      await TeamService.respondToInvitation(invitation.id, invitation.teamId, user.id, invitation.role, accept)
      setMyInvitations((prev) => prev.filter((i) => i.id !== invitation.id))
      if (accept) refreshTeams()
      toast.success(accept ? 'Invitation accepted' : 'Invitation declined')
    } catch (err) {
      toast.error('Failed to respond', describeError(err))
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="type-display text-graphite-50">Teams</h1>
          <p className="type-body mt-1.5 text-graphite-500">
            <span data-numeric>{teams.length}</span> team{teams.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={handleCreateTeam}>
          <Plus size={16} /> New Team
        </Button>
      </div>

      {myInvitations.length > 0 && (
        <div className="mt-7 space-y-2">
          <p className="type-label text-graphite-600">Pending invitations</p>
          {myInvitations.map((inv) => (
            <div
              key={inv.id}
              className="surface-card flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-violet/12 text-signal-violet ring-1 ring-inset ring-signal-violet/20">
                  <Mail size={15} />
                </span>
                <p className="text-[0.8125rem] text-graphite-300">
                  Join <span className="font-medium text-graphite-100">{inv.teamName}</span> as {inv.role}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
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
        <div className="space-y-0.5">
          {loading ? (
            <Spinner />
          ) : teams.length === 0 ? (
            <p className="px-1 text-sm text-graphite-500">No teams yet.</p>
          ) : (
            teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelected(team)}
                className={clsx(
                  'flex w-full items-center gap-2.5 truncate rounded-lg px-3 py-2 text-left text-[0.8125rem] font-medium',
                  'transition-[background-color,color,transform] duration-150 ease-out',
                  'active:scale-[0.98] motion-reduce:active:scale-100',
                  selected?.id === team.id
                    ? 'nav-pill-active text-graphite-50'
                    : 'text-graphite-400 hover:bg-surface-raised hover:text-graphite-100',
                )}
              >
                <Users size={14} className={selected?.id === team.id ? 'text-ember-400' : 'text-graphite-600'} />
                <span className="truncate">{team.name}</span>
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
  const [projects, setProjects] = useState<Project[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('developer')
  const isOwner = members.some((m) => m.userId === currentUserId && m.role === 'owner')
  const isOwnerOrAdmin = isOwner || members.some((m) => m.userId === currentUserId && m.role === 'admin')

  async function refresh() {
    const [m, i, p] = await Promise.all([
      TeamService.listMembers(team.id),
      TeamService.listInvitationsForTeam(team.id),
      ProjectService.listForTeam(team.id),
    ])
    setMembers(m)
    setInvitations(i.filter((inv) => inv.status === 'pending'))
    setProjects(p)
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
      toast.error('Failed to invite', describeError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-graphite-100">{team.name}</h2>
        <p className="text-sm text-graphite-500">{members.length} member{members.length === 1 ? '' : 's'}</p>
      </div>

      <div className="space-y-1.5">
        {members.map((m) => {
          // Mirrors the server's actual authority (migration 0004): an
          // owner can manage anyone; a plain admin can only manage
          // developer/viewer rows — never another owner or admin, and can
          // never promote someone into owner/admin. Showing a control the
          // backend would silently reject on click is worse than not
          // showing it.
          const canManage = isOwner || (isOwnerOrAdmin && m.role !== 'owner' && m.role !== 'admin')
          return (
            <div key={m.userId} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2">
              <span className="text-sm text-graphite-200">{m.displayName}</span>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <select
                    value={m.role}
                    onChange={(e) => TeamService.updateMemberRole(team.id, m.userId, e.target.value as TeamRole).then(refresh)}
                    className="rounded border border-hairline-strong bg-surface-raised px-1.5 py-0.5 text-xs text-graphite-300"
                  >
                    {isOwner && <option value="admin">Admin</option>}
                    <option value="developer">Developer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <Badge>{m.role}</Badge>
                )}
                {canManage && (
                  <button onClick={() => TeamService.removeMember(team.id, m.userId).then(refresh)} className="text-graphite-500 hover:text-signal-red">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-graphite-500">
          Team projects{projects.length > 0 ? ` (${projects.length})` : ''}
        </p>
        {projects.length === 0 ? (
          <p className="text-sm text-graphite-500">
            No projects shared with this team yet — share one from its card on the dashboard.
          </p>
        ) : (
          <div className="space-y-1.5">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-hairline px-3 py-2 text-sm text-graphite-300 transition-colors duration-150 hover:bg-surface-raised hover:text-graphite-100"
              >
                <FolderGit2 size={14} className="shrink-0 text-graphite-500" />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isOwnerOrAdmin && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-graphite-500">Invite a member</p>
          <div className="flex flex-wrap gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" type="email" className="max-w-56" />
            <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} className="rounded-lg border border-hairline-strong bg-surface-raised px-2 text-sm text-graphite-300">
              {isOwner && <option value="admin">Admin</option>}
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
                <div key={inv.id} className="flex items-center justify-between rounded-lg bg-surface-raised/50 px-3 py-2 text-sm text-graphite-400">
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
