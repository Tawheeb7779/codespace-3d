import { create } from 'zustand'

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint'

export interface DiagnosticEntry {
  path: string
  line: number
  column: number
  severity: DiagnosticSeverity
  message: string
}

/** Mirrors monaco.MarkerSeverity's numeric values (Hint=1, Info=2,
 *  Warning=4, Error=8) without importing the monaco-editor package into
 *  this store — the caller (MonacoEditor) already has it loaded and does
 *  the mapping when it reports markers. */
export interface RawMarker {
  severity: number
  message: string
  startLineNumber: number
  startColumn: number
}

function severityFromMonaco(n: number): DiagnosticSeverity {
  if (n >= 8) return 'error'
  if (n >= 4) return 'warning'
  if (n >= 2) return 'info'
  return 'hint'
}

interface DiagnosticsState {
  /** Real TypeScript/JavaScript diagnostics, keyed by file path — but only
   *  for files that have been opened in the editor at least once (Monaco's
   *  language service only analyzes files with a live model). Kept around
   *  after a tab closes so "problems in a file you just left" don't
   *  silently vanish; cleared when the file itself is deleted. */
  byPath: Record<string, DiagnosticEntry[]>
  setForPath: (path: string, markers: RawMarker[]) => void
  clearPath: (path: string) => void
  reset: () => void
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  byPath: {},

  setForPath: (path, markers) =>
    set((state) => {
      if (markers.length === 0) {
        if (!(path in state.byPath)) return state
        const { [path]: _removed, ...rest } = state.byPath
        return { byPath: rest }
      }
      return {
        byPath: {
          ...state.byPath,
          [path]: markers.map((m) => ({
            path,
            line: m.startLineNumber,
            column: m.startColumn,
            severity: severityFromMonaco(m.severity),
            message: m.message,
          })),
        },
      }
    }),

  clearPath: (path) =>
    set((state) => {
      if (!(path in state.byPath)) return state
      const { [path]: _removed, ...rest } = state.byPath
      return { byPath: rest }
    }),

  reset: () => set({ byPath: {} }),
}))
