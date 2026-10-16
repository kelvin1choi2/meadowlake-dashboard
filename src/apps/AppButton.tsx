import { AppLink } from '../widgets'
import { apps, linkStyle, type AppId } from './apps'

export function AppButton({ id, compact, big }: { id: AppId; compact?: boolean; big?: boolean }) {
  const a = apps[id]
  return <AppLink href={a.web} name={a.name} mark={a.mark} color={`var(--${a.hue})`} compact={compact} big={big} />
}

/** Design A: the link sits in the card's own header. Other designs leave cards alone. */
export function cardApp(id: AppId) {
  return linkStyle === 'a' ? <AppButton id={id} /> : undefined
}
