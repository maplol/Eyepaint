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

export function useRoomPeer({ enabled, role, code, localStream = null }: UseRoomPeerArgs) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'connected' | 'error'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const peerRef = useRef<Peer | null>(null)
  const callRef = useRef<MediaConnection | null>(null)
  const retryRef = useRef<number | null>(null)

  useEffect(() => {
    const normalized = normalizeRoomCode(code)
    if (!enabled || normalized.length < 4) {
      setStatus('idle')
      setError(null)
      setRemoteStream(null)
      return
    }

    let active = true
    setStatus('connecting')
    setError(null)
    setRemoteStream(null)

    const peerId = role === 'host' ? hostPeerId(normalized) : cameraPeerId(normalized)
    const peer = new Peer(peerId, {
      debug: 0,
    })
    peerRef.current = peer

    const cleanupCall = () => {
      callRef.current?.close()
      callRef.current = null
      if (retryRef.current) {
        window.clearTimeout(retryRef.current)
        retryRef.current = null
      }
    }

    peer.on('open', () => {
      if (!active) return

      if (role === 'host') {
        setStatus('waiting')
        return
      }

      if (!localStream) {
        setStatus('waiting')
        return
      }

      const connectToHost = () => {
        if (!active || !peerRef.current || peerRef.current.destroyed) return
        cleanupCall()
        setStatus('connecting')
        const call = peerRef.current.call(hostPeerId(normalized), localStream)
        callRef.current = call

        call.on('stream', () => {
          if (!active) return
          setStatus('connected')
        })

        call.on('close', () => {
          if (!active) return
          setStatus('waiting')
          retryRef.current = window.setTimeout(connectToHost, 1600)
        })

        call.on('error', () => {
          if (!active) return
          setStatus('waiting')
          retryRef.current = window.setTimeout(connectToHost, 1600)
        })
      }

      connectToHost()
    })

    peer.on('call', (call) => {
      if (!active || role !== 'host') return
      cleanupCall()
      callRef.current = call
      call.answer()
      call.on('stream', (stream) => {
        if (!active) return
        setRemoteStream(stream)
        setStatus('connected')
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
      if (!active) return
      const message = String(err?.type || err?.message || err)
      if (message.includes('unavailable-id') || message.includes('ID is taken')) {
        setError('Код комнаты занят — создай новый')
      } else if (message.includes('peer-unavailable')) {
        setStatus('waiting')
        return
      } else {
        setError('Не удалось связать устройства. Проверь код и сеть.')
      }
      setStatus('error')
    })

    peer.on('disconnected', () => {
      if (!active) return
      peer.reconnect()
    })

    return () => {
      active = false
      cleanupCall()
      peer.destroy()
      peerRef.current = null
      setRemoteStream(null)
      setStatus('idle')
    }
  }, [enabled, role, code, localStream])

  return { status, error, remoteStream }
}
