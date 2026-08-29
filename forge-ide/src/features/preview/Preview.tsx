import { useState } from 'react'
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { useRuntimeStore } from '@/stores/runtimeStore'

type Device = 'desktop' | 'tablet' | 'mobile'

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
}

export function Preview() {
  const { status, previewUrl, errorMessage } = useRuntimeStore((s) => ({
    status: s.status,
    previewUrl: s.previewUrl,
    errorMessage: s.errorMessage,
  }))
  const [device, setDevice] = useState<Device>('desktop')
  const [reloadKey, setReloadKey] = useState(0)

  return (
    <div className="flex h-full flex-col bg-graphite-900">
      <div className="flex items-center justify-between border-b border-graphite-800 px-3 py-1.5">
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => {
            const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={clsx('rounded p-1.5', device === d ? 'bg-graphite-800 text-graphite-100' : 'text-graphite-500 hover:text-graphite-300')}
                aria-label={`${d} preview`}
              >
                <Icon size={14} />
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setReloadKey((k) => k + 1)} disabled={!previewUrl} aria-label="Refresh preview">
            <RefreshCw size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => previewUrl && window.open(previewUrl, '_blank', 'noopener')}
            disabled={!previewUrl}
            aria-label="Open in new tab"
          >
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto bg-graphite-950 p-3">
        {previewUrl ? (
          <iframe
            key={reloadKey}
            src={previewUrl}
            title="Project preview"
            className="h-full rounded-md border border-graphite-800 bg-white"
            style={{ width: DEVICE_WIDTH[device] }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="max-w-xs text-center text-sm text-graphite-500">
            {status === 'unsupported' && 'This browser context cannot run the in-browser runtime (not cross-origin isolated).'}
            {status === 'error' && (errorMessage ?? 'The runtime hit an error.')}
            {status === 'idle' && 'Run the project to see a live preview here.'}
            {(status === 'installing' || status === 'starting') && 'Starting your project…'}
            {status === 'stopped' && 'The project isn\'t running.'}
          </div>
        )}
      </div>
    </div>
  )
}
