type ToastProps = {
  message: string
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="absolute left-1/2 top-[calc(var(--safe-top)+4.2rem)] z-[5] -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-strong)] px-4 py-2.5 text-[0.84rem] text-[var(--fg-strong)] backdrop-blur-md animate-[rise-in_0.25s_ease_both]">
      {message}
    </div>
  )
}
