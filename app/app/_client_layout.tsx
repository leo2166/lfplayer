"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Music, Menu, X, ListMusic, PlusCircle, Download, LogOut } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import AddMusicDialog from "@/components/add-music-dialog"
import { useUserRole } from "@/contexts/UserRoleContext"
import { usePWAInstall } from "@/hooks/usePWAInstall" // Import the PWA install hook

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userRole = useUserRole()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAddMusicOpen, setAddMusicOpen] = useState(false)
  const { canInstall, handleInstall } = usePWAInstall() // Use the PWA install hook

  const navItems = [
    {
      label: "Mi Música",
      href: "/app",
      icon: Music,
    },
    {
      label: "Playlists",
      href: "/app/playlists",
      icon: ListMusic,
    },
  ]

  const handleUploadSuccess = () => {
    setAddMusicOpen(false)
    router.refresh()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <>
      <AddMusicDialog
        open={isAddMusicOpen}
        onOpenChange={setAddMusicOpen}
        onUploadSuccess={handleUploadSuccess}
      />
      <div className="flex h-screen bg-background">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 md:hidden bg-black/50" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform duration-300 md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link href="/app" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white">
                  <Music className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  Preferencia Musical
                </span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="md:hidden">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                      isActive
                        ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}

              {/* Add Music Button */}
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    setAddMusicOpen(true)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left",
                    "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <PlusCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Agregar Música</span>
                </button>
              )}
            </nav>

            {/* Footer Info & Logout */}
            <div className="p-4 border-t border-border">
              {userRole !== 'guest' && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left text-muted-foreground hover:text-foreground hover:bg-accent mb-2"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Cerrar Sesión</span>
                </button>
              )}
              <div className="text-xs text-muted-foreground text-center">
                <p>Preferencia Musical v1.0</p>
                <p>Propiedad de Ing. Lucidio Fuenmayor.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-30 md:hidden border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                Preferencia Musical
              </h1>
              <div className="w-10" />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>

        {/* PWA Install Button */}
        {canInstall && (
          <div className="fixed bottom-4 right-4 z-50">
            <Button
              onClick={handleInstall}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Instalar App
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
