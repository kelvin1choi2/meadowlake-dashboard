import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { TvApp } from './tv/TvApp'
import './styles/tokens.css'
import './styles/app.css'
import './styles/tv.css'

/** `?tv` opens the 10-foot view for a television; everything else gets the tablet dashboard. */
const tv = new URLSearchParams(window.location.search).has('tv')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {tv ? <TvApp /> : <App />}
  </StrictMode>,
)
