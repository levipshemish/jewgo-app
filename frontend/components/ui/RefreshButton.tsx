'use client'

export default function RefreshButton({ onClick }: { onClick?: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      Refresh Status
    </button>
  )
}