import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type TaskCompletionWithTask, TasksService } from "@/client"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
})

type FormData = z.infer<typeof formSchema>

interface EditCompletionProps {
  completion: TaskCompletionWithTask
}

const EditCompletion = ({ completion }: EditCompletionProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const completedAt = new Date(completion.completed_at)
  const defaultDate = completedAt.toISOString().split("T")[0]
  const defaultTime = completedAt.toTimeString().slice(0, 5)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: defaultDate,
      time: defaultTime,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: { completed_at: string }) =>
      TasksService.updateCompletion({
        completionId: completion.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Completion updated")
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["completions"] })
    },
  })

  const onSubmit = (data: FormData) => {
    const completed_at = new Date(`${data.date}T${data.time}`).toISOString()
    mutation.mutate({ completed_at })
  }

  const handleOpen = () => {
    form.reset({ date: defaultDate, time: defaultTime })
    setIsOpen(true)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        title="Edit completion"
      >
        <Pencil className="text-muted-foreground" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Completion</DialogTitle>
            <DialogDescription>
              Update the completion time for "{completion.task_title}"
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={mutation.isPending}>
                    Cancel
                  </Button>
                </DialogClose>
                <LoadingButton type="submit" loading={mutation.isPending}>
                  Save
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EditCompletion
