import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { WebContainerService } from '@/services/WebContainerService'
import { useTerminalStore } from '@/stores/terminalStore'

/* Matches the surface tokens so the terminal is continuous with the panel
   it sits in, rather than a black box pasted into it. */
const THEME = {
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

/**
 * A real interactive terminal backed by WebContainer's `jsh` shell — not a
 * simulated command list (spec §16). Falls back to an explanatory message
 * when the browser isn't cross-origin isolated (WebContainer's hard
 * requirement) rather than pretending to run commands.
 */
export function Terminal({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (!WebContainerService.isSupported) {
      setError('This context is not cross-origin isolated, so the in-browser terminal cannot start.')
      return
    }

    const term = new XTerm({
      convertEol: true,
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      theme: THEME,
      cursorBlink: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    let disposed = false
    let write: ((data: string) => void) | null = null

    const appendToBuffer = useTerminalStore.getState().append
    WebContainerService.spawnShell((chunk) => {
      term.write(chunk)
      appendToBuffer(chunk)
    })
      .then((shell) => {
        if (disposed) return
        write = shell.write
      })
      .catch((err) => {
        if (!disposed) setError(err instanceof Error ? err.message : 'Failed to start terminal')
      })

    const disposable = term.onData((data) => write?.(data))

    const resizeObserver = new ResizeObserver(() => fit.fit())
    resizeObserver.observe(containerRef.current)

    return () => {
      disposed = true
      disposable.dispose()
      resizeObserver.disconnect()
      term.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (active) fitRef.current?.fit()
  }, [active])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-graphite-500">{error}</div>
    )
  }

  return <div ref={containerRef} className="h-full w-full px-2 py-1.5" />
}
