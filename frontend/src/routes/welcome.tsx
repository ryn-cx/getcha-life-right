import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  ArrowRight,
  CheckCircle,
  FolderOpen,
  RefreshCw,
  Repeat,
} from "lucide-react"

import { Appearance } from "@/components/Common/Appearance"
import { Footer } from "@/components/Common/Footer"
import { Logo } from "@/components/Common/Logo"
import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/welcome")({
  component: Landing,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/tasks" })
    }
  },
  head: () => ({
    meta: [{ title: "Getcha Life Right" }],
  }),
})

const features = [
  {
    icon: CheckCircle,
    title: "Task Management",
    description:
      "Create, organize, and track your tasks with due dates, start dates, and categories.",
  },
  {
    icon: Repeat,
    title: "Smart Recurrence",
    description:
      "Set tasks to repeat on a schedule — daily, weekly, monthly, or on completion.",
  },
  {
    icon: FolderOpen,
    title: "Categories",
    description:
      "Group your tasks into categories to stay organized and focused.",
  },
  {
    icon: RefreshCw,
    title: "Completion Tracking",
    description:
      "Keep a full history of every task you complete. Review and manage your progress.",
  },
]

function Landing() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo variant="full" asLink={false} />
          <div className="flex items-center gap-2">
            <Appearance />
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 sm:py-32">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Get your life right,
              <br />
              <span className="text-primary">one task at a time.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              A simple, powerful task manager with smart recurrence, categories,
              and completion tracking. Stay on top of what matters.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg">
                  Get started
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to stay productive
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border bg-background p-6"
                >
                  <div className="mb-4 inline-flex rounded-md bg-primary/10 p-2.5">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to get organized?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Create a free account and start managing your tasks today.
            </p>
            <div className="mt-8">
              <Link to="/signup">
                <Button size="lg">
                  Create your account
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
