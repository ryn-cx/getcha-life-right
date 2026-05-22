import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

import type { CategoryPublic, TaskPublic } from "@/client"
import EditTask from "@/components/Tasks/EditTask"
import { Button } from "@/components/ui/button"
import { contrastText, resolveTaskColor } from "@/lib/task-colors"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  tasks: TaskPublic[]
  categories: CategoryPublic[]
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const FALLBACK_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#f43f5e",
  "#65a30d",
  "#6366f1",
  "#f97316",
]

const NO_CATEGORY_COLOR = "#64748b"

const HEADER_HEIGHT = 28
const LANE_HEIGHT = 22
const LANE_GAP = 2
const ROW_PADDING_BOTTOM = 6
const MIN_ROW_HEIGHT = 96

function fallbackColorForCategory(id: string | null | undefined): string {
  if (!id) return NO_CATEGORY_COLOR
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  return startOfDay(new Date(s))
}

function formatTime(s: string | null | undefined): string | null {
  if (!s) return null
  return new Date(s).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

interface TaskRange {
  task: TaskPublic
  rangeStart: Date
  rangeEnd: Date
}

interface PlacedSegment {
  task: TaskPublic
  weekRow: number
  startCol: number
  endCol: number
  startsAtTaskStart: boolean
  endsAtTaskEnd: boolean
  lane: number
}

function buildSegments(
  taskRanges: TaskRange[],
  calStart: Date,
): PlacedSegment[] {
  const sorted = [...taskRanges].sort((a, b) => {
    const s = a.rangeStart.getTime() - b.rangeStart.getTime()
    if (s !== 0) return s
    return b.rangeEnd.getTime() - a.rangeEnd.getTime()
  })

  const laneNextFree: number[][] = Array.from({ length: 6 }, () => [])
  const placed: PlacedSegment[] = []

  for (const tr of sorted) {
    const calEnd = addDays(calStart, 41)
    if (tr.rangeEnd < calStart || tr.rangeStart > calEnd) continue

    const visibleStart = tr.rangeStart < calStart ? calStart : tr.rangeStart
    const visibleEnd = tr.rangeEnd > calEnd ? calEnd : tr.rangeEnd

    const firstWeek = Math.floor(diffDays(visibleStart, calStart) / 7)
    const lastWeek = Math.floor(diffDays(visibleEnd, calStart) / 7)

    const taskSegments: Array<Omit<PlacedSegment, "lane">> = []
    for (let week = firstWeek; week <= lastWeek; week++) {
      const weekStart = addDays(calStart, week * 7)
      const weekEnd = addDays(weekStart, 6)
      const segStart = tr.rangeStart > weekStart ? tr.rangeStart : weekStart
      const segEnd = tr.rangeEnd < weekEnd ? tr.rangeEnd : weekEnd
      taskSegments.push({
        task: tr.task,
        weekRow: week,
        startCol: diffDays(segStart, weekStart),
        endCol: diffDays(segEnd, weekStart),
        startsAtTaskStart: segStart.getTime() === tr.rangeStart.getTime(),
        endsAtTaskEnd: segEnd.getTime() === tr.rangeEnd.getTime(),
      })
    }

    let lane = 0
    while (true) {
      let fits = true
      for (const seg of taskSegments) {
        const next = laneNextFree[seg.weekRow][lane] ?? 0
        if (next > seg.startCol) {
          fits = false
          break
        }
      }
      if (fits) break
      lane++
    }

    for (const seg of taskSegments) {
      laneNextFree[seg.weekRow][lane] = seg.endCol + 1
      placed.push({ ...seg, lane })
    }
  }

  return placed
}

export function CalendarView({ tasks, categories }: CalendarViewProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [editingTask, setEditingTask] = useState<TaskPublic | null>(null)

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  const calStart = useMemo(() => {
    const firstOfMonth = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      1,
    )
    return addDays(firstOfMonth, -firstOfMonth.getDay())
  }, [viewDate])

  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(calStart, i)),
    [calStart],
  )

  const segments = useMemo(() => {
    const ranges: TaskRange[] = []
    for (const task of tasks) {
      const startD = parseDate(task.start_date)
      const dueD = parseDate(task.due_date)
      const anchor = startD ?? dueD
      const end = dueD ?? startD
      if (!anchor || !end) continue
      const rangeStart = anchor <= end ? anchor : end
      const rangeEnd = end >= anchor ? end : anchor
      ranges.push({ task, rangeStart, rangeEnd })
    }
    return buildSegments(ranges, calStart)
  }, [tasks, calStart])

  const segmentsByWeek = useMemo(() => {
    const arr: PlacedSegment[][] = Array.from({ length: 6 }, () => [])
    for (const s of segments) arr[s.weekRow].push(s)
    return arr
  }, [segments])

  const rowHeights = useMemo(() => {
    return segmentsByWeek.map((week) => {
      const lanes = week.reduce((m, s) => Math.max(m, s.lane + 1), 0)
      const computed =
        HEADER_HEIGHT + lanes * (LANE_HEIGHT + LANE_GAP) + ROW_PADDING_BOTTOM
      return Math.max(MIN_ROW_HEIGHT, computed)
    })
  }, [segmentsByWeek])

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  const goMonth = (delta: number) => {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1),
    )
  }

  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <div className="w-35" aria-hidden />
      </div>

      <div className="rounded-md border-t border-l overflow-hidden">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="border-r border-b bg-muted/50 text-xs font-medium text-muted-foreground py-1.5 px-2 text-center"
            >
              {w}
            </div>
          ))}
        </div>

        {Array.from({ length: 6 }, (_, weekIdx) => {
          const rowHeight = rowHeights[weekIdx]
          const weekKey = days[weekIdx * 7].toISOString()
          return (
            <div
              key={weekKey}
              className="relative"
              style={{ height: `${rowHeight}px` }}
            >
              <div className="absolute inset-0 grid grid-cols-7">
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const day = days[weekIdx * 7 + dayIdx]
                  const isCurrentMonth = day.getMonth() === viewDate.getMonth()
                  const isToday = day.getTime() === today.getTime()
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "border-r border-b px-1.5 py-1",
                        !isCurrentMonth && "bg-muted/30",
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-medium inline-flex items-center justify-center rounded-full size-6",
                          !isCurrentMonth && "text-muted-foreground",
                          isToday && "bg-primary text-primary-foreground",
                        )}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div
                className="absolute inset-x-0 pointer-events-none"
                style={{ top: `${HEADER_HEIGHT}px` }}
              >
                {segmentsByWeek[weekIdx].map((seg, i) => {
                  const widthPct = ((seg.endCol - seg.startCol + 1) / 7) * 100
                  const leftPct = (seg.startCol / 7) * 100
                  const top = seg.lane * (LANE_HEIGHT + LANE_GAP)
                  const resolvedColor =
                    resolveTaskColor(seg.task, categoryMap) ??
                    fallbackColorForCategory(seg.task.category_id)
                  const completed = seg.task.completed
                  const categoryName = seg.task.category_id
                    ? categoryMap.get(seg.task.category_id)?.title
                    : null
                  const titleLabel = seg.startsAtTaskStart
                    ? seg.task.title
                    : `… ${seg.task.title}`
                  const startTime = seg.startsAtTaskStart
                    ? formatTime(seg.task.start_date)
                    : null
                  const endTime = seg.endsAtTaskEnd
                    ? formatTime(seg.task.due_date)
                    : null
                  const tooltipParts = [seg.task.title]
                  if (categoryName) tooltipParts.push(categoryName)
                  if (startTime) tooltipParts.unshift(`Start ${startTime}`)
                  if (endTime) tooltipParts.push(`Due ${endTime}`)

                  return (
                    <button
                      type="button"
                      key={`${seg.task.id}-${weekIdx}-${i}`}
                      onClick={() => setEditingTask(seg.task)}
                      className={cn(
                        "absolute text-xs font-medium px-2 leading-none flex items-center gap-1.5 shadow-sm pointer-events-auto cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring text-left",
                        completed && "opacity-60 line-through",
                        seg.startsAtTaskStart
                          ? "rounded-l-md"
                          : "rounded-l-none",
                        seg.endsAtTaskEnd ? "rounded-r-md" : "rounded-r-none",
                      )}
                      style={{
                        backgroundColor: resolvedColor,
                        color: contrastText(resolvedColor),
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                        top: `${top}px`,
                        height: `${LANE_HEIGHT}px`,
                      }}
                      title={tooltipParts.join(" — ")}
                    >
                      {startTime && (
                        <span className="shrink-0 tabular-nums opacity-90">
                          {startTime}
                        </span>
                      )}
                      <span className="flex-1 truncate">{titleLabel}</span>
                      {endTime && (
                        <span className="shrink-0 tabular-nums opacity-90">
                          {endTime}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {editingTask && (
        <EditTask
          key={editingTask.id}
          task={editingTask}
          hideTrigger
          open
          onOpenChange={(o) => {
            if (!o) setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}
