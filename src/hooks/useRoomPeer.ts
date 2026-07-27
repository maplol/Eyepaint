import { useEffect, useRef, useState } from 'react'
import { joinRoom, type Room } from '@trystero-p2p/mqtt'
import { normalizeRoomCode, roomTopicId } from '../lib/rooms'
import { applySenderBitrate, QUALITY_PRESETS, type VideoQuality } from '../lib/videoQuality'

type RoomRole = 'host' | 'camera'

type UseRoomPeerArgs = {
  enabled: boolean
  role: RoomRole
  code: string
  localStream?: MediaStream | null
  quality?: VideoQuality
}

type RoomStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error'

export function useRoomPeer({
  enabled,
  role,
  code,
  localStream = null,
  quality = 'high',
}: UseRoomPeerArgs) {
  const [status, setStatus] = useState<RoomStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const roomRef = useRef<Room | null>(null)
  const localStreamRef = useRef(localStream)
  const qualityRef = useRef(quality)
  localStreamRef.current = localStream
  qualityRef.current = quality

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

    const tuneBitrate = () => {
      const bitrate = QUALITY_PRESETS[qualityRef.current].maxBitrate
      void applySenderBitrate(room.getPeers(), bitrate)
    }

    const pushStream = (peerId?: string) => {
      const stream = localStreamRef.current
      if (!stream || role !== 'camera') return
      const tasks = room.addStream(stream, peerId ? { target: peerId } : undefined)
      void Promise.all(tasks).then(() => {
        if (active) tuneBitrate()
      })
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

  useEffect(() => {
    if (!enabled || role !== 'camera' || !localStream) return
    const room = roomRef.current
    if (!room) return
    const tasks = room.addStream(localStream)
    void Promise.all(tasks).then(() => {
      void applySenderBitrate(room.getPeers(), QUALITY_PRESETS[quality].maxBitrate)
    })
    const peers = Object.keys(room.getPeers())
    if (peers.length > 0) {
      setStatus('connected')
      setError(null)
    }
  }, [enabled, role, localStream, quality])

  return { status, error, remoteStream }
}
