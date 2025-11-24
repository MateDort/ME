import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MEOS - My Operating System',
  description: 'A personal creative space OS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

