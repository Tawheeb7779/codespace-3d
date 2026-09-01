import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import '@/styles/plate.css'
import { App } from '@/App'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root — check index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
