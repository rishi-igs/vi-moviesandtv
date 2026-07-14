const scoreColor = (score: number | null) => {
  if (score === null) return 'bg-gray-200 text-gray-600'
  if (score >= 90) return 'bg-green-100 text-green-800'
  if (score >= 50) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export default function ScoreCard({
  label,
  score,
}: {
  label: string
  score: number | null
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p
        className={`text-2xl font-bold inline-block px-3 py-1 rounded-lg ${scoreColor(score)}`}
      >
        {score !== null ? score : '—'}
      </p>
    </div>
  )
}
