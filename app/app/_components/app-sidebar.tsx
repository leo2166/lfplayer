"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Music, X, ListMusic, PlusCircle, LogOut, FolderUp, Sun, Moon, Printer } from "lucide-react"
import { useTheme } from "next-themes"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUserRole } from "@/contexts/UserRoleContext"
import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import { useState, useEffect } from "react"
import PrintReportDialog from "@/components/print-report-dialog"

interface AppSidebarProps {
    isOpen: boolean
    onClose: () => void
    onOpenAddMusic: () => void
}

export function AppSidebar({ isOpen, onClose, onOpenAddMusic }: AppSidebarProps) {
    const pathname = usePathname()
    const userRole = useUserRole()
    const { closePlayer } = useMusicPlayer()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [isPrintReportOpen, setIsPrintReportOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const isActive = (path: string) => pathname === path

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSignOut = async () => {
        closePlayer()
        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error("Error signing out, forcing redirect:", error)
        }
        router.push("/")
    }

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

    return (
        <>
        <aside
            className={cn(
                "fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform duration-300 md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full",
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
                    <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
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
                                onClick={onClose}
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

                    {/* Add Music Button + Print Report (admin only) */}
                    {userRole === 'admin' && (
                        <>
                            <button
                                onClick={() => {
                                    onOpenAddMusic()
                                    onClose()
                                }}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left",
                                    "text-muted-foreground hover:text-foreground hover:bg-accent",
                                )}
                            >
                                <PlusCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">Agregar Música</span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsPrintReportOpen(true)
                                    onClose()
                                }}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left",
                                    "text-muted-foreground hover:text-foreground hover:bg-accent",
                                )}
                            >
                                <Printer className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                                <span className="font-medium">Imprimir Contenido</span>
                            </button>
                        </>
                    )}

                    {/* Theme Toggle */}
                    <div className="pt-2">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left",
                                "text-muted-foreground hover:text-foreground hover:bg-accent",
                            )}
                        >
                            <div className="relative w-5 h-5 flex-shrink-0">
                                <Sun className="w-5 h-5 absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />
                                <Moon className="w-5 h-5 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
                            </div>
                            <span className="font-medium">
                                {mounted ? (theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro') : 'Cambiar Modo'}
                            </span>
                        </button>
                    </div>

                    {/* Sign Out Button */}
                    <div className="pt-2 border-t border-border">
                        <button
                            onClick={handleSignOut}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left",
                                "text-muted-foreground hover:text-foreground hover:bg-accent",
                            )}
                        >
                            <LogOut className="w-5 h-5 flex-shrink-0 text-red-500" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </nav>

                {/* Footer Info */}
                <div className="p-4 border-t border-border">
                    <div className="text-xs text-muted-foreground text-center">
                        <p>Preferencia Musical v1.3.0</p>
                        <p>Propiedad de Ing. Lucidio Fuenmayor.</p>
                    </div>
                </div>
            </div>
        </aside>

        {/* Print Report Modal — fuera del aside para evitar z-index issues */}
        <PrintReportDialog
            open={isPrintReportOpen}
            onOpenChange={setIsPrintReportOpen}
        />
        </>
    )
}
