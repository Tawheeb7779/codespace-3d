export interface PricingPlan {
  id: 'free' | 'pro' | 'team'
  name: string
  price: string
  cadence: string
  description: string
  cta: string
  highlighted?: boolean
  features: string[]
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'For learning, prototyping, and personal projects.',
    cta: 'Start building',
    features: [
      'Unlimited local projects',
      'Full Monaco editor with all languages',
      'In-browser runtime for web/Node projects',
      '1 AI provider connection (bring your own key)',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$16',
    cadence: '/ month',
    description: 'For individual developers shipping real projects.',
    cta: 'Start free trial',
    highlighted: true,
    features: [
      'Everything in Free',
      'Cloud project sync across devices',
      'Git history & branching',
      'GitHub repository connection',
      'Priority AI agent throughput',
      'Custom themes & keybindings',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$32',
    cadence: '/ user / month',
    description: 'For teams shipping together, with shared workspaces.',
    cta: 'Talk to us',
    features: [
      'Everything in Pro',
      'Team workspaces & roles',
      'Real-time presence & comments',
      'Centralized billing',
      'Audit-ready activity log',
      'Priority support',
    ],
  },
]
