import type React from "react"
import ClientLayout from "./_client_layout"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientLayout>{children}</ClientLayout>
  )
}
