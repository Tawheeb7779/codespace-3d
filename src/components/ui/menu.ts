import { clsx } from 'clsx'

/*
 * One menu language shared by every dropdown in the app (project actions,
 * file tree, account, AI quick actions). These were previously four
 * near-identical class strings that had already drifted apart in padding
 * and radius.
 *
 * Menus are overlay-elevation surfaces: they float above everything, so
 * they get the strongest shadow and a slightly brighter hairline, and they
 * animate from the edge they're anchored to.
 */
export const menuContentClass = clsx(
  'surface-overlay z-50 min-w-[11rem] rounded-xl p-1.5',
  'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
  'data-[side=bottom]:origin-top data-[side=top]:origin-bottom',
)

const menuItemBase = clsx(
  'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2',
  'text-[0.8125rem] font-medium tracking-[-0.006em] outline-none',
  'transition-colors duration-100',
)

export const menuItemClass = clsx(
  menuItemBase,
  'text-graphite-200 focus:bg-surface-hover focus:text-graphite-50 data-[highlighted]:bg-surface-hover data-[highlighted]:text-graphite-50',
)

export const menuItemDangerClass = clsx(
  menuItemBase,
  'text-signal-red focus:bg-signal-red/12 data-[highlighted]:bg-signal-red/12',
)

export const menuSeparatorClass = 'my-1.5 h-px bg-hairline'

export const menuLabelClass =
  'px-2.5 pb-1.5 pt-1 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-graphite-600'
