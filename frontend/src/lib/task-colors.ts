import type { CategoryPublic, TaskPublic } from "@/client"

export function resolveTaskColor(
  task: TaskPublic,
  categoryMap: Map<string, CategoryPublic>,
): string | null {
  if (task.color) return task.color
  if (task.category_id) {
    return categoryMap.get(task.category_id)?.color ?? null
  }
  return null
}

export function tintBackground(color: string, percent = 18): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

const HEX_RGB = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i
const RGB_FUNC = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i

function parseHex(s: string): [number, number, number] | null {
  const m = HEX_RGB.exec(s)
  if (!m) return null
  return [
    Number.parseInt(m[1], 16),
    Number.parseInt(m[2], 16),
    Number.parseInt(m[3], 16),
  ]
}

function parseRgb(s: string): [number, number, number] | null {
  const m = RGB_FUNC.exec(s)
  if (!m) return null
  return [
    Number.parseInt(m[1], 10),
    Number.parseInt(m[2], 10),
    Number.parseInt(m[3], 10),
  ]
}

function resolveRgb(color: string): [number, number, number] | null {
  const direct = parseHex(color) ?? parseRgb(color)
  if (direct) return direct
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  const sentinel = "#000000"
  ctx.fillStyle = sentinel
  const before = ctx.fillStyle
  ctx.fillStyle = color
  if (ctx.fillStyle === before && color.toLowerCase() !== sentinel) return null
  const normalized = ctx.fillStyle as string
  return parseHex(normalized) ?? parseRgb(normalized)
}

const contrastCache = new Map<string, "black" | "white">()

export function contrastText(bg: string | null | undefined): "black" | "white" {
  if (!bg) return "white"
  const cached = contrastCache.get(bg)
  if (cached) return cached
  const rgb = resolveRgb(bg)
  let result: "black" | "white" = "white"
  if (rgb) {
    const [r, g, b] = rgb
    const yiq = (r * 299 + g * 587 + b * 114) / 1000
    result = yiq >= 128 ? "black" : "white"
  }
  contrastCache.set(bg, result)
  return result
}
