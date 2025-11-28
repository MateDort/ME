'use client'

interface WebsiteAppProps {
  url?: string
  title?: string
}

export default function WebsiteApp({ url, title }: WebsiteAppProps) {
  return (
    <div className="h-full flex flex-col bg-[#0b0b10] text-white">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>🌐</span>
          <span>{title || 'Website'}</span>
        </div>
        {url && (
          <span className="text-xs text-white/60 truncate max-w-xs" title={url}>
            {url}
          </span>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center px-6 text-center text-xs text-white/70">
        <p>
          This website is opened in a separate Electron window at{' '}
          <span className="font-mono text-white">{url || 'unknown URL'}</span>. Use the
          MEOS window manager and dock to switch between apps, or close the external
          window to remove this entry.
        </p>
      </div>
    </div>
  )
}


