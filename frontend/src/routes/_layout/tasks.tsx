import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search, SlidersHorizontal } from "lucide-react"
import { Suspense, useMemo, useState } from "react"

import { CategoriesService, type TaskPublic, TasksService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingTasks from "@/components/Pending/PendingTasks"
import AddTask from "@/components/Tasks/AddTask"
import { createColumns } from "@/components/Tasks/columns"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

function getTasksQueryOptions() {
  return {
    queryFn: () => TasksService.readTasks(),
    queryKey: ["tasks"],
  }
}

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
  head: () => ({
    meta: [
      {
        title: "Tasks - Getcha Life Right",
      },
    ],
  }),
})

interface TaskFilters {
  showActive: boolean
  showCompleted: boolean
  showWithDueDate: boolean
  showWithoutDueDate: boolean
  showWithStartDate: boolean
  showWithoutStartDate: boolean
  showStarted: boolean
  showNotStarted: boolean
  categoryIds: Set<string>
  showNoCategory: boolean
}

const defaultFilters: TaskFilters = {
  showActive: true,
  showCompleted: true,
  showWithDueDate: true,
  showWithoutDueDate: true,
  showWithStartDate: true,
  showWithoutStartDate: true,
  showStarted: true,
  showNotStarted: true,
  categoryIds: new Set(),
  showNoCategory: true,
}

function applyFilters(tasks: TaskPublic[], filters: TaskFilters): TaskPublic[] {
  const now = new Date()

  return tasks.filter((task) => {
    const isCompleted = task.completed ?? false
    if (isCompleted && !filters.showCompleted) return false
    if (!isCompleted && !filters.showActive) return false

    if (task.due_date && !filters.showWithDueDate) return false
    if (!task.due_date && !filters.showWithoutDueDate) return false

    if (task.start_date && !filters.showWithStartDate) return false
    if (!task.start_date && !filters.showWithoutStartDate) return false

    if (task.start_date) {
      const hasStarted = new Date(task.start_date) <= now
      if (hasStarted && !filters.showStarted) return false
      if (!hasStarted && !filters.showNotStarted) return false
    }

    if (filters.categoryIds.size > 0 || !filters.showNoCategory) {
      if (!task.category_id && !filters.showNoCategory) return false
      if (
        task.category_id &&
        filters.categoryIds.size > 0 &&
        !filters.categoryIds.has(task.category_id)
      ) {
        return false
      }
    }

    return true
  })
}

function FilterSidebar({
  filters,
  onChange,
}: {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
}) {
  const { data: categories } = useQuery({
    queryFn: () => CategoriesService.readCategories(),
    queryKey: ["categories"],
  })

  const toggle = (key: keyof Omit<TaskFilters, "categoryIds">) => {
    onChange({ ...filters, [key]: !filters[key] })
  }

  const toggleCategory = (id: string) => {
    const next = new Set(filters.categoryIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange({ ...filters, categoryIds: next })
  }

  const allCategoriesSelected =
    filters.showNoCategory &&
    (categories?.data.length ?? 0) > 0 &&
    categories?.data.every((c) => filters.categoryIds.has(c.id))

  const toggleAllCategories = () => {
    if (allCategoriesSelected) {
      onChange({ ...filters, categoryIds: new Set(), showNoCategory: false })
    } else {
      onChange({
        ...filters,
        categoryIds: new Set(categories?.data.map((c) => c.id) ?? []),
        showNoCategory: true,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-active"
              checked={filters.showActive}
              onCheckedChange={() => toggle("showActive")}
            />
            <Label htmlFor="filter-active" className="text-sm font-normal">
              Active
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-completed"
              checked={filters.showCompleted}
              onCheckedChange={() => toggle("showCompleted")}
            />
            <Label htmlFor="filter-completed" className="text-sm font-normal">
              Completed
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold mb-2">Due Date</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-has-due"
              checked={filters.showWithDueDate}
              onCheckedChange={() => toggle("showWithDueDate")}
            />
            <Label htmlFor="filter-has-due" className="text-sm font-normal">
              Has due date
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-no-due"
              checked={filters.showWithoutDueDate}
              onCheckedChange={() => toggle("showWithoutDueDate")}
            />
            <Label htmlFor="filter-no-due" className="text-sm font-normal">
              No due date
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold mb-2">Start Date</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-has-start"
              checked={filters.showWithStartDate}
              onCheckedChange={() => toggle("showWithStartDate")}
            />
            <Label htmlFor="filter-has-start" className="text-sm font-normal">
              Has start date
            </Label>
          </div>
          {filters.showWithStartDate && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-started"
                  checked={filters.showStarted}
                  onCheckedChange={() => toggle("showStarted")}
                />
                <Label htmlFor="filter-started" className="text-sm font-normal">
                  Started
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-not-started"
                  checked={filters.showNotStarted}
                  onCheckedChange={() => toggle("showNotStarted")}
                />
                <Label
                  htmlFor="filter-not-started"
                  className="text-sm font-normal"
                >
                  Not started
                </Label>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-no-start"
              checked={filters.showWithoutStartDate}
              onCheckedChange={() => toggle("showWithoutStartDate")}
            />
            <Label htmlFor="filter-no-start" className="text-sm font-normal">
              No start date
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Category</h3>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={toggleAllCategories}
          >
            {allCategoriesSelected ? "None" : "All"}
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-no-category"
              checked={filters.showNoCategory}
              onCheckedChange={() => toggle("showNoCategory")}
            />
            <Label
              htmlFor="filter-no-category"
              className="text-sm font-normal italic text-muted-foreground"
            >
              No category
            </Label>
          </div>
          {categories?.data.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <Checkbox
                id={`filter-cat-${cat.id}`}
                checked={filters.categoryIds.has(cat.id)}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
              <Label
                htmlFor={`filter-cat-${cat.id}`}
                className="text-sm font-normal"
              >
                {cat.title}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TasksTableContent({ filters }: { filters: TaskFilters }) {
  const { data: tasks } = useSuspenseQuery(getTasksQueryOptions())
  const { data: categories } = useQuery({
    queryFn: () => CategoriesService.readCategories(),
    queryKey: ["categories"],
  })

  const columns = useMemo(
    () => createColumns(categories?.data ?? []),
    [categories?.data],
  )

  const filteredData = useMemo(
    () => applyFilters(tasks.data, filters),
    [tasks.data, filters],
  )

  if (tasks.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">You don't have any tasks yet</h3>
        <p className="text-muted-foreground">Add a new task to get started</p>
      </div>
    )
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <h3 className="text-lg font-semibold">No tasks match your filters</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters to see more results
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={filteredData} />
}

function TasksTable({ filters }: { filters: TaskFilters }) {
  return (
    <Suspense fallback={<PendingTasks />}>
      <TasksTableContent filters={filters} />
    </Suspense>
  )
}

function Tasks() {
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Create and manage your tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <SlidersHorizontal className="size-4" />
                <span className="sr-only">Filters</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto p-4">
              <SheetHeader className="p-0">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <FilterSidebar filters={filters} onChange={setFilters} />
            </SheetContent>
          </Sheet>
          <AddTask />
        </div>
      </div>
      <div className="flex gap-6">
        <aside className="hidden md:block w-56 shrink-0">
          <FilterSidebar filters={filters} onChange={setFilters} />
        </aside>
        <div className="flex-1 min-w-0">
          <TasksTable filters={filters} />
        </div>
      </div>
    </div>
  )
}
