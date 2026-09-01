import { Badge } from '@/components/ui/misc'

export type FeatureStatus = 'real' | 'config-required' | 'limited' | 'planned'

const LABEL: Record<FeatureStatus, string> = {
  real: 'Live',
  'config-required': 'Needs setup',
  limited: 'Limited',
  planned: 'Planned',
}

const VARIANT: Record<FeatureStatus, 'success' | 'warning' | 'default' | 'violet'> = {
  real: 'success',
  'config-required': 'warning',
  limited: 'warning',
  planned: 'default',
}

/**
 * Every feature surface that isn't fully real must say so — spec §62.
 * Never let a planned/config-required feature look indistinguishable
 * from a working one.
 */
export function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>
}
