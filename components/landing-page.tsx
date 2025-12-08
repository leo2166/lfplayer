import Link from "next/link"
import { Music } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-900 to-pink-900 text-white">
      <div className="bg-card/90 backdrop-blur-sm rounded-xl shadow-2xl p-8 md:p-12 text-center max-w-lg w-full transform transition-all duration-300 hover:scale-105 hover:shadow-purple-500/30">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
            <Music className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Preferencia Musical
          </h1>
        </div>

        <p className="text-lg text-muted-foreground mb-8">
          Mi biblioteca de música personalizada que puedes disfrutar si entras como invitado
        </p>

        <div className="space-y-4">
          <Link href="/app" passHref>
            <Button size="lg" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-transform">
              Continuar como Invitado
            </Button>
          </Link>
          <Link href="/auth/login" passHref>
            <Button size="lg" variant="outline" className="w-full border-purple-400 text-purple-300 hover:bg-purple-900 hover:text-white shadow-lg transform hover:scale-105 transition-transform">
              Iniciar Sesión como Administrador
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
