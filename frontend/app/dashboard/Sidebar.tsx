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
    <aside className="flex w-72 shrink-0 flex-col glass border-r border-white/5 px-4 py-8 relative z-20">
      <div className="mb-8 flex items-center gap-4 px-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-[0_0_20px_-5px_rgba(139,92,246,0.6)]">
          <Bot className="text-white size-6" />
        </div>
        <Link href="/dashboard/bots" className="text-xl font-bold font-heading tracking-tight text-gradient">
          SiteSense
        </Link>
      </div>

      <div className="mb-10 px-2">
        <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3 ml-1 opacity-50">
          Intelligence Node
        </div>
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
          <SelectTrigger className="w-full bg-white/5 border-white/10 h-11 rounded-xl focus:ring-brand-purple/20">
            <SelectValue placeholder="Select a bot" />
          </SelectTrigger>
          <SelectContent className="glass-premium border-white/10 rounded-xl text-white">
            {tenants.length === 0 ? (
              <SelectItem value={NONE_VALUE} disabled>
                No bots yet
              </SelectItem>
            ) : (
              tenants.map((t) => (
                <SelectItem key={t.id} value={t.id} className="focus:bg-brand-purple/20 focus:text-white">
                  {t.name}
                </SelectItem>
              ))
            )}
            <div className="px-2 py-1 text-xs text-muted-foreground">Create new</div>
            <SelectItem value="__create_new__" className="focus:bg-brand-purple/20 focus:text-white">
              Create New Bot
            </SelectItem>
          </SelectContent>
        </Select>

        {activeTenant ? (
          <div className="mt-3 px-1 animate-in fade-in slide-in-from-left-2 duration-500">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-brand-purple w-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            </div>
          </div>
        ) : null}
      </div>

      <nav className="flex flex-col gap-2 px-1">
        <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2 ml-2 opacity-50">
          Management
        </div>
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
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group",
                isActive 
                  ? "bg-brand-purple/15 text-brand-purple border border-brand-purple/20 shadow-[0_0_20px_-10px_rgba(139,92,246,0.3)]" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("size-5", isActive ? "text-brand-purple" : "text-slate-400 group-hover:text-white transition-colors")} />
              <span>{item.label.replace(/^[^\s]+\s+/, "")}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-2 pt-6 pb-2 space-y-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-400/10 h-12 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span className="font-heading">SIGN OUT</span>
        </Button>
        <div className="flex items-center justify-between px-2 text-[10px] font-bold tracking-widest text-muted-foreground opacity-30">
          <span>SITESENSE AI</span>
          <span>V2.0</span>
        </div>
      </div>
    </aside>
  )
}
