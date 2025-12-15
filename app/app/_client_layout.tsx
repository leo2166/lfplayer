"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Menu, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import AddMusicDialog from "@/components/add-music-dialog"
import { usePWAInstall } from "@/hooks/usePWAInstall" // Import the PWA install hook
import { AppSidebar } from "./_components/app-sidebar"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAddMusicOpen, setAddMusicOpen] = useState(false)
  const { canInstall, handleInstall } = usePWAInstall() // Use the PWA install hook
  const router = useRouter()


  /* REMOVED: Unused imports/declarations moved to AppSidebar */
  // We keep the state for sidebarOpen and setAddMusicOpen here as they coordinate the layout

  // REMOVED: onAuthStateChange subscription (as before)

  const handleUploadSuccess = () => {
    setAddMusicOpen(false)
    // Add a small delay to give Next.js cache more time to revalidate
    setTimeout(() => {
      router.refresh()
    }, 100);
  }

  // REMOVED: handleSignOut (moved to AppSidebar)
  // REMOVED: navItems (moved to AppSidebar)

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

        {/* Sidebar Component */}
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenAddMusic={() => setAddMusicOpen(true)}
        />

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
          <div className="fixed bottom-4 right-4 z-[60]">
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
