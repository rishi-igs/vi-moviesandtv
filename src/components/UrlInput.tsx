'use client'

import { FormEvent, useState } from 'react'

export default function UrlInput({ onAuditComplete }: { onAuditComplete: () => void }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function normalizeUrl(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const normalizedUrl = normalizeUrl(url)
    if (!normalizedUrl) {
      setError('Please enter a valid URL')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      })

      if (!res.ok) {
        let errorMessage = 'Audit failed'
        try {
          const data = await res.json()
          errorMessage = data?.error || errorMessage
        } catch {
          errorMessage = `Audit request failed with status ${res.status}`
        }
        throw new Error(errorMessage)
      }

      setUrl('')
      if (onAuditComplete) {
        await onAuditComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        required
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Running...' : 'Run Audit'}
      </button>
      {error && <p className="text-red-600 text-sm col-span-full">{error}</p>}
    </form>
  )
}
