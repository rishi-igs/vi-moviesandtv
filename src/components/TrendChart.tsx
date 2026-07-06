'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface AuditData {
  createdAt: string
  performanceScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  seoScore: number | null
}

export default function TrendChart({ audits }: { audits: AuditData[] }) {
  if (audits.length === 0) {
    return <p className="text-gray-500 text-center py-8">No audit data yet</p>
  }

  const data = [...audits].reverse().map((a) => ({
    date: new Date(a.createdAt).toLocaleDateString(),
    Performance: a.performanceScore,
    Accessibility: a.accessibilityScore,
    'Best Practices': a.bestPracticesScore,
    SEO: a.seoScore,
  }))

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Score Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis domain={[0, 100]} fontSize={12} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="Performance"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="Accessibility"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="Best Practices"
            stroke="#d97706"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="SEO"
            stroke="#9333ea"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
