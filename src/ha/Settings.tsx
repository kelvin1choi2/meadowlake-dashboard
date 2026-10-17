import { useRef, useState } from 'react'
import { Sheet } from '../app/Sheet'
import type { Link } from '../data/useHouse'
import { Card, Idea, KV, Toggle } from '../widgets'
import { isWindows } from '../apps/apps'
import { setWindowsHelper, windowsHelperOn } from '../apps/helper'
import { clearHaConfig, connectErrorText, connectToHA, haConfig, normalizeHaUrl, saveHaConfig } from './connection'

// Where the Home Assistant address and token are entered on the tablet. They're
// saved in this browser only (see connection.ts) and never leave the device.

export function Settings({ link, onClose }: { link: Link; onClose: () => void }) {
  const saved = haConfig()
  const [url, setUrl] = useState(saved?.url ?? '')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)
  const [helper, setHelper] = useState(windowsHelperOn)

  async function connect() {
    const base = normalizeHaUrl(url)
    if (!base) return setError('Enter the address you use to open Home Assistant, like http://192.168.1.20:8123.')
    if (!token.trim()) return setError('Paste a long-lived access token from Home Assistant.')
    setBusy(true)
    setError(null)
    try {
      const conn = await connectToHA(base, token.trim())
      conn.close()
      saveHaConfig(base, token.trim())
      window.location.reload()
    } catch (err) {
      setError(connectErrorText(err))
      setBusy(false)
    }
  }

  function disconnect() {
    clearHaConfig()
    window.location.reload()
  }

  function copyList() {
    const el = listRef.current
    if (!el) return
    el.select()
    // navigator.clipboard needs https; the NAS serves plain http, so use the older call.
    setCopied(document.execCommand('copy'))
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Card title="Home Assistant" wide>
        {saved && (
          <KV rows={[
            ['Address', saved.url],
            ['Status', link.status === 'live' ? 'Connected' : link.status === 'error' ? "Can't connect" : 'Connecting…'],
            ...(link.status === 'live' ? [['Dashboard items linked', `${link.linked} of ${link.total}`] as [string, string]] : []),
            ...(link.status === 'live' && link.unavailable.length
              ? [['Unavailable right now', link.unavailable.join(', ')] as [string, string]]
              : []),
            ...(link.status === 'live' && link.onSample.length
              ? [['Not in Home Assistant, on sample data', link.onSample.join(', ')] as [string, string]]
              : []),
          ]} />
        )}
        <form className="form" onSubmit={(e) => { e.preventDefault(); void connect() }}>
          <label>
            <span className="lbl">Address</span>
            <input type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="http://192.168.1.20:8123"
              value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label>
            <span className="lbl">Long-lived access token</span>
            <input type="password" autoComplete="off" spellCheck={false} placeholder={saved ? 'Saved. Paste a new one to replace it.' : 'Paste token'}
              value={token} onChange={(e) => setToken(e.target.value)} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="row">
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Connecting…' : saved ? 'Save and reconnect' : 'Connect'}</button>
            {saved && <button className="btn" type="button" onClick={disconnect}>Disconnect and use sample data</button>}
          </div>
        </form>
        <Idea>
          To make a token, open Home Assistant, click your name at the bottom left, open the Security tab and choose
          Create token under Long-lived access tokens. The address and token stay in this browser only.
        </Idea>
      </Card>
      {isWindows(navigator.userAgent, navigator.platform) && (
        <Card title="Apps on this PC" wide>
          <Toggle label="Open Roon, Plex and SmartThings here" on={helper}
            onChange={(on) => { setWindowsHelper(on); setHelper(on); window.location.reload() }} />
          <Idea>
            Needs the small app helper installed on this PC first (docs/windows-apps.md). Without it, those
            buttons open their websites instead.
          </Idea>
        </Card>
      )}
      {link.status === 'live' && (
        <Card title="Entities in your Home Assistant" wide>
          <textarea ref={listRef} className="entity-list" readOnly value={link.entityList()} aria-label="Entity list" />
          <div className="row">
            <button className="btn" type="button" onClick={copyList}>{copied ? 'Copied' : 'Copy list'}</button>
            <span className="muted">Paste this to Claude to link the rest of the dashboard.</span>
          </div>
        </Card>
      )}
    </Sheet>
  )
}
