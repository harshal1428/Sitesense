import * as React from "react"

import { Breadcrumbs } from "./Breadcrumbs"
import { DashboardSidebar } from "./Sidebar"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-6 pb-3">
          <Breadcrumbs />
        </div>
        <main className="flex-1 px-6 pb-10">{children}</main>
      </div>
    </div>
  )
}

