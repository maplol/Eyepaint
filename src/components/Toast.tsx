type ToastProps = {
  message: string
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="eyepaint-glass-chip absolute bottom-[calc(var(--safe-bottom)+5.5rem)] left-1/2 z-[25] w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-full px-4 py-2.5 text-center text-[0.84rem] leading-snug text-[var(--fg-strong)] animate-[rise-in_0.25s_ease_both] min-[960px]:bottom-auto min-[960px]:top-[calc(var(--safe-top)+4.2rem)]">
      {message}
    </div>
  )
}
