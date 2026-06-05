import type { ColumnDef } from "@tanstack/react-table"

import type { CategoryPublic, TaskPublic } from "@/client"
import {
  dateRangeFilterFn,
  NONE_VALUE,
  optionFilterFn,
} from "@/components/Common/DataTable"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import CompleteTask from "./CompleteTask"
import DeleteTask from "./DeleteTask"
import EditTask from "./EditTask"

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

type TaskStatus = "active" | "inactive" | "completed"

function taskStatus(task: TaskPublic): TaskStatus {
  if (task.completed) return "completed"
  if (task.start_date && new Date(task.start_date) > new Date()) {
    return "inactive"
  }
  return "active"
}

function formatRepeat(task: TaskPublic): string {
  const parts: string[] = []
  if (task.repeat_years) parts.push(`${task.repeat_years}y`)
  if (task.repeat_months) parts.push(`${task.repeat_months}mo`)
  if (task.repeat_weeks) parts.push(`${task.repeat_weeks}w`)
  if (task.repeat_days) parts.push(`${task.repeat_days}d`)
  if (task.repeat_hours) parts.push(`${task.repeat_hours}h`)
  if (task.repeat_minutes) parts.push(`${task.repeat_minutes}m`)
  if (task.repeat_seconds) parts.push(`${task.repeat_seconds}s`)
  return parts.join(" ")
}

export function createColumns(
  categories: CategoryPublic[],
): ColumnDef<TaskPublic>[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c.title]))

  return [
    {
      accessorKey: "title",
      header: "Title",
      meta: { filterVariant: "text" },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "completed",
      header: "Status",
      filterFn: (row, _columnId, value) =>
        !value || taskStatus(row.original) === value,
      meta: {
        filterVariant: "select",
        filterOptions: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
          { label: "Completed", value: "completed" },
        ],
      },
      cell: ({ row }) => {
        const status = taskStatus(row.original)
        if (status === "completed") {
          return <Badge variant="secondary">Completed</Badge>
        }
        if (status === "inactive") {
          return <Badge variant="outline">Inactive</Badge>
        }
        return <Badge variant="default">Active</Badge>
      },
    },
    {
      accessorKey: "category_id",
      header: "Category",
      filterFn: optionFilterFn,
      meta: {
        filterVariant: "select",
        filterOptions: [
          { label: "None", value: NONE_VALUE },
          ...categories.map((c) => ({ label: c.title, value: c.id })),
        ],
      },
      cell: ({ row }) => {
        const name = row.original.category_id
          ? categoryMap.get(row.original.category_id)
          : null
        return (
          <span
            className={cn("text-sm", !name && "text-muted-foreground italic")}
          >
            {name ?? "None"}
          </span>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      filterFn: dateRangeFilterFn,
      meta: { filterVariant: "date-range" },
      cell: ({ row }) => {
        const dateStr = formatDate(row.original.start_date)
        return dateStr ? (
          <span className="text-sm">{dateStr}</span>
        ) : (
          <span className="text-muted-foreground italic text-sm">None</span>
        )
      },
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      filterFn: dateRangeFilterFn,
      meta: { filterVariant: "date-range" },
      cell: ({ row }) => {
        const dateStr = formatDate(row.original.due_date)
        if (!dateStr) {
          return (
            <span className="text-muted-foreground italic text-sm">None</span>
          )
        }
        const isOverdue =
          !row.original.completed &&
          row.original.due_date &&
          new Date(row.original.due_date) < new Date()
        return (
          <span
            className={cn(
              "text-sm",
              isOverdue && "text-destructive font-medium",
            )}
          >
            {dateStr}
          </span>
        )
      },
    },
    {
      accessorKey: "repeat_type",
      header: "Repeat",
      filterFn: optionFilterFn,
      meta: {
        filterVariant: "select",
        filterOptions: [
          { label: "None", value: NONE_VALUE },
          { label: "Due date", value: "on_due_date" },
          { label: "Completion", value: "on_completion" },
        ],
      },
      cell: ({ row }) => {
        const task = row.original
        if (!task.repeat_type || task.repeat_type === "none") {
          return (
            <span className="text-muted-foreground italic text-sm">None</span>
          )
        }
        const interval = formatRepeat(task)
        const label =
          task.repeat_type === "on_due_date" ? "Due date" : "Completion"
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant="outline" className="text-xs">
              {interval}
            </Badge>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      enableSorting: false,
      enableColumnFilter: false,
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {!row.original.completed && <CompleteTask task={row.original} />}
          <EditTask task={row.original} />
          <DeleteTask id={row.original.id} />
        </div>
      ),
    },
  ]
}
