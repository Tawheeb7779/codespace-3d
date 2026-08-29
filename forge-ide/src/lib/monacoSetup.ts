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

/*
 * Monaco ships `vs-dark`, which paints #1e1e1e — noticeably lighter and
 * cooler than this app's surfaces, so the editor read as a foreign panel
 * dropped into the workspace. These themes map Monaco's chrome onto the
 * same tokens the rest of the UI uses, so the editor is continuous with
 * the pane around it. Syntax colors stay close to a familiar dark palette;
 * the accent (cursor, selection) is the product's ember.
 */
monaco.editor.defineTheme('forge-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5f6b78', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'fb7332' },
    { token: 'string', foreground: '3ecf8e' },
    { token: 'number', foreground: 'f5b93d' },
    { token: 'type', foreground: '8b7cf6' },
    { token: 'function', foreground: 'adb4bd' },
    { token: 'variable', foreground: 'd5d9de' },
    { token: 'delimiter', foreground: '7f8a96' },
  ],
  colors: {
    'editor.background': '#0b0d0f',
    'editor.foreground': '#d5d9de',
    'editorLineNumber.foreground': '#3b434c',
    'editorLineNumber.activeForeground': '#7f8a96',
    'editorCursor.foreground': '#f6540f',
    'editor.selectionBackground': '#f6540f26',
    'editor.inactiveSelectionBackground': '#f6540f14',
    'editor.lineHighlightBackground': '#ffffff08',
    'editorIndentGuide.background1': '#ffffff0d',
    'editorIndentGuide.activeBackground1': '#ffffff1f',
    'editorWidget.background': '#1c2023',
    'editorWidget.border': '#ffffff1f',
    'editorGutter.background': '#0b0d0f',
    'scrollbarSlider.background': '#ffffff14',
    'scrollbarSlider.hoverBackground': '#ffffff24',
    'minimap.background': '#0b0d0f',
  },
})

monaco.editor.defineTheme('forge-light', {
  base: 'vs',
  inherit: true,
  rules: [{ token: 'comment', foreground: '7c8590', fontStyle: 'italic' }],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#16191c',
    'editorLineNumber.foreground': '#c7ccd1',
    'editorLineNumber.activeForeground': '#626b74',
    'editorCursor.foreground': '#e13d05',
    'editor.selectionBackground': '#f6540f26',
    'editor.lineHighlightBackground': '#0000000a',
    'editorGutter.background': '#ffffff',
  },
})

loader.config({ monaco })
