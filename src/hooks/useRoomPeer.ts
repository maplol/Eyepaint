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
  const pushedStreamIdRef = useRef<string | null>(null)
  localStreamRef.current = localStream
  qualityRef.current = quality

  useEffect(() => {
    const normalized = normalizeRoomCode(code)
    if (!enabled || normalized.length < 4) {
      setStatus('idle')
      setError(null)
      setRemoteStream(null)
      pushedStreamIdRef.current = null
      return
    }

    // Camera must have a live stream before joining, otherwise peers never get video.
    if (role === 'camera' && !localStream) {
      setStatus('waiting')
      setError(null)
      return
    }

    let active = true
    let retryTimer: number | null = null
    let bitrateTimers: number[] = []
    setStatus('connecting')
    setError(null)
    setRemoteStream(null)
    pushedStreamIdRef.current = null

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

    const scheduleBitratePasses = () => {
      bitrateTimers.forEach((id) => window.clearTimeout(id))
      bitrateTimers = [400, 1200, 2800].map((ms) =>
        window.setTimeout(() => {
          if (active) tuneBitrate()
        }, ms),
      )
    }

    const pushStream = (peerId?: string) => {
      const stream = localStreamRef.current
      if (!stream || role !== 'camera') return
      const streamId = stream.id
      const tasks = room.addStream(stream, peerId ? { target: peerId } : undefined)
      pushedStreamIdRef.current = streamId
      void Promise.all(tasks)
        .then(() => {
          if (!active) return
          scheduleBitratePasses()
        })
        .catch(() => {
          if (!active) return
          setStatus('waiting')
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
      setStatus(peers.length > 0 ? 'connected' : 'waiting')
    }

    // Keep trying to publish while waiting — MQTT discovery can be slow.
    if (role === 'camera') {
      retryTimer = window.setInterval(() => {
        if (!active) return
        const peers = Object.keys(room.getPeers())
        if (peers.length === 0) {
          setStatus('waiting')
          pushStream()
          return
        }
        pushStream()
        setStatus('connected')
        setError(null)
        scheduleBitratePasses()
      }, 2000)
    }

    return () => {
      active = false
      if (retryTimer) window.clearInterval(retryTimer)
      bitrateTimers.forEach((id) => window.clearTimeout(id))
      room.onPeerJoin = null
      room.onPeerLeave = null
      room.onPeerStream = null
      void room.leave()
      roomRef.current = null
      setRemoteStream(null)
      setStatus('idle')
      pushedStreamIdRef.current = null
    }
  }, [enabled, role, code, localStream])

  // Quality changes: retune encodings without leaving the room
  useEffect(() => {
    if (!enabled || role !== 'camera') return
    const room = roomRef.current
    if (!room) return
    const bitrate = QUALITY_PRESETS[quality].maxBitrate
    void applySenderBitrate(room.getPeers(), bitrate)
    const timers = [300, 1000, 2500].map((ms) =>
      window.setTimeout(() => {
        void applySenderBitrate(room.getPeers(), bitrate)
      }, ms),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [enabled, role, quality])

  return { status, error, remoteStream }
}
