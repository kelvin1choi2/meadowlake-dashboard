import { useCallback, useEffect, useRef, useState } from 'react'
import type { Rock, RockCommand } from '../data/types'
import { fetchRock, sendRock } from './rock'

const SLOW = 30_000
const FAST = 2_000
/** After a command, check often for this long so restarts show up quickly. */
const FAST_FOR = 90_000

/**
 * Polls the Roon ROCK's status while `base` is set. `send` runs a command and then
 * polls quickly for a while so the card follows the restart or reboot.
 */
export function useRock(base: string | null): { rock: Rock | null; send: (c: RockCommand) => Promise<void> } {
  const [rock, setRock] = useState<Rock | null>(base ? { status: 'checking' } : null)
  const fastUntil = useRef(0)
  const kick = useRef<() => void>(() => {})

  useEffect(() => {
    if (!base) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let abort: AbortController | undefined
    let stopped = false
    const tick = async () => {
      clearTimeout(timer)
      abort?.abort()
      abort = new AbortController()
      const mine = abort
      const giveUp = setTimeout(() => mine.abort(), 8_000)
      try {
        const next = await fetchRock(base, mine.signal)
        if (!stopped && !mine.signal.aborted) setRock(next)
      } catch {
        if (!stopped && abort === mine) setRock({ status: 'unreachable' })
      } finally {
        clearTimeout(giveUp)
      }
      if (!stopped && abort === mine) timer = setTimeout(tick, Date.now() < fastUntil.current ? FAST : SLOW)
    }
    kick.current = () => void tick()
    void tick()
    return () => {
      stopped = true
      clearTimeout(timer)
      abort?.abort()
      kick.current = () => {}
    }
  }, [base])

  const send = useCallback(
    async (command: RockCommand) => {
      if (!base) throw new Error('No ROCK')
      fastUntil.current = Date.now() + FAST_FOR
      try {
        await sendRock(base, command)
      } finally {
        kick.current()
      }
    },
    [base],
  )

  return { rock, send }
}
