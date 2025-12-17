'use client'

import { useEffect } from 'react'
import { Button } from "@/components/ui/button"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("APP_ERROR:", error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-4 text-center">
            <h2 className="text-2xl font-bold text-destructive">¡Algo salió mal!</h2>
            <div className="bg-destructive/10 p-4 rounded-lg text-left max-w-lg overflow-auto">
                <p className="font-mono text-xs text-destructive">{error.message}</p>
                <p className="text-xs text-muted-foreground mt-2">Digest: {error.digest}</p>
            </div>
            <p className="text-muted-foreground">
                Ha ocurrido un error crítico. Intenta recargar.
            </p>
            <Button
                onClick={() => reset()}
                variant="default"
            >
                Intentar de nuevo
            </Button>
        </div>
    )
}
