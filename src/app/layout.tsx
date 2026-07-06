import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lighthouse Dashboard',
  description: 'Track Lighthouse performance scores over time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
