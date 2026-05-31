export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12">
      {icon && <div className="mb-3 text-4xl text-gray-400">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-600">{title || 'No data'}</h3>
      {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
