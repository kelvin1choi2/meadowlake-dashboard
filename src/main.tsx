import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './app/Root'
import './styles/tokens.css'
import './styles/app.css'
import './styles/saver.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
