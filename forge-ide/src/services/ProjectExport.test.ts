import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { importZipIntoProject } from './ProjectExport'
import { FileSystemService } from './FileSystemService'

describe('importZipIntoProject', () => {
  it('imports well-formed entries', async () => {
    const zip = new JSZip()
    zip.file('src/index.js', 'console.log(1)')
    zip.file('package.json', '{}')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importZipIntoProject(blob, 'imported-1')
    expect(result.imported).toBe(2)
    expect(result.skipped).toHaveLength(0)

    const fs = await FileSystemService.load('imported-1')
    expect(fs.read('src/index.js')).toBe('console.log(1)')
  })

  it('rejects entries JSZip itself does not normalize (e.g. literal backslashes) instead of writing them blindly', async () => {
    // JSZip resolves forward-slash ".." segments itself when reading/writing
    // entries, but it treats backslashes as literal characters (only "/" is
    // a directory separator in the zip spec) — so a crafted archive can still
    // hand us a raw "..\\..\\windows\\win.ini"-style name. normalizeProjectPath
    // must catch what JSZip doesn't.
    const zip = new JSZip()
    zip.file('..\\..\\windows\\win.ini', 'malicious')
    zip.file('safe.txt', 'ok')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importZipIntoProject(blob, 'imported-2')
    expect(result.imported).toBe(1)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].path).toContain('win.ini')

    const fs = await FileSystemService.load('imported-2')
    expect(fs.read('safe.txt')).toBe('ok')
  })

  it('refuses to import entries under .git/, reserved for the Git subsystem', async () => {
    const zip = new JSZip()
    zip.file('.git/config', '[core]\n\tbare = false')
    zip.file('.git/HEAD', 'ref: refs/heads/main')
    zip.file('safe.txt', 'ok')
    const blob = await zip.generateAsync({ type: 'blob' })

    const result = await importZipIntoProject(blob, 'imported-3')
    expect(result.imported).toBe(1)
    expect(result.skipped).toHaveLength(2)
    expect(result.skipped.every((s) => s.reason.includes('.git/'))).toBe(true)

    const fs = await FileSystemService.load('imported-3')
    expect(fs.exists('.git/config')).toBe(false)
    expect(fs.exists('.git/HEAD')).toBe(false)
    expect(fs.read('safe.txt')).toBe('ok')
  })
})
