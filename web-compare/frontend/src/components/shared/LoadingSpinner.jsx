export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
      <div className={`${sizes[size]} relative`}>
        <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#E8E8ED" strokeWidth="3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#007AFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      {text && <p className="text-[13px] font-medium text-apple-gray-400 tracking-tight">{text}</p>}
    </div>
  )
}
