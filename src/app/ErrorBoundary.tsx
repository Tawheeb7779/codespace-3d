import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error in application tree:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base px-4 text-center">
          <AlertOctagon size={32} className="text-signal-red" />
          <div>
            <h1 className="text-lg font-semibold text-graphite-50">Something went wrong</h1>
            <p className="mt-1 max-w-md text-sm text-graphite-500">
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
