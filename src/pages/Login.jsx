import { SignIn } from '@clerk/clerk-react'
import { clerkTheme } from '../lib/clerkTheme'
import ShaderBackground from '../components/ui/ShaderBackground'

export default function Login() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <ShaderBackground />

      <div className="relative z-10 mb-6 flex flex-col items-center gap-1">
        <span className="font-display text-5xl font-bold cafe-accent-text tracking-tight">
          Café+
        </span>
        <span className="font-body text-sm text-black/60 dark:text-white/50 tracking-wide">
          Sistema de gestión · Cuautitlán
        </span>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <SignIn
          appearance={clerkTheme}
          afterSignInUrl="/"
          routing="hash"
        />
      </div>

      <p className="relative z-10 mt-8 font-body text-xs text-black/60 dark:text-white/50">
        © 2026 Café+ · Todos los derechos reservados
      </p>
    </div>
  )
}
