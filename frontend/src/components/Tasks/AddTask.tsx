import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { CategoriesService, type TaskCreate, TasksService } from "@/client"
import { Button } from "@/components/ui/button"
import { ColorInput } from "@/components/ui/color-input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

function combineDatetime(date: string, time: string): string | null {
  if (!date) return null
  if (time) return new Date(`${date}T${time}`).toISOString()
  return new Date(`${date}T00:00:00`).toISOString()
}

const formSchema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    category_id: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    start_date: z.string().optional(),
    start_time: z.string().optional(),
    due_date: z.string().optional(),
    due_time: z.string().optional(),
    repeat_type: z.enum(["none", "on_completion", "on_due_date"]),
    repeat_seconds: z.number().int().min(0),
    repeat_minutes: z.number().int().min(0),
    repeat_hours: z.number().int().min(0),
    repeat_days: z.number().int().min(0),
    repeat_weeks: z.number().int().min(0),
    repeat_months: z.number().int().min(0),
    repeat_years: z.number().int().min(0),
  })
  .refine((data) => !data.start_time || data.start_date, {
    message: "Start date is required when start time is set",
    path: ["start_date"],
  })
  .refine((data) => !data.due_time || data.due_date, {
    message: "Due date is required when due time is set",
    path: ["due_date"],
  })

type FormData = z.infer<typeof formSchema>

const AddTask = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: categories } = useQuery({
    queryFn: () => CategoriesService.readCategories(),
    queryKey: ["categories"],
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      title: "",
      description: "",
      category_id: null,
      color: null,
      start_date: "",
      start_time: "",
      due_date: "",
      due_time: "",
      repeat_type: "none",
      repeat_seconds: 0,
      repeat_minutes: 0,
      repeat_hours: 0,
      repeat_days: 0,
      repeat_weeks: 0,
      repeat_months: 0,
      repeat_years: 0,
    },
  })

  const repeatType = form.watch("repeat_type")
  const startDate = form.watch("start_date")
  const dueDate = form.watch("due_date")

  // Clear time when date is cleared
  const handleStartDateChange = (value: string) => {
    form.setValue("start_date", value)
    if (!value) form.setValue("start_time", "")
  }
  const handleDueDateChange = (value: string) => {
    form.setValue("due_date", value)
    if (!value) form.setValue("due_time", "")
  }

  const mutation = useMutation({
    mutationFn: (data: TaskCreate) =>
      TasksService.createTask({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Task created successfully")
      form.reset()
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      ...data,
      category_id: data.category_id || null,
      start_date: combineDatetime(data.start_date ?? "", data.start_time ?? ""),
      due_date: combineDatetime(data.due_date ?? "", data.due_time ?? ""),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="my-4">
          <Plus className="mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new task.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Title"
                        type="text"
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Description" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : value)
                      }
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories?.data.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Start Date</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            onChange={(e) =>
                              handleStartDateChange(e.target.value)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="time" disabled={!startDate} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>Due Date</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            onChange={(e) =>
                              handleDueDateChange(e.target.value)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="due_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="time" disabled={!dueDate} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="repeat_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="on_completion">
                          On completion
                        </SelectItem>
                        <SelectItem value="on_due_date">On due date</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {repeatType !== "none" && (
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      "repeat_seconds",
                      "repeat_minutes",
                      "repeat_hours",
                      "repeat_days",
                      "repeat_weeks",
                      "repeat_months",
                      "repeat_years",
                    ] as const
                  ).map((name) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {name
                              .replace("repeat_", "")
                              .replace(/^\w/, (c) => c.toUpperCase())}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber || 0)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              )}

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <ColorInput
                        value={field.value}
                        onChange={field.onChange}
                      />
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
  )
}

export default AddTask
