import { useMemo, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/misc'
import { useFileList, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useEditorStore } from '@/stores/editorStore'

interface Hit {
  path: string
  line: number
  text: string
}

export function ProjectSearch() {
  const nodes = useFileList()
  const { fs } = useWorkspace()
  const openTab = useEditorStore((s) => s.open)
  const [query, setQuery] = useState('')
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

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-graphite-800 p-3">
        <div className="relative">
          <SearchIcon size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-graphite-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across files…" className="h-8 pl-8 text-xs" />
        </div>
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
            <p className="truncate px-3 pt-2 text-xs font-medium text-graphite-400">
              {path} <span className="text-graphite-600">({fileHits.length})</span>
            </p>
            {fileHits.slice(0, 20).map((hit, i) => (
              <button
                key={i}
                onClick={() => {
                  openTab(fs, hit.path)
                }}
                className="block w-full truncate px-3 py-1 text-left text-xs text-graphite-500 hover:bg-graphite-850 hover:text-graphite-300"
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
        active ? 'bg-ember-500/20 text-ember-400' : 'bg-graphite-800 text-graphite-500 hover:text-graphite-300',
      )}
    >
      {label}
    </button>
  )
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
