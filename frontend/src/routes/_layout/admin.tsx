import { useMutationState, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Suspense } from "react"

import type { UserCreate } from "@/client"
import { UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { columns } from "@/components/Admin/columns"
import type {
  UserPublicWithPending,
  UsersPublicWithPending,
  UserTableData,
} from "@/components/Admin/types"
import { DataTable } from "@/components/Common/DataTable"
import { DataTableSkeleton } from "@/components/Common/DataTableSkeleton"
import { PageHeader } from "@/components/Common/PageHeader"
import useAuth from "@/hooks/useAuth"

function getUsersQueryOptions() {
  return {
    queryFn: async (): Promise<UsersPublicWithPending> =>
      UsersService.readUsers({ skip: 0, limit: 100_000 }),
    queryKey: ["users"],
  }
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Admin - Getcha Life Right",
      },
    ],
  }),
})

function UsersTableContent() {
  const { user: currentUser } = useAuth()
  const { data: users } = useSuspenseQuery(getUsersQueryOptions())

  const pendingUsers = useMutationState({
    filters: { mutationKey: ["users", "create"], status: "pending" },
    select: (mutation): UserTableData => {
      const variables = mutation.state.variables as UserCreate
      return {
        id: `pending-${mutation.mutationId}`,
        email: variables.email,
        full_name: variables.full_name ?? null,
        is_superuser: variables.is_superuser ?? false,
        is_active: variables.is_active ?? false,
        pending: true,
        isCurrentUser: false,
      }
    },
  })

  const tableData: UserTableData[] = [
    ...pendingUsers,
    ...users.data.map((user: UserPublicWithPending) => ({
      ...user,
      isCurrentUser: currentUser?.id === user.id,
    })),
  ]

  return (
    <DataTable
      columns={columns}
      data={tableData}
      rowClassName={(row) => (row.pending ? "opacity-50" : undefined)}
      storageKey="users-table"
    />
  )
}

// Empty array stays stable across renders so the skeleton's table instance,
// which only needs the column defs, never re-creates its row model.
const EMPTY_ROWS: UserTableData[] = []

function UsersTable() {
  const skeletonTable = useReactTable({
    data: EMPTY_ROWS,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Suspense fallback={<DataTableSkeleton table={skeletonTable} />}>
      <UsersTableContent />
    </Suspense>
  )
}

function Admin() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and permissions"
      >
        <AddUser />
      </PageHeader>
      <UsersTable />
    </div>
  )
}
