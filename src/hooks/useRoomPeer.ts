import { useEffect, useRef, useState } from 'react'
import Peer, { type MediaConnection } from 'peerjs'
import { cameraPeerId, hostPeerId, normalizeRoomCode } from '../lib/rooms'

type RoomRole = 'host' | 'camera'

type UseRoomPeerArgs = {
  enabled: boolean
  role: RoomRole
  code: string
  localStream?: MediaStream | null
}

type RoomStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error'

function errorType(err: unknown) {
  if (err && typeof err === 'object' && 'type' in err) {
    return String((err as { type?: string }).type)
  }
  return String(err ?? '')
}

export function useRoomPeer({ enabled, role, code, localStream = null }: UseRoomPeerArgs) {
  const [status, setStatus] = useState<RoomStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const peerRef = useRef<Peer | null>(null)
  const callRef = useRef<MediaConnection | null>(null)
  const retryRef = useRef<number | null>(null)
  const localStreamRef = useRef(localStream)
  localStreamRef.current = localStream

  useEffect(() => {
    const normalized = normalizeRoomCode(code)
    if (!enabled || normalized.length < 4) {
      setStatus('idle')
      setError(null)
      setRemoteStream(null)
      return
    }

    let active = true
    let attempt = 0

    const clearRetry = () => {
      if (retryRef.current) {
        window.clearTimeout(retryRef.current)
        retryRef.current = null
      }
    }

    const cleanupCall = () => {
      callRef.current?.close()
      callRef.current = null
    }

    const schedule = (fn: () => void, ms: number) => {
      clearRetry()
      retryRef.current = window.setTimeout(fn, ms)
    }

    const destroyPeer = () => {
      cleanupCall()
      clearRetry()
      peerRef.current?.destroy()
      peerRef.current = null
    }

    const markConnected = () => {
      if (!active) return
      setError(null)
      setStatus('connected')
    }

    const watchIce = (call: MediaConnection) => {
      const pc = call.peerConnection
      if (!pc) return
      const onState = () => {
        if (!active) return
        if (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected') {
          markConnected()
        }
      }
      pc.addEventListener('connectionstatechange', onState)
      pc.addEventListener('iceconnectionstatechange', onState)
    }

    const startCameraCall = (peer: Peer) => {
      const stream = localStreamRef.current
      if (!stream) {
        setStatus('waiting')
        schedule(() => {
          if (active && peerRef.current === peer) startCameraCall(peer)
        }, 1000)
        return
      }

      cleanupCall()
      setStatus('connecting')
      setError(null)

      const call = peer.call(hostPeerId(normalized), stream, {
        metadata: { role: 'camera' },
      })
      callRef.current = call
      watchIce(call)

      // One-way stream: host may not send video back.
      call.on('stream', () => markConnected())

      call.on('close', () => {
        if (!active) return
        setStatus('waiting')
        schedule(() => {
          if (active && peerRef.current === peer) startCameraCall(peer)
        }, 1400)
      })

      call.on('error', () => {
        if (!active) return
        setStatus('waiting')
        schedule(() => {
          if (active && peerRef.current === peer) startCameraCall(peer)
        }, 1400)
      })

      // If host answered without return stream, still treat as linked shortly.
      schedule(() => {
        if (!active || callRef.current !== call) return
        if (call.open) markConnected()
      }, 1200)
    }

    const boot = () => {
      if (!active) return
      attempt += 1
      destroyPeer()
      setStatus('connecting')
      setError(null)
      setRemoteStream(null)

      // Camera peer id is unique each attempt to avoid StrictMode / refresh collisions.
      const peerId =
        role === 'host'
          ? hostPeerId(normalized)
          : `${cameraPeerId(normalized)}-${Math.random().toString(36).slice(2, 7)}`

      const peer = new Peer(peerId, {
        debug: 1,
        secure: true,
      })
      peerRef.current = peer

      peer.on('open', () => {
        if (!active || peerRef.current !== peer) return
        if (role === 'host') {
          setStatus('waiting')
          return
        }
        startCameraCall(peer)
      })

      peer.on('call', (call) => {
        if (!active || role !== 'host' || peerRef.current !== peer) return
        cleanupCall()
        callRef.current = call
        call.answer()
        watchIce(call)

        call.on('stream', (stream) => {
          if (!active) return
          setRemoteStream(stream)
          markConnected()
        })

        call.on('close', () => {
          if (!active) return
          setRemoteStream(null)
          setStatus('waiting')
        })

        call.on('error', () => {
          if (!active) return
          setRemoteStream(null)
          setStatus('waiting')
        })
      })

      peer.on('error', (err) => {
        if (!active || peerRef.current !== peer) return
        const type = errorType(err)

        if (type === 'peer-unavailable' || type === 'network') {
          setStatus('waiting')
          if (role === 'camera') {
            schedule(() => {
              if (active && peerRef.current === peer) startCameraCall(peer)
            }, 1600)
          }
          return
        }

        if (type === 'unavailable-id') {
          // Common after refresh / React StrictMode — retry boot.
          if (attempt < 6) {
            setStatus('connecting')
            schedule(boot, 700)
            return
          }
          setError('Код занят сервером связи. Нажми «Новый код» или подожди пару секунд.')
          setStatus('error')
          return
        }

        if (type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
          if (attempt < 5) {
            schedule(boot, 1200)
            return
          }
        }

        setError('Не удалось связать устройства. Проверь, что код одинаковый и оба онлайн.')
        setStatus('error')
      })

      peer.on('disconnected', () => {
        if (!active || peerRef.current !== peer) return
        try {
          peer.reconnect()
        } catch {
          schedule(boot, 1000)
        }
      })
    }

    boot()

    return () => {
      active = false
      destroyPeer()
      setRemoteStream(null)
      setStatus('idle')
    }
  }, [enabled, role, code])

  return { status, error, remoteStream }
}
