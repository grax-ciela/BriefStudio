import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const ASANA_BASE  = "https://app.asana.com/api/1.0"
const PROJECT_GID = "1210839779273759"

// ── Equipo visible en el dashboard (GID → nombre a mostrar) ───────
const EQUIPO_VISIBLE: Record<string, string> = {
  "1207592291188665": "Christian (Friquiton)",
  "1213483686471887": "Diego",
  "1209248334964443": "Tamara",
  "1211060457213910": "Rafael",
  "1206322141323221": "Ignacia",
  "1207207427326115": "Javiera",
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

// ── Normaliza la marca a un slug canónico ──────────────────────────
function normalizarMarca(marca: string | null | undefined): string {
  if (!marca) return "otra"
  const m = marca.toLowerCase()
  if (m.includes("mycocos"))  return "mycocos"
  if (m.includes("myhuevos")) return "myhuevos"
  if (m.includes("mennt"))    return "mennt"
  return "otra"
}

// ── Obtiene todas las tareas del proyecto con paginación ───────────
async function fetchTareasProyecto(pat: string) {
  const tareas: Array<{
    gid: string
    completed: boolean
    assignee: { gid: string; name: string } | null
  }> = []

  let offset: string | null = null
  let pagina = 0
  const MAX_PAGINAS = 10  // máx 1000 tareas

  do {
    const url = new URL(`${ASANA_BASE}/projects/${PROJECT_GID}/tasks`)
    url.searchParams.set("opt_fields", "gid,completed,assignee.gid,assignee.name")
    url.searchParams.set("limit", "100")
    if (offset) url.searchParams.set("offset", offset)

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
    })

    const data = await res.json()
    if (data.errors) throw new Error(JSON.stringify(data.errors))

    tareas.push(...(data.data || []))
    offset = data.next_page?.offset ?? null
    pagina++
  } while (offset && pagina < MAX_PAGINAS)

  return tareas
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS })

  try {
    const pat = Deno.env.get("ASANA_PAT")
    if (!pat) throw new Error("ASANA_PAT no configurado")

    // ── Supabase: obtener GIDs de tareas creadas desde esta app ──
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: briefs, error: dbErr } = await db
      .from("briefs")
      .select("asana_task_url, marca")
      .eq("enviado_asana", true)
      .not("asana_task_url", "is", null)

    if (dbErr) throw new Error(dbErr.message)

    // Extraer GIDs y construir mapa gid → marca normalizada
    const gidsApp    = new Set<string>()
    const gidMarcaMap = new Map<string, string>()

    for (const b of briefs || []) {
      const parts = (b.asana_task_url as string)?.split("/") || []
      const gid   = parts[parts.length - 1]
      if (!gid) continue
      gidsApp.add(gid)
      gidMarcaMap.set(gid, normalizarMarca(b.marca))
    }

    if (gidsApp.size === 0) {
      return new Response(
        JSON.stringify({ ok: true, carga: [], totalApp: 0 }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      )
    }

    // ── Asana: obtener todas las tareas del proyecto ───────────
    const todasTareas = await fetchTareasProyecto(pat)

    // Filtrar solo las creadas desde esta app
    const tareasApp = todasTareas.filter((t) => gidsApp.has(t.gid))

    // Agrupar por asignado — solo el equipo visible
    const mapa: Record<string, {
      nombre:      string
      activas:     number
      completadas: number
      porMarca:    Record<string, number>
    }> = {}

    for (const tarea of tareasApp) {
      const gid = tarea.assignee?.gid
      if (!gid || !EQUIPO_VISIBLE[gid]) continue  // ignorar si no está en el equipo

      if (!mapa[gid]) mapa[gid] = { nombre: EQUIPO_VISIBLE[gid], activas: 0, completadas: 0, porMarca: {} }

      if (tarea.completed) {
        mapa[gid].completadas++
      } else {
        mapa[gid].activas++
        // Acumular por marca (solo tareas activas)
        const marca = gidMarcaMap.get(tarea.gid) || "otra"
        mapa[gid].porMarca[marca] = (mapa[gid].porMarca[marca] || 0) + 1
      }
    }

    // Incluir todos los miembros aunque tengan 0 tareas
    for (const [gid, nombre] of Object.entries(EQUIPO_VISIBLE)) {
      if (!mapa[gid]) mapa[gid] = { nombre, activas: 0, completadas: 0, porMarca: {} }
    }

    const carga = Object.entries(mapa)
      .map(([gid, info]) => ({
        gid,
        nombre:      info.nombre,
        activas:     info.activas,
        completadas: info.completadas,
        total:       info.activas + info.completadas,
        porMarca:    info.porMarca,
      }))
      .sort((a, b) => b.activas - a.activas)

    return new Response(
      JSON.stringify({
        ok: true,
        carga,
        totalApp: gidsApp.size,
        tareasTotalesProyecto: todasTareas.length,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }
})
