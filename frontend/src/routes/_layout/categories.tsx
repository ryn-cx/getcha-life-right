import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { Search } from "lucide-react"

import { CategoriesService } from "@/client"
import AddCategory from "@/components/Categories/AddCategory"
import { columns } from "@/components/Categories/columns"
import { ColumnVisibilityButton } from "@/components/Common/ColumnVisibilityButton"
import { DataTable } from "@/components/Common/DataTable"
import { DataTableSkeleton } from "@/components/Common/DataTableSkeleton"
import { PageHeader } from "@/components/Common/PageHeader"
import { usePersistedJsonState } from "@/hooks/usePersistedState"

function getCategoriesQueryOptions() {
  return {
    queryFn: () => CategoriesService.readCategories(),
    queryKey: ["categories"],
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  }
}

export const Route = createFileRoute("/_layout/categories")({
  component: Categories,
  head: () => ({
    meta: [
      {
        title: "Categories - Getcha Life Right",
      },
    ],
  }),
})

function Categories() {
  const { data: categories, isPlaceholderData } = useQuery(
    getCategoriesQueryOptions(),
  )
  const [columnVisibility, setColumnVisibility] =
    usePersistedJsonState<VisibilityState>("categories-column-visibility", {})

  const data = categories?.data ?? []

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
        title="Categories"
        description="Create and manage your categories"
      >
        <ColumnVisibilityButton table={table} />
        <AddCategory />
      </PageHeader>
      {!categories ? (
        <DataTableSkeleton table={table} />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            You don't have any categories yet
          </h3>
          <p className="text-muted-foreground">
            Add a new category to organize your tasks
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          storageKey="categories"
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      )}
    </div>
  )
}
