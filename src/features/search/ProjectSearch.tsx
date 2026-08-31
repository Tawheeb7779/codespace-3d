import { useMemo, useState } from 'react'
import { Search as SearchIcon, Replace as ReplaceIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { useFileList, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useEditorStore } from '@/stores/editorStore'
import { toast } from '@/stores/toastStore'
import { describeError } from '@/lib/describeError'

interface Hit {
  path: string
  line: number
  text: string
}

/** Builds a global-flagged regex matching the same occurrences the search
 *  above found, so replace operates on exactly what the user sees hits for. */
function buildGlobalMatcher(query: string, regex: boolean, caseSensitive: boolean, wholeWord: boolean): RegExp {
  const flags = `g${caseSensitive ? '' : 'i'}`
  if (regex) return new RegExp(query, flags)
  const escaped = escapeRegex(query)
  return new RegExp(wholeWord ? `\\b${escaped}\\b` : escaped, flags)
}

export function ProjectSearch() {
  const nodes = useFileList()
  const { fs } = useWorkspace()
  const openTabAtLine = useEditorStore((s) => s.openAtLine)
  const [query, setQuery] = useState('')
  const [replaceValue, setReplaceValue] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [regex, setRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)

  const hits = useMemo<Hit[]>(() => {
    if (!query) return []
    let matcher: (line: string) => boolean
    try {
      if (regex) {
        const re = new RegExp(query, caseSensitive ? '' : 'i')
        matcher = (line) => re.test(line)
      } else {
        const needle = caseSensitive ? query : query.toLowerCase()
        const wordRe = wholeWord ? new RegExp(`\\b${escapeRegex(needle)}\\b`, caseSensitive ? '' : 'i') : null
        matcher = (line) => (wordRe ? wordRe.test(line) : (caseSensitive ? line : line.toLowerCase()).includes(needle))
      }
    } catch {
      return []
    }

    const results: Hit[] = []
    for (const node of nodes) {
      if (node.kind !== 'file' || !node.content) continue
      node.content.split('\n').forEach((line, i) => {
        if (matcher(line)) results.push({ path: node.path, line: i + 1, text: line.trim().slice(0, 200) })
      })
      if (results.length > 500) break
    }
    return results
  }, [nodes, query, regex, caseSensitive, wholeWord])

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>()
    for (const hit of hits) {
      if (!map.has(hit.path)) map.set(hit.path, [])
      map.get(hit.path)!.push(hit)
    }
    return Array.from(map.entries())
  }, [hits])

  /**
   * Replaces every match in one file and keeps an already-open editor tab
   * in sync — writing to the fs alone would leave a stale tab buffer that
   * could silently overwrite this change on its next save (spec §28).
   */
  function replaceInFile(path: string): boolean {
    try {
      const matcher = buildGlobalMatcher(query, regex, caseSensitive, wholeWord)
      const current = fs.read(path)
      const updated = current.replace(matcher, replaceValue)
      if (updated === current) return false
      fs.write(path, updated)
      const tab = useEditorStore.getState().tabs.find((t) => t.path === path)
      if (tab) {
        useEditorStore.getState().updateBuffer(path, updated)
        useEditorStore.getState().save(fs, path)
      }
      return true
    } catch (err) {
      toast.error(`Could not replace in ${path}`, describeError(err))
      return false
    }
  }

  function replaceAll() {
    if (!query || !grouped.length) return
    const changed = grouped.filter(([path]) => replaceInFile(path)).length
    toast.success(changed > 0 ? `Replaced in ${changed} file${changed === 1 ? '' : 's'}` : 'Nothing to replace')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-hairline p-3">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <SearchIcon size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-graphite-500" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across files…" className="h-8 pl-8 text-xs" />
          </div>
          <button
            onClick={() => setShowReplace((v) => !v)}
            aria-pressed={showReplace}
            aria-label="Toggle replace"
            title="Toggle replace"
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-control transition-colors duration-150',
              showReplace ? 'bg-surface-hover text-ember-400' : 'text-graphite-500 hover:bg-surface-raised hover:text-graphite-200',
            )}
          >
            <ReplaceIcon size={14} />
          </button>
        </div>

        {showReplace && (
          <div className="flex gap-1.5">
            <Input
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              placeholder="Replace with…"
              className="h-8 flex-1 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 px-2.5 text-xs"
              disabled={!query || hits.length === 0}
              onClick={replaceAll}
            >
              Replace all
            </Button>
          </div>
        )}

        <div className="flex gap-1.5 text-[11px]">
          <ToggleChip active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)} label="Aa" title="Case sensitive" />
          <ToggleChip active={wholeWord} onClick={() => setWholeWord((v) => !v)} label="ab" title="Whole word" />
          <ToggleChip active={regex} onClick={() => setRegex((v) => !v)} label=".*" title="Regex" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {query && hits.length === 0 && <EmptyState title="No results" />}
        {grouped.map(([path, fileHits]) => (
          <div key={path}>
            <div className="flex items-center justify-between gap-2 px-3 pt-2">
              <p className="truncate text-xs font-medium text-graphite-400">
                {path} <span className="text-graphite-600">({fileHits.length})</span>
              </p>
              {showReplace && (
                <button
                  onClick={() => {
                    const changed = replaceInFile(path)
                    if (changed) toast.success(`Replaced in ${path}`)
                  }}
                  className="shrink-0 text-[11px] font-medium text-graphite-500 hover:text-ember-400"
                >
                  Replace
                </button>
              )}
            </div>
            {fileHits.slice(0, 20).map((hit, i) => (
              <button
                key={i}
                onClick={() => {
                  openTabAtLine(fs, hit.path, hit.line)
                }}
                className="block w-full truncate px-3 py-1 text-left text-xs text-graphite-500 hover:bg-surface-raised hover:text-graphite-300"
              >
                <span className="mr-2 text-graphite-600">{hit.line}</span>
                {hit.text}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ToggleChip({ active, onClick, label, title }: { active: boolean; onClick: () => void; label: string; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'rounded px-1.5 py-0.5 font-mono',
        active ? 'bg-ember-500/20 text-ember-400' : 'bg-surface-hover text-graphite-500 hover:text-graphite-300',
      )}
    >
      {label}
    </button>
  )
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
