import { useEffect, useState, type ReactNode } from 'react'

/**
 * A button that needs two taps: the first arms it ("Tap again to …"), the second runs it.
 * It disarms itself after a few seconds, so a stray tap on a wall tablet does nothing.
 */
export function ConfirmButton({
  children,
  confirm,
  onConfirm,
  danger,
  disabled,
}: {
  children: ReactNode
  /** Shown while armed, e.g. "Tap again to reboot". */
  confirm: string
  onConfirm: () => void
  danger?: boolean
  disabled?: boolean
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      className={`btn${danger ? ' danger' : ''}${armed ? ' armed' : ''}`}
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onConfirm()
      }}
    >
      {armed ? confirm : children}
    </button>
  )
}
