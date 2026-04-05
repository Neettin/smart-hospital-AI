import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SmartHospital AI',
  description: 'AI-powered hospital appointment and triage system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}