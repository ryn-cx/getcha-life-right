import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { Search } from "lucide-react"

import { TasksService } from "@/client"
import { ColumnVisibilityButton } from "@/components/Common/ColumnVisibilityButton"
import { DataTable } from "@/components/Common/DataTable"
import { DataTableSkeleton } from "@/components/Common/DataTableSkeleton"
import { PageHeader } from "@/components/Common/PageHeader"
import { columns } from "@/components/Completions/columns"
import { usePersistedJsonState } from "@/hooks/usePersistedState"

function getCompletionsQueryOptions() {
  return {
    queryFn: () => TasksService.readAllCompletions(),
    queryKey: ["completions"],
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
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

function Completions() {
  const { data: completions, isPlaceholderData } = useQuery(
    getCompletionsQueryOptions(),
  )
  const [columnVisibility, setColumnVisibility] =
    usePersistedJsonState<VisibilityState>("completions-column-visibility", {})

  const data = completions?.data ?? []

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div
      className={
        isPlaceholderData
          ? "flex flex-col gap-6 opacity-60 transition-opacity duration-200"
          : "flex flex-col gap-6"
      }
    >
      <PageHeader
        title="Completions"
        description="View your task completion history"
      >
        <ColumnVisibilityButton table={table} />
      </PageHeader>
      {!completions ? (
        <DataTableSkeleton table={table} />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No completions yet</h3>
          <p className="text-muted-foreground">
            Complete a task to see it recorded here
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          storageKey="completions"
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      )}
    </div>
  )
}
