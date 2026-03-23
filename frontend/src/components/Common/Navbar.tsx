import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import {
  Briefcase,
  CheckCircle,
  FolderOpen,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react"
import { useState } from "react"

import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { getInitials } from "@/utils"

const navItems = [
  { icon: Briefcase, title: "Tasks", path: "/tasks" },
  { icon: FolderOpen, title: "Categories", path: "/categories" },
  { icon: CheckCircle, title: "Completions", path: "/completions" },
]

export function Navbar() {
  const { user: currentUser, logout } = useAuth()
  const router = useRouterState()
  const currentPath = router.location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)

  const allItems = navItems

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        <RouterLink to="/" className="mr-6 shrink-0">
          <Logo variant="full" asLink={false} />
        </RouterLink>

        <nav className="hidden md:flex items-center gap-1">
          {allItems.map((item) => {
            const isActive = currentPath === item.path
            return (
              <RouterLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.title}
              </RouterLink>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Appearance />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                data-testid="user-menu"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-zinc-600 text-white text-xs">
                    {getInitials(currentUser?.full_name || "User")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {currentUser?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentUser?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <RouterLink to="/settings">
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
              </RouterLink>
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 size-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t md:hidden">
          <div className="flex flex-col px-4 py-2">
            {allItems.map((item) => {
              const isActive = currentPath === item.path
              return (
                <RouterLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </RouterLink>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
