export type TeamRole = 'owner' | 'admin' | 'developer' | 'viewer'

export interface Team {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export interface TeamMember {
  teamId: string
  userId: string
  role: TeamRole
  displayName: string
  email: string | null
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked'

export interface TeamInvitation {
  id: string
  teamId: string
  teamName: string
  email: string
  role: TeamRole
  status: InvitationStatus
  createdAt: string
}
