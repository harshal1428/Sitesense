"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTenantContext } from "@/lib/tenant-context"

import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { BarChart3, Bot, BookText, Code2, LogOut, Settings } from "lucide-react"

const navItems = [
  { label: "🤖 Bots", href: "/dashboard/bots", icon: Bot },
  { label: "📄 Sources", href: "/dashboard/sources", icon: BookText },
  { label: "📊 Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "🔗 Embed", href: "/dashboard/embed", icon: Code2 },
  { label: "⚙️ Settings", href: "/dashboard/settings", icon: Settings },
] as const

const NONE_VALUE = "__none__"

export function DashboardSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { tenants, activeTenant, setActiveTenant } = useTenantContext()
  const supabase = createSupabaseBrowserClient()

  const selectValue = activeTenant?.id ?? NONE_VALUE

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="size-3 rounded-full bg-primary" />
        <Link href="/dashboard/bots" className="text-lg font-semibold">
          SiteSense AI
        </Link>
      </div>

      <div className="mb-6 px-2">
        <Select
          value={selectValue}
          onValueChange={(value) => {
            if (value === "__create_new__") {
              router.push("/dashboard/bots?create=1")
              return
            }
            if (value === NONE_VALUE) return
            const tenant = tenants.find((t) => t.id === value)
            if (tenant) setActiveTenant(tenant)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a bot" />
          </SelectTrigger>
          <SelectContent>
            {tenants.length === 0 ? (
              <SelectItem value={NONE_VALUE} disabled>
                No bots yet
              </SelectItem>
            ) : (
              tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))
            )}
            <div className="px-2 py-1 text-xs text-muted-foreground">Create new</div>
            <SelectItem value="__create_new__">Create New Bot</SelectItem>
          </SelectContent>
        </Select>

        {activeTenant ? (
          <div className="mt-2 px-1">
            <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">
              Active: {activeTenant.name}
            </Badge>
          </div>
        ) : null}
      </div>

      <nav className="flex flex-col gap-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/dashboard/bots"
              ? pathname.startsWith("/dashboard/bots")
              : pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-2 pt-6 space-y-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        <div className="text-xs text-muted-foreground">v2.0 · Supabase Auth</div>
      </div>
    </aside>
  )
}
