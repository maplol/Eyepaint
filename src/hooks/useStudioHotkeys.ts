import { useEffect, useState } from 'react'
import {
  formatHotkey,
  loadHotkeys,
  normalizeHotkey,
  resolveDragMode,
  saveHotkeys,
  type HotkeyAction,
  type HotkeyMap,
} from '../lib/hotkeys'

function eventToHotkey(event: KeyboardEvent) {
  if (event.code === 'Space' || event.key === ' ') return ' '
  if (event.key.length === 1) return event.key.toLowerCase()
  return event.key
}

export function useStudioHotkeys(enabled: boolean) {
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(() => loadHotkeys())
  const [heldKeys, setHeldKeys] = useState<Set<string>>(() => new Set())
  const [listeningFor, setListeningFor] = useState<HotkeyAction | null>(null)

  const dragMode = resolveDragMode(heldKeys, hotkeys)

  useEffect(() => {
    saveHotkeys(hotkeys)
  }, [hotkeys])

  useEffect(() => {
    if (!enabled) {
      setHeldKeys(new Set())
      setListeningFor(null)
      return
    }

    const onDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      const key = eventToHotkey(event)

      if (listeningFor) {
        event.preventDefault()
        const nextKey = normalizeHotkey(key)
        setHotkeys((prev) => ({ ...prev, [listeningFor]: nextKey }))
        setListeningFor(null)
        return
      }

      const isHotkey = Object.values(hotkeys).includes(normalizeHotkey(key))
      if (!isHotkey) return
      event.preventDefault()
      setHeldKeys((prev) => {
        const next = new Set(prev)
        next.add(normalizeHotkey(key))
        return next
      })
    }

    const onUp = (event: KeyboardEvent) => {
      const key = normalizeHotkey(eventToHotkey(event))
      setHeldKeys((prev) => {
        if (!prev.has(key)) return prev
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }

    const onBlur = () => setHeldKeys(new Set())

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [enabled, hotkeys, listeningFor])

  return {
    hotkeys,
    setHotkeys,
    dragMode,
    listeningFor,
    setListeningFor,
    formatHotkey,
  }
}
