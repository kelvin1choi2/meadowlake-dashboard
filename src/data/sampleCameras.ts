// Made-up camera pictures for sample mode and the public demo: simple drawings, so the
// demo shows how the camera boxes look without any real picture of anywhere.

const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">${body}</svg>`)}`

const dusk = '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb6cf"/><stop offset="1" stop-color="#d9d3c4"/></linearGradient></defs><rect width="320" height="180" fill="url(#s)"/>'

export const samplePictures = {
  patio: svg(`${dusk}
    <rect x="0" y="40" width="200" height="90" fill="#b9a99a"/><rect x="20" y="60" width="60" height="70" fill="#6f7f8f"/>
    <rect x="110" y="62" width="56" height="40" fill="#8fa3b5"/><rect x="0" y="126" width="320" height="54" fill="#a39a8c"/>
    <path d="M0 150 L320 140" stroke="#8d8578" stroke-width="2"/>
    <ellipse cx="236" cy="140" rx="34" ry="6" fill="#6b625a"/><rect x="232" y="118" width="8" height="22" fill="#6b625a"/>
    <rect x="200" y="112" width="72" height="6" rx="3" fill="#5d554e"/><path d="M236 40 L260 98 L212 98 Z" fill="#c98f6d"/>
    <rect x="234" y="40" width="4" height="72" fill="#5d554e"/><circle cx="292" cy="112" r="20" fill="#7d9a76"/>`),
  driveway: svg(`${dusk}
    <path d="M0 100 Q80 86 160 96 T320 92 V180 H0 Z" fill="#8fa682"/><path d="M120 180 L150 96 L196 96 L260 180 Z" fill="#a7a29a"/>
    <rect x="18" y="56" width="70" height="46" fill="#b9a99a"/><path d="M12 58 L53 32 L94 58 Z" fill="#8a6f62"/>
    <rect x="44" y="76" width="18" height="26" fill="#6f7f8f"/>
    <rect x="158" y="118" width="70" height="26" rx="8" fill="#5f7590"/><rect x="170" y="106" width="44" height="18" rx="6" fill="#7f95ad"/>
    <circle cx="174" cy="146" r="7" fill="#3f3a36"/><circle cx="214" cy="146" r="7" fill="#3f3a36"/>
    <circle cx="282" cy="78" r="22" fill="#6f8d68"/><rect x="279" y="96" width="6" height="14" fill="#6b5a4c"/>`),
}
