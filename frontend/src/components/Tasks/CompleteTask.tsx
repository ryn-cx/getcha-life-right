import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleCheck } from "lucide-react"
import { useState } from "react"

import { type TaskPublic, TasksService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface CompleteTaskProps {
  task: TaskPublic
}

const CompleteTask = ({ task }: CompleteTaskProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () => TasksService.completeTask({ taskId: task.id }),
    onSuccess: () => {
      showSuccessToast("Task completed")
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })

  const isBeforeStartDate = () => {
    if (!task.start_date) return false
    return new Date() < new Date(task.start_date)
  }

  const handleClick = () => {
    if (isBeforeStartDate()) {
      setIsOpen(true)
    } else {
      mutation.mutate()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={mutation.isPending || task.completed}
        title={task.completed ? "Already completed" : "Complete task"}
      >
        <CircleCheck
          className={
            task.completed ? "text-amber-500" : "text-muted-foreground"
          }
        />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete early?</DialogTitle>
            <DialogDescription>
              This task's start date hasn't arrived yet. Are you sure you want
              to mark it as complete?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={mutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Complete anyway
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CompleteTask
