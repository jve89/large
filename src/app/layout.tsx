import type { ReactNode } from 'react'
import { validateEnv } from '../lib/env.ts'
import './globals.css'

// The web role validates its own environment at startup and fails loudly if a
// variable it needs is absent (SPEC C13). The role is passed as an argument, not
// read from the environment: a variable could be set wrongly on a service, an
// argument cannot. The provider API keys are deliberately not required here — the
// web process never calls a provider.
validateEnv('web')

export const metadata = {
  title: 'Large AI',
  description: 'How often and how prominently a brand appears in LLM answers.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
      </body>
    </html>
  )
}
