type ToastProps = {
  message: string
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="eyepaint-glass-chip absolute bottom-[calc(var(--safe-bottom)+5.5rem)] left-1/2 z-[25] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2.5 text-[0.84rem] text-[var(--fg-strong)] animate-[rise-in_0.25s_ease_both] min-[960px]:bottom-auto min-[960px]:top-[calc(var(--safe-top)+4.2rem)]">
      {message}
    </div>
  )
}
