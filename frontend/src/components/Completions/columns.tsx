import type { ColumnDef } from "@tanstack/react-table"

import type { TaskCompletionWithTask } from "@/client"
import DeleteCompletion from "./DeleteCompletion"
import EditCompletion from "./EditCompletion"

export const columns: ColumnDef<TaskCompletionWithTask>[] = [
  {
    accessorKey: "task_title",
    header: "Task",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.task_title}</span>
    ),
  },
  {
    accessorKey: "completed_at",
    header: "Completed At",
    cell: ({ row }) => {
      const d = new Date(row.original.completed_at)
      return (
        <span className="text-sm">
          {d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          {d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <EditCompletion completion={row.original} />
        <DeleteCompletion id={row.original.id} />
      </div>
    ),
  },
]
