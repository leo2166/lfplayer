import type React from "react"
import ClientLayout from "./_client_layout"
import { createClient } from "@/lib/supabase/server"
import { UserRoleProvider } from "@/contexts/UserRoleContext"

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole = "guest" // Default to guest if no user or profile

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    
    if (profile?.role) {
      userRole = profile.role
    }
  }

  console.log("User role determined on server:", userRole)

  return (
    <UserRoleProvider initialRole={userRole as any}>
      <ClientLayout>{children}</ClientLayout>
    </UserRoleProvider>
  )
}
