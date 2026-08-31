import { beforeEach, describe, expect, it } from 'vitest'
import { useDiagnosticsStore } from './diagnosticsStore'

describe('diagnosticsStore', () => {
  beforeEach(() => {
    useDiagnosticsStore.getState().reset()
  })

  it('maps Monaco severity numbers to named severities', () => {
    useDiagnosticsStore.getState().setForPath('a.ts', [
      { severity: 8, message: 'error msg', startLineNumber: 1, startColumn: 1 },
      { severity: 4, message: 'warning msg', startLineNumber: 2, startColumn: 1 },
      { severity: 2, message: 'info msg', startLineNumber: 3, startColumn: 1 },
      { severity: 1, message: 'hint msg', startLineNumber: 4, startColumn: 1 },
    ])
    const entries = useDiagnosticsStore.getState().byPath['a.ts']
    expect(entries.map((e) => e.severity)).toEqual(['error', 'warning', 'info', 'hint'])
  })

  it('setting an empty marker list clears that path rather than storing an empty array', () => {
    useDiagnosticsStore.getState().setForPath('a.ts', [{ severity: 8, message: 'x', startLineNumber: 1, startColumn: 1 }])
    expect(useDiagnosticsStore.getState().byPath['a.ts']).toBeDefined()

    useDiagnosticsStore.getState().setForPath('a.ts', [])
    expect(useDiagnosticsStore.getState().byPath['a.ts']).toBeUndefined()
  })

  it('clearPath removes only the given path', () => {
    useDiagnosticsStore.getState().setForPath('a.ts', [{ severity: 8, message: 'x', startLineNumber: 1, startColumn: 1 }])
    useDiagnosticsStore.getState().setForPath('b.ts', [{ severity: 4, message: 'y', startLineNumber: 1, startColumn: 1 }])

    useDiagnosticsStore.getState().clearPath('a.ts')
    expect(useDiagnosticsStore.getState().byPath['a.ts']).toBeUndefined()
    expect(useDiagnosticsStore.getState().byPath['b.ts']).toBeDefined()
  })

  it('reset clears every path', () => {
    useDiagnosticsStore.getState().setForPath('a.ts', [{ severity: 8, message: 'x', startLineNumber: 1, startColumn: 1 }])
    useDiagnosticsStore.getState().reset()
    expect(useDiagnosticsStore.getState().byPath).toEqual({})
  })
})
