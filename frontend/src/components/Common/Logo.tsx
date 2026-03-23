import { Link } from "@tanstack/react-router"
import { CheckCircle } from "lucide-react"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "icon" ? (
      <CheckCircle className={cn("size-5 text-primary", className)} />
    ) : (
      <div className={cn("flex items-center gap-2", className)}>
        <CheckCircle className="size-5 text-primary" />
        <span className="font-bold text-lg tracking-tight">
          Getcha Life Right
        </span>
      </div>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
