import { useEffect, useRef, useState } from 'react'
import { joinRoom, type Room } from '@trystero-p2p/mqtt'
import { normalizeRoomCode, roomTopicId } from '../lib/rooms'

type RoomRole = 'host' | 'camera'

type UseRoomPeerArgs = {
  enabled: boolean
  role: RoomRole
  code: string
  localStream?: MediaStream | null
}

type RoomStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error'

export function useRoomPeer({ enabled, role, code, localStream = null }: UseRoomPeerArgs) {
  const [status, setStatus] = useState<RoomStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const roomRef = useRef<Room | null>(null)
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
    setStatus('connecting')
    setError(null)
    setRemoteStream(null)

    let room: Room
    try {
      room = joinRoom(
        {
          appId: 'eyepaint-maplol',
        },
        roomTopicId(normalized),
      )
    } catch {
      setStatus('error')
      setError('Не удалось открыть комнату. Обнови страницу и попробуй снова.')
      return
    }

    roomRef.current = room

    const pushStream = (peerId?: string) => {
      const stream = localStreamRef.current
      if (!stream || role !== 'camera') return
      void room.addStream(stream, peerId ? { target: peerId } : undefined)
    }

    room.onPeerJoin = (peerId) => {
      if (!active) return
      if (role === 'camera') {
        pushStream(peerId)
        setStatus('connected')
        setError(null)
      } else {
        setStatus((prev) => (prev === 'connected' ? prev : 'waiting'))
      }
    }

    room.onPeerLeave = () => {
      if (!active) return
      if (role === 'host') {
        setRemoteStream(null)
        setStatus('waiting')
      } else {
        setStatus('waiting')
      }
    }

    room.onPeerStream = (stream) => {
      if (!active || role !== 'host') return
      setRemoteStream(stream)
      setStatus('connected')
      setError(null)
    }

    if (role === 'host') {
      setStatus('waiting')
    } else {
      pushStream()
      const peers = Object.keys(room.getPeers())
      if (peers.length > 0) {
        setStatus('connected')
      } else {
        setStatus('waiting')
      }
    }

    return () => {
      active = false
      room.onPeerJoin = null
      room.onPeerLeave = null
      room.onPeerStream = null
      void room.leave()
      roomRef.current = null
      setRemoteStream(null)
      setStatus('idle')
    }
  }, [enabled, role, code])

  // If camera stream appears after room join, publish it.
  useEffect(() => {
    if (!enabled || role !== 'camera' || !localStream) return
    const room = roomRef.current
    if (!room) return
    void room.addStream(localStream)
    const peers = Object.keys(room.getPeers())
    if (peers.length > 0) {
      setStatus('connected')
      setError(null)
    }
  }, [enabled, role, localStream])

  return { status, error, remoteStream }
}
