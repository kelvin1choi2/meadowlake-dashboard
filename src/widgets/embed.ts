/**
 * Whether a page served from `pageUrl` can show `embedUrl` in an iframe.
 *
 * Browsers block http:// frames inside an https:// page (mixed content), so the
 * public demo on GitHub Pages can't show LAN-only pages like the Roon display.
 * Served over http from the Mac Mini, or from `npm run dev`, it works.
 */
export function canEmbed(embedUrl: string, pageUrl: string): boolean {
  try {
    const embed = new URL(embedUrl)
    const page = new URL(pageUrl)
    return !(page.protocol === 'https:' && embed.protocol === 'http:')
  } catch {
    return false
  }
}
