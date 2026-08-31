export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export interface ProjectFilesLike {
  exists(path: string): boolean
  read(path: string): string
}

const LOCKFILE_BY_MANAGER: Record<string, PackageManager> = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
}

/**
 * Detects the package manager from lockfiles present in the project.
 * Falls back to `packageManager` field in package.json, then npm.
 * Never assumes npm when a lockfile clearly indicates otherwise (spec §17).
 */
export function detectPackageManager(files: ProjectFilesLike): PackageManager {
  for (const [lockfile, manager] of Object.entries(LOCKFILE_BY_MANAGER)) {
    if (files.exists(lockfile)) return manager
  }
  if (files.exists('package.json')) {
    try {
      const pkg = JSON.parse(files.read('package.json')) as { packageManager?: string }
      if (pkg.packageManager?.startsWith('pnpm')) return 'pnpm'
      if (pkg.packageManager?.startsWith('yarn')) return 'yarn'
    } catch {
      // malformed package.json — fall through to default
    }
  }
  return 'npm'
}

export function installCommand(manager: PackageManager): string[] {
  switch (manager) {
    case 'pnpm':
      return ['pnpm', 'install']
    case 'yarn':
      return ['yarn', 'install']
    default:
      return ['npm', 'install']
  }
}

export function runScriptCommand(manager: PackageManager, script: string): string[] {
  switch (manager) {
    case 'pnpm':
      return ['pnpm', 'run', script]
    case 'yarn':
      return ['yarn', script]
    default:
      return ['npm', 'run', script]
  }
}

/** The lockfile each manager writes/reads — used to read it back out of
 *  WebContainer's fs after an install/uninstall so the project's own
 *  virtual fs (Explorer, Git, ...) picks up the change too. */
export function lockfileFor(manager: PackageManager): string {
  switch (manager) {
    case 'pnpm':
      return 'pnpm-lock.yaml'
    case 'yarn':
      return 'yarn.lock'
    default:
      return 'package-lock.json'
  }
}

export function addPackageCommand(manager: PackageManager, pkg: string, dev: boolean): string[] {
  switch (manager) {
    case 'pnpm':
      return dev ? ['pnpm', 'add', '-D', pkg] : ['pnpm', 'add', pkg]
    case 'yarn':
      return dev ? ['yarn', 'add', '--dev', pkg] : ['yarn', 'add', pkg]
    default:
      return dev ? ['npm', 'install', '--save-dev', pkg] : ['npm', 'install', pkg]
  }
}

export function removePackageCommand(manager: PackageManager, pkg: string): string[] {
  switch (manager) {
    case 'pnpm':
      return ['pnpm', 'remove', pkg]
    case 'yarn':
      return ['yarn', 'remove', pkg]
    default:
      return ['npm', 'uninstall', pkg]
  }
}

export interface RunConfig {
  /** Human-readable reason, shown in the UI so the choice is never a black box. */
  reason: string
  command: string[]
  script?: string
}

interface PackageJsonShape {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function readPackageJson(files: ProjectFilesLike): PackageJsonShape | null {
  if (!files.exists('package.json')) return null
  try {
    return JSON.parse(files.read('package.json')) as PackageJsonShape
  } catch {
    return null
  }
}

/**
 * Determines how to run a project. Inspects package.json scripts, deps,
 * and framework config files — never blindly runs `npm run dev` (spec §18).
 * Returns null when nothing runnable is detected (e.g. a plain static
 * HTML project, which the preview can serve directly instead).
 */
export function detectRunConfig(files: ProjectFilesLike): RunConfig | null {
  const pkg = readPackageJson(files)

  if (!pkg) {
    if (files.exists('index.html')) {
      return { reason: 'Static HTML project (no package.json) — served directly.', command: [] }
    }
    return null
  }

  const manager = detectPackageManager(files)
  const scripts = pkg.scripts ?? {}
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  if (scripts.dev) {
    return {
      reason: '"dev" script found in package.json.',
      command: runScriptCommand(manager, 'dev'),
      script: 'dev',
    }
  }

  if (files.exists('vite.config.ts') || files.exists('vite.config.js') || deps.vite) {
    if (scripts.start) {
      return { reason: 'Vite project with a "start" script.', command: runScriptCommand(manager, 'start'), script: 'start' }
    }
  }

  if (deps.next) {
    const script = scripts.dev ?? scripts.start ?? 'dev'
    return { reason: 'Next.js project detected via dependency.', command: runScriptCommand(manager, script), script }
  }

  if (scripts.start) {
    return { reason: '"start" script found in package.json.', command: runScriptCommand(manager, 'start'), script: 'start' }
  }

  if (scripts.serve) {
    return { reason: '"serve" script found in package.json.', command: runScriptCommand(manager, 'serve'), script: 'serve' }
  }

  return null
}

export interface FrameworkInfo {
  id: string
  name: string
}

const FRAMEWORK_DEPS: Array<{ dep: string; info: FrameworkInfo }> = [
  { dep: 'next', info: { id: 'nextjs', name: 'Next.js' } },
  { dep: 'vite', info: { id: 'vite', name: 'Vite' } },
  { dep: 'react', info: { id: 'react', name: 'React' } },
  { dep: 'vue', info: { id: 'vue', name: 'Vue' } },
  { dep: 'svelte', info: { id: 'svelte', name: 'Svelte' } },
]

export function detectFramework(files: ProjectFilesLike): FrameworkInfo | null {
  const pkg = readPackageJson(files)
  if (!pkg) return null
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  for (const { dep, info } of FRAMEWORK_DEPS) {
    if (deps[dep]) return info
  }
  return null
}
