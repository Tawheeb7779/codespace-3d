import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import type { ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Clipboard, ClipboardPaste, RotateCw, Trash2 } from 'lucide-react'
import type { WebContainerProcess } from '@webcontainer/api'
import { WebContainerService } from '@/services/WebContainerService'
import { useTerminalStore } from '@/stores/terminalStore'
import { toast } from '@/stores/toastStore'
import { useResolvedTheme } from '@/app/useThemeEffect'

/* Matches the surface tokens so the terminal is continuous with the panel
   it sits in, rather than a black box pasted into it — in both themes.
   xterm needs concrete colors (no CSS variables), so these are kept in
   sync with index.css by hand rather than read from it. */
const DARK_THEME: ITheme = {
  background: '#090b0c', // --color-surface-sunken
  foreground: '#d5d9de',
  cursor: '#f6540f',
  cursorAccent: '#090b0c',
  selectionBackground: '#f6540f40',
  black: '#0b0d0f',
  red: '#f2495c',
  green: '#3ecf8e',
  yellow: '#f5b93d',
  blue: '#7f8a96',
  magenta: '#8b7cf6',
  cyan: '#3ecf8e',
  white: '#d5d9de',
  brightBlack: '#5f6b78',
  brightWhite: '#f6f7f8',
}
const LIGHT_THEME: ITheme = {
  background: '#eceef1', // --color-surface-sunken (light)
  foreground: '#2b3036',
  cursor: '#e13d05',
  cursorAccent: '#eceef1',
  selectionBackground: '#f6540f30',
  black: '#16191c',
  red: '#c8203a',
  green: '#0f8a5f',
  yellow: '#8a6008',
  blue: '#454c54',
  magenta: '#6d43d6',
  cyan: '#0f8a7d',
  white: '#454c54',
  brightBlack: '#7c8590',
  brightWhite: '#0b0d0f',
}

/**
 * A real interactive terminal backed by WebContainer's `jsh` shell — not a
 * simulated command list (spec §16). Falls back to an explanatory message
 * when the browser isn't cross-origin isolated (WebContainer's hard
 * requirement) rather than pretending to run commands. Command history is
 * jsh's own (arrow-up works because the shell itself keeps it) — this
 * component doesn't need to reimplement it.
 */
export function Terminal({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const processRef = useRef<WebContainerProcess | null>(null)
  const writeRef = useRef<((data: string) => void) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)
  const resolvedTheme = useResolvedTheme()
  // Read once for the terminal's creation (the mount effect below
  // intentionally never re-runs — recreating it would kill the live shell
  // session just to recolor it); a separate effect keeps the color scheme
  // itself in sync with later theme changes.
  const initialThemeRef = useRef(resolvedTheme)

  function startShell(term: XTerm) {
    let cancelled = false
    const appendToBuffer = useTerminalStore.getState().append
    WebContainerService.spawnShell((chunk) => {
      term.write(chunk)
      appendToBuffer(chunk)
    })
      .then((shell) => {
        if (cancelled) return
        writeRef.current = shell.write
        processRef.current = shell.process
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to start terminal')
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(() => {
    if (!containerRef.current) return
    if (!WebContainerService.isSupported) {
      setError('This context is not cross-origin isolated, so the in-browser terminal cannot start.')
      return
    }

    const term = new XTerm({
      convertEol: true,
      fontFamily: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: 13,
      theme: initialThemeRef.current === 'light' ? LIGHT_THEME : DARK_THEME,
      cursorBlink: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    const cancelSpawn = startShell(term)
    const disposable = term.onData((data) => writeRef.current?.(data))

    const resizeObserver = new ResizeObserver(() => fit.fit())
    resizeObserver.observe(containerRef.current)

    return () => {
      cancelSpawn()
      disposable.dispose()
      resizeObserver.disconnect()
      processRef.current?.kill()
      term.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = resolvedTheme === 'light' ? LIGHT_THEME : DARK_THEME
  }, [resolvedTheme])

  useEffect(() => {
    if (active) fitRef.current?.fit()
  }, [active])

  function handleRestart() {
    const term = termRef.current
    if (!term || restarting) return
    setRestarting(true)
    processRef.current?.kill()
    processRef.current = null
    writeRef.current = null
    term.clear()
    term.reset()
    startShell(term)
    setRestarting(false)
  }

  function handleClear() {
    termRef.current?.clear()
  }

  async function handleCopy() {
    const term = termRef.current
    if (!term) return
    const text = term.getSelection()
    if (!text) {
      toast.info('Nothing to copy', 'Select some text in the terminal first.')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy', 'Clipboard access was denied by the browser.')
    }
  }

  async function handlePaste() {
    if (!writeRef.current) return
    try {
      const text = await navigator.clipboard.readText()
      if (text) writeRef.current(text)
    } catch {
      toast.error('Could not paste', 'Clipboard access was denied by the browser.')
    }
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-graphite-500">{error}</div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-end gap-0.5 border-b border-hairline px-1.5 py-1">
        <button
          onClick={handleCopy}
          aria-label="Copy selection"
          title="Copy selection"
          className="rounded-md p-1.5 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100"
        >
          <Clipboard size={13} />
        </button>
        <button
          onClick={handlePaste}
          aria-label="Paste"
          title="Paste"
          className="rounded-md p-1.5 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100"
        >
          <ClipboardPaste size={13} />
        </button>
        <button
          onClick={handleClear}
          aria-label="Clear terminal"
          title="Clear terminal"
          className="rounded-md p-1.5 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100"
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={handleRestart}
          aria-label="Restart shell"
          title="Restart shell"
          className="rounded-md p-1.5 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100"
        >
          <RotateCw size={13} className={restarting ? 'animate-spin' : ''} />
        </button>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 px-2 py-1.5" />
    </div>
  )
}
