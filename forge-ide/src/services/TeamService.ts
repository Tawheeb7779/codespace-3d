import { supabase } from '@/lib/supabaseClient'
import type { Team, TeamInvitation, TeamMember, TeamRole } from '@/types/team'

function requireClient() {
  if (!supabase) throw new Error('Teams require Supabase to be configured.')
  return supabase
}

interface TeamMemberRow {
  team_id: string
  user_id: string
  role: TeamRole
  profiles: { display_name: string } | { display_name: string }[] | null
}

function memberDisplayName(row: TeamMemberRow): string {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return profile?.display_name ?? 'Unknown'
}

export const TeamService = {
  isAvailable: Boolean(supabase),

  async listForUser(): Promise<Team[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('teams')
      .select('id, name, owner_id, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map((t) => ({ id: t.id, name: t.name, ownerId: t.owner_id, createdAt: t.created_at }))
  },

  async create(name: string, ownerId: string): Promise<Team> {
    const client = requireClient()
    const { data, error } = await client.from('teams').insert({ name, owner_id: ownerId }).select('*').single()
    if (error) throw error
    const { error: memberError } = await client.from('team_members').insert({ team_id: data.id, user_id: ownerId, role: 'owner' })
    if (memberError) throw memberError
    return { id: data.id, name: data.name, ownerId: data.owner_id, createdAt: data.created_at }
  },

  async rename(teamId: string, name: string): Promise<void> {
    const client = requireClient()
    const { error } = await client.from('teams').update({ name }).eq('id', teamId)
    if (error) throw error
  },

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('team_members')
      .select('team_id, user_id, role, profiles(display_name)')
      .eq('team_id', teamId)
    if (error) throw error
    return (data as unknown as TeamMemberRow[]).map((row) => ({
      teamId: row.team_id,
      userId: row.user_id,
      role: row.role,
      displayName: memberDisplayName(row),
      email: null,
    }))
  },

  async updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
    const client = requireClient()
    const { error } = await client.from('team_members').update({ role }).eq('team_id', teamId).eq('user_id', userId)
    if (error) throw error
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    const client = requireClient()
    const { error } = await client.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
    if (error) throw error
  },

  async invite(teamId: string, email: string, role: TeamRole, invitedBy: string): Promise<void> {
    const client = requireClient()
    const { error } = await client.from('team_invitations').insert({ team_id: teamId, email, role, invited_by: invitedBy })
    if (error) throw error
  },

  async listInvitationsForTeam(teamId: string): Promise<TeamInvitation[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('team_invitations')
      .select('id, team_id, email, role, status, created_at, teams(name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map((row) => ({
      id: row.id,
      teamId: row.team_id,
      teamName: (Array.isArray(row.teams) ? row.teams[0]?.name : (row.teams as { name: string } | null)?.name) ?? '',
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
    }))
  },

  async listInvitationsForEmail(email: string): Promise<TeamInvitation[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('team_invitations')
      .select('id, team_id, email, role, status, created_at, teams(name)')
      .eq('email', email)
      .eq('status', 'pending')
    if (error) throw error
    return data.map((row) => ({
      id: row.id,
      teamId: row.team_id,
      teamName: (Array.isArray(row.teams) ? row.teams[0]?.name : (row.teams as { name: string } | null)?.name) ?? '',
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
    }))
  },

  async respondToInvitation(invitationId: string, teamId: string, userId: string, accept: boolean): Promise<void> {
    const client = requireClient()
    const { error } = await client
      .from('team_invitations')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', invitationId)
    if (error) throw error
    if (accept) {
      const { error: memberError } = await client.from('team_members').insert({ team_id: teamId, user_id: userId, role: 'developer' })
      if (memberError) throw memberError
    }
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    const client = requireClient()
    const { error } = await client.from('team_invitations').update({ status: 'revoked' }).eq('id', invitationId)
    if (error) throw error
  },
}
