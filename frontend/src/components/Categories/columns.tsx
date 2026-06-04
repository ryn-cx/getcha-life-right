import type { ColumnDef } from "@tanstack/react-table"

import type { CategoryPublic } from "@/client"
import { cn } from "@/lib/utils"
import { CategoryActionsMenu } from "./CategoryActionsMenu"

export const columns: ColumnDef<CategoryPublic>[] = [
  {
    accessorKey: "title",
    header: "Title",
    meta: { filterVariant: "text" },
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    meta: { filterVariant: "text" },
    cell: ({ row }) => {
      const description = row.original.description
      return (
        <span
          className={cn(
            "max-w-xs truncate block text-muted-foreground",
            !description && "italic",
          )}
        >
          {description || "No description"}
        </span>
      )
    },
  },
  {
    id: "actions",
    enableSorting: false,
    enableColumnFilter: false,
    enableHiding: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <CategoryActionsMenu category={row.original} />
      </div>
    ),
  },
]
