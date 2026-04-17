import * as React from "react"

import { Breadcrumbs } from "./Breadcrumbs"
import { DashboardSidebar } from "./Sidebar"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen flex aurora-bg selection:bg-brand-purple/30">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
        <div className="px-8 pt-6 pb-2">
          <Breadcrumbs />
        </div>
        <main className="flex-1 px-8 pb-12 overflow-y-auto w-full">{children}</main>
      </div>
    </div>
  )
}

