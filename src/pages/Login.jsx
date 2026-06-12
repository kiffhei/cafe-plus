import { SignIn } from '@clerk/clerk-react'
import { clerkTheme } from '../lib/clerkTheme'

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fffe] via-[#e8f5f0] to-[#d4ede4] dark:from-[#0d1b2a] dark:via-[#0d2d1f] dark:to-[#0a1a12] px-4">

      <div className="mb-6 flex flex-col items-center gap-1">
        <span className="font-display text-5xl font-bold text-cafe-500 dark:text-cafe-300 tracking-tight">
          Café+
        </span>
        <span className="font-body text-sm text-gray-500 dark:text-gray-400 tracking-wide">
          Sistema de gestión · Cuautitlán
        </span>
      </div>

      <div className="w-full max-w-md">
        <SignIn
          appearance={clerkTheme}
          afterSignInUrl="/"
          routing="hash"
        />
      </div>

      <p className="mt-8 font-body text-xs text-gray-400 dark:text-gray-600">
        © 2026 Café+ · Todos los derechos reservados
      </p>
    </div>
  )
}
