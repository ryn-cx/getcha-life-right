import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Suspense } from "react"

import { TasksService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { columns } from "@/components/Completions/columns"
import PendingCompletions from "@/components/Pending/PendingCompletions"

function getCompletionsQueryOptions() {
  return {
    queryFn: () => TasksService.readAllCompletions(),
    queryKey: ["completions"],
  }
}

export const Route = createFileRoute("/_layout/completions")({
  component: Completions,
  head: () => ({
    meta: [
      {
        title: "Completions - Getcha Life Right",
      },
    ],
  }),
})

function CompletionsTableContent() {
  const { data: completions } = useSuspenseQuery(getCompletionsQueryOptions())

  if (completions.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No completions yet</h3>
        <p className="text-muted-foreground">
          Complete a task to see it recorded here
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={completions.data} />
}

function CompletionsTable() {
  return (
    <Suspense fallback={<PendingCompletions />}>
      <CompletionsTableContent />
    </Suspense>
  )
}

function Completions() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Completions</h1>
        <p className="text-muted-foreground">
          View your task completion history
        </p>
      </div>
      <CompletionsTable />
    </div>
  )
}
