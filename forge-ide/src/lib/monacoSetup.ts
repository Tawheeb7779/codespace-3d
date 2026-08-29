import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
// monaco-editor's package.json "exports" map already prefixes subpaths with
// esm/vs/, so importing with that prefix included would resolve to esm/vs/esm/vs/...
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

/**
 * By default @monaco-editor/react fetches Monaco from a CDN at runtime.
 * That's a third-party network dependency this app shouldn't have (it
 * breaks offline/local-first use and any network-restricted deployment) —
 * point it at the monaco-editor package already bundled with the app, and
 * wire up its web workers the way Vite requires.
 */
declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment
  }
}

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker()
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker()
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker()
      case 'typescript':
      case 'javascript':
        return new tsWorker()
      default:
        return new editorWorker()
    }
  },
}

loader.config({ monaco })
