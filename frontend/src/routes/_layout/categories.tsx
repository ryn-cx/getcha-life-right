import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Suspense } from "react"

import { CategoriesService } from "@/client"
import AddCategory from "@/components/Categories/AddCategory"
import { columns } from "@/components/Categories/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingCategories from "@/components/Pending/PendingCategories"

function getCategoriesQueryOptions() {
  return {
    queryFn: () => CategoriesService.readCategories(),
    queryKey: ["categories"],
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

function CategoriesTableContent() {
  const { data: categories } = useSuspenseQuery(getCategoriesQueryOptions())

  if (categories.data.length === 0) {
    return (
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
    )
  }

  return <DataTable columns={columns} data={categories.data} />
}

function CategoriesTable() {
  return (
    <Suspense fallback={<PendingCategories />}>
      <CategoriesTableContent />
    </Suspense>
  )
}

function Categories() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Create and manage your categories
          </p>
        </div>
        <AddCategory />
      </div>
      <CategoriesTable />
    </div>
  )
}
