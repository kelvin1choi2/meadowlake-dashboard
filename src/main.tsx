import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './app/Root'
import { applyTheme, loadTheme } from './app/theme'
import './styles/tokens.css'
import './styles/app.css'
import './styles/saver.css'

// Before the first paint, so a dark wall never flashes white.
applyTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
