export type RoomCommand =
  | { type: 'ping'; at: number }
  | { type: 'freeze'; value: boolean }
  | { type: 'torch'; value: boolean }
  | { type: 'exposure'; value: number }
  | { type: 'focus'; x: number; y: number }

export const ROOM_COMMAND_ACTION = 'eyepaint-cmd'

export function isRoomCommand(value: unknown): value is RoomCommand {
  if (!value || typeof value !== 'object') return false
  const type = (value as { type?: unknown }).type
  return (
    type === 'ping' ||
    type === 'freeze' ||
    type === 'torch' ||
    type === 'exposure' ||
    type === 'focus'
  )
}
