import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'
import { FileSystemService } from '@/services/FileSystemService'

describe('editorStore', () => {
  let fs: FileSystemService

  beforeEach(() => {
    fs = new FileSystemService('test-project')
    fs.write('a.txt', 'A')
    fs.write('b.txt', 'B')
    fs.write('c.txt', 'C')
    useEditorStore.getState().reset()
  })

  it('opens a file once, reusing the tab on a second open', () => {
    const { open } = useEditorStore.getState()
    open(fs, 'a.txt')
    open(fs, 'a.txt')
    expect(useEditorStore.getState().tabs).toHaveLength(1)
    expect(useEditorStore.getState().activePath).toBe('a.txt')
  })

  it('openAtLine opens the file and sets a pendingReveal request', () => {
    useEditorStore.getState().openAtLine(fs, 'a.txt', 5, 3)
    const { pendingReveal, activePath } = useEditorStore.getState()
    expect(activePath).toBe('a.txt')
    expect(pendingReveal).toMatchObject({ path: 'a.txt', line: 5, column: 3 })
  })

  it('close pushes the closed path onto closedStack, and reopenLastClosed restores it', () => {
    const { open, close, reopenLastClosed } = useEditorStore.getState()
    open(fs, 'a.txt')
    close('a.txt')
    expect(useEditorStore.getState().tabs).toHaveLength(0)
    expect(useEditorStore.getState().closedStack).toEqual(['a.txt'])

    reopenLastClosed(fs)
    expect(useEditorStore.getState().tabs.map((t) => t.path)).toEqual(['a.txt'])
    expect(useEditorStore.getState().closedStack).toEqual([])
  })

  it('reopenLastClosed pops in LIFO order and skips files that no longer exist', () => {
    const { open, closeAll, reopenLastClosed } = useEditorStore.getState()
    open(fs, 'a.txt')
    open(fs, 'b.txt')
    open(fs, 'c.txt')
    closeAll()
    expect(useEditorStore.getState().closedStack).toEqual(['a.txt', 'b.txt', 'c.txt'])

    fs.delete('b.txt') // simulate the file having been deleted since it closed

    reopenLastClosed(fs) // pops 'c.txt'
    expect(useEditorStore.getState().activePath).toBe('c.txt')

    reopenLastClosed(fs) // pops 'b.txt', skips it (deleted), falls through to 'a.txt'
    expect(useEditorStore.getState().activePath).toBe('a.txt')
    expect(useEditorStore.getState().closedStack).toEqual([])
  })

  it('closeOthers keeps only the given tab and clears any active split', () => {
    const { open, closeOthers, openSplit } = useEditorStore.getState()
    open(fs, 'a.txt')
    open(fs, 'b.txt')
    openSplit('b.txt', 'vertical')
    closeOthers('a.txt')
    expect(useEditorStore.getState().tabs.map((t) => t.path)).toEqual(['a.txt'])
    expect(useEditorStore.getState().split).toBeNull()
  })

  it('closing the tab currently shown in the split pane clears the split', () => {
    const { open, close, openSplit } = useEditorStore.getState()
    open(fs, 'a.txt')
    open(fs, 'b.txt')
    openSplit('b.txt', 'horizontal')
    close('b.txt')
    expect(useEditorStore.getState().split).toBeNull()
  })

  it('openSplit and setSplitPath refuse a path that is not an open tab', () => {
    const { open, openSplit, setSplitPath } = useEditorStore.getState()
    open(fs, 'a.txt')
    openSplit('never-opened.txt', 'vertical')
    expect(useEditorStore.getState().split).toBeNull()

    openSplit('a.txt', 'vertical')
    setSplitPath('also-never-opened.txt')
    expect(useEditorStore.getState().split).toMatchObject({ path: 'a.txt' })
  })
})
