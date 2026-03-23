import type { ColumnDef } from "@tanstack/react-table"

import type { CategoryPublic, TaskPublic } from "@/client"
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
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "completed",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.completed ? "secondary" : "default"}>
          {row.original.completed ? "Done" : "Active"}
        </Badge>
      ),
    },
    {
      accessorKey: "category_id",
      header: "Category",
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
      accessorKey: "due_date",
      header: "Due Date",
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
      accessorKey: "start_date",
      header: "Start Date",
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
      accessorKey: "repeat_type",
      header: "Repeat",
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
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <CompleteTask task={row.original} />
          <EditTask task={row.original} />
          <DeleteTask id={row.original.id} />
        </div>
      ),
    },
  ]
}
