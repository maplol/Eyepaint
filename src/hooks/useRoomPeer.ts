import { useEffect, useRef, useState } from 'react'
import { joinRoom, type Room } from '@trystero-p2p/mqtt'
import { normalizeRoomCode, roomTopicId } from '../lib/rooms'
import {
  applySenderBitrate,
  describeOutbound,
  readOutboundVideoInfo,
  refreshSenderTracks,
  type OutboundVideoInfo,
} from '../lib/videoQuality'

type RoomRole = 'host' | 'camera'

type UseRoomPeerArgs = {
  enabled: boolean
  role: RoomRole
  code: string
  localStream?: MediaStream | null
  /** Target WebRTC video bitrate for the phone sender. */
  maxBitrate?: number
  maxFramerate?: number
}

type RoomStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error'

export function useRoomPeer({
  enabled,
  role,
  code,
  localStream = null,
  maxBitrate = 10_000_000,
  maxFramerate = 30,
}: UseRoomPeerArgs) {
  const [status, setStatus] = useState<RoomStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [outboundInfo, setOutboundInfo] = useState<OutboundVideoInfo | null>(null)
  const roomRef = useRef<Room | null>(null)
  const localStreamRef = useRef(localStream)
  const bitrateRef = useRef(maxBitrate)
  const framerateRef = useRef(maxFramerate)
  const pushedStreamIdRef = useRef<string | null>(null)
  localStreamRef.current = localStream
  bitrateRef.current = maxBitrate
  framerateRef.current = maxFramerate

  useEffect(() => {
    const normalized = normalizeRoomCode(code)
    if (!enabled || normalized.length < 4) {
      setStatus('idle')
      setError(null)
      setRemoteStream(null)
      setOutboundInfo(null)
      pushedStreamIdRef.current = null
      return
    }

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
    setOutboundInfo(null)
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
      void applySenderBitrate(room.getPeers(), bitrateRef.current, framerateRef.current)
    }

    const scheduleBitratePasses = () => {
      bitrateTimers.forEach((id) => window.clearTimeout(id))
      bitrateTimers = [200, 600, 1400, 3200, 6000].map((ms) =>
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
      for (const track of stream.getVideoTracks()) {
        try {
          track.contentHint = 'detail'
        } catch {
          /* optional */
        }
      }
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
      setOutboundInfo(null)
      setStatus('idle')
      pushedStreamIdRef.current = null
    }
  }, [enabled, role, code, localStream])

  // Quality / bitrate changes: rebind track + retune encodings without leaving.
  useEffect(() => {
    if (!enabled || role !== 'camera') return
    const room = roomRef.current
    if (!room) return
    const bitrate = maxBitrate
    const fps = maxFramerate
    void (async () => {
      await refreshSenderTracks(room.getPeers(), localStreamRef.current)
      await applySenderBitrate(room.getPeers(), bitrate, fps)
    })()
    const timers = [300, 1000, 2500, 5000].map((ms) =>
      window.setTimeout(() => {
        void applySenderBitrate(room.getPeers(), bitrate, fps)
      }, ms),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [enabled, role, maxBitrate, maxFramerate, localStream])

  // Poll what is actually encoded to the PC (often lower than camera capture).
  useEffect(() => {
    if (!enabled || role !== 'camera' || status !== 'connected') {
      setOutboundInfo(null)
      return
    }
    let active = true
    const tick = async () => {
      const room = roomRef.current
      if (!room || !active) return
      const info = await readOutboundVideoInfo(room.getPeers())
      if (active && info) setOutboundInfo(info)
    }
    void tick()
    const id = window.setInterval(() => void tick(), 1500)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [enabled, role, status])

  return {
    status,
    error,
    remoteStream,
    outboundInfo,
    outboundLabel: describeOutbound(outboundInfo),
  }
}
