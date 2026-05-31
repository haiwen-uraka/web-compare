const variants = {
  added: 'bg-green-100 text-green-800',
  removed: 'bg-red-100 text-red-800',
  changed: 'bg-yellow-100 text-yellow-800',
  neutral: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
}

export default function Badge({ variant = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.neutral}`}>
      {children}
    </span>
  )
}
