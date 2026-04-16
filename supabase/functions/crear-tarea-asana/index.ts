import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ASANA_BASE = "https://app.asana.com/api/1.0"
const PROJECT_GID = "1210839779273759"
const SECTION_GID = "1210839779273760"

// ── Custom Field GIDs ──────────────────────────────────────────
const CF = {
  FORMATO:    "1210839880551587",
  PLATAFORMA: "1210839779313149",
  MARCA:      "1210839779313155",
  HOOKS:      "1211538112282998",
  OBJETIVO:   "1210839779313163",
  FUNNEL:     "1210839779313172",
  PRIORIDAD:  "1210839779313179",
}

// ── Enum Option GIDs ───────────────────────────────────────────
const FORMATO_OPTS: Record<string, string> = {
  "video":           "1210839880551588",
  "imagen/gráfico":  "1210839880551590",
  "static":          "1210839880551590",
  "motion graphic":  "1210839880551591",
  "carrusel":        "1210839779313162",
  "ugc":             "1210839880551589",
}

const MARCA_OPTS: Record<string, string> = {
  "mycocos":     "1210839779313156",
  "mycocos® cl": "1210839779313156",
  "mennt":       "1210839779313159",
  "mennt® cl":   "1210839779313159",
}

const OBJETIVO_OPTS: Record<string, string> = {
  "conversión":     "1210839779313164",
  "tráfico":        "1210839779313165",
  "interacción":    "1210839779313166",
  "reproducción":   "1210839779313167",
  "leads":          "1210839779313168",
  "performance max":"1210839779313169",
  "alcance":        "1211114956599207",
  "orgánico":       "1211373800439511",
  "b2b":            "1211840884990565",
}

// Defaults fijos
const PLATAFORMA_DEFAULT = ["1210839779313150", "1210839779313152"] // Meta Ads + TikTok Ads
const FUNNEL_DEFAULT     = ["1210839779313173"] // TOFU
const PRIORIDAD_DEFAULT  = ["1210839779313180"] // 1 (Rojo)

// Followers fijos: Fauadz + Juan Gabriel
const FOLLOWERS_FIJOS = ["1198216603476155", "1213065856387550"]

// ── Equipo GIDs ────────────────────────────────────────────────
const TEAM = {
  friquiton: "1207592291188665",
  tamara:    "1209248334964443",
  rafa:      "1211060457213910",
  diego:     "1213483686471887",
  javiera:   "1207207427326115",
  ignacia:   "1206322141323221",
  felex:     "1201852562999880",
}

// ── Reglas de asignación ───────────────────────────────────────
function determinarAssignee(
  marcaNorm: string,
  formatoNorm: string,
  produccion: string,
): string {
  if (formatoNorm === "ugc") return TEAM.felex

  if (["static", "imagen/gráfico", "carrusel"].includes(formatoNorm)) {
    if (marcaNorm.includes("mycocos")) return TEAM.javiera
    if (marcaNorm.includes("mennt"))   return TEAM.ignacia
  }

  const esGrabacion = /grabación/i.test(produccion)

  if (esGrabacion) {
    if (marcaNorm.includes("mycocos")) return TEAM.friquiton
    if (marcaNorm.includes("mennt"))   return TEAM.diego
  }

  // Solo Edición
  if (marcaNorm.includes("mycocos")) return TEAM.rafa
  if (marcaNorm.includes("mennt"))   return TEAM.rafa

  return ""
}

// ── Notas ultra-estructuradas para Asana ──────────────────────
function buildNotes(p: {
  linkBrief?:   string | null
  objetivo?:    string
  concepto:     string
  angulo?:      string
  deseo?:       string
  hipotesis?:   string
  hook?:        string
  hooksCount?:  number
  produccion?:  string
  formato?:     string
  marcaLabel?:  string
  batch?:       string
  referencia?:  string
}): string {
  const L: string[] = []

  // Link al Brief — prominente arriba
  if (p.linkBrief) {
    L.push(`🔗 LINK AL BRIEF: ${p.linkBrief}`)
    L.push("")
  }

  L.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  L.push("")

  L.push("📌 [OBJETIVO]")
  L.push(p.objetivo?.trim() || "No especificado")
  L.push("")

  L.push("🎯 [ESTRATEGIA]")
  L.push(`Concepto: ${p.concepto}`)
  if (p.angulo?.trim())    L.push(`Ángulo: ${p.angulo}`)
  if (p.deseo?.trim())     L.push(`Deseo del usuario: ${p.deseo}`)
  if (p.hipotesis?.trim()) L.push(`Hipótesis: ${p.hipotesis}`)
  if (p.hook?.trim())      L.push(`Hook principal: ${p.hook}`)
  if (p.hooksCount)        L.push(`Total de hooks: ${p.hooksCount}`)
  L.push("")

  L.push("📋 [INSTRUCCIONES DE PRODUCCIÓN]")
  if (p.produccion?.trim()) L.push(`Producción: ${p.produccion}`)
  L.push(`Formato: ${p.formato || "Video"}`)
  if (p.marcaLabel)         L.push(`Marca: ${p.marcaLabel}`)
  L.push(`Batch: ${p.batch || "—"}`)
  L.push("")

  L.push("🔗 [REFERENCIAS]")
  L.push(p.referencia?.trim() || "Sin referencias")
  L.push("")

  L.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  L.push("✅ Validado por Brief Studio")

  return L.join("\n")
}

// ── Tag "Validado por Brief Studio" (cacheado por instancia) ──
let _workspaceGid: string | null = null
let _tagGid:       string | null = null
const TAG_NAME = "Validado por Brief Studio"

async function resolveValidadoTag(pat: string): Promise<string | null> {
  try {
    // 1. Obtener workspace del proyecto (1 llamada, luego en caché)
    if (!_workspaceGid) {
      const r = await fetch(
        `${ASANA_BASE}/projects/${PROJECT_GID}?opt_fields=workspace.gid`,
        { headers: { Authorization: `Bearer ${pat}` } },
      )
      const d = await r.json()
      _workspaceGid = d.data?.workspace?.gid ?? null
    }
    if (!_workspaceGid) return null

    // 2. Buscar o crear el tag (1 llamada, luego en caché)
    if (!_tagGid) {
      const r = await fetch(
        `${ASANA_BASE}/workspaces/${_workspaceGid}/tags?opt_fields=gid,name&limit=100`,
        { headers: { Authorization: `Bearer ${pat}` } },
      )
      const d = await r.json()
      const found = (d.data || []).find(
        (t: { gid: string; name: string }) => t.name === TAG_NAME,
      )
      if (found) {
        _tagGid = found.gid
      } else {
        const cr = await fetch(`${ASANA_BASE}/tags`, {
          method: "POST",
          headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
          body: JSON.stringify({ data: { name: TAG_NAME, workspace: _workspaceGid } }),
        })
        const cd = await cr.json()
        _tagGid = cd.data?.gid ?? null
      }
    }
    return _tagGid
  } catch {
    return null   // no-fatal
  }
}

// ── Helpers ────────────────────────────────────────────────────
function norm(s: string): string {
  return (s || "").trim().toLowerCase().replace(/®/g, "").replace(/\s+cl$/i, "").replace(/\s+/g, " ")
}

function findOpt(opts: Record<string, string>, input: string): string | null {
  const n = norm(input)
  for (const [key, gid] of Object.entries(opts)) {
    if (n.includes(key) || key.includes(n)) return gid
  }
  return null
}

async function asanaRequest(path: string, method: string, body?: unknown) {
  const pat = Deno.env.get("ASANA_PAT")
  if (!pat) throw new Error("ASANA_PAT no configurado como secret")

  const res = await fetch(`${ASANA_BASE}${path}`, {
    method,
    headers: { "Authorization": `Bearer ${pat}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (data.errors) throw new Error(JSON.stringify(data.errors))
  return data
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ── Handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { batch, concepto, formato, marca, produccion, hook, angulo, deseo, referencia, hipotesis, hooksCount, objetivo, assigneeOverride, linkBrief } = await req.json()

    if (!concepto || !marca) {
      return new Response(JSON.stringify({ error: "Faltan campos: concepto, marca" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } })
    }

    // Soporte multi-marca: 'mycocos_cl,mennt_cl' → ['mycocos_cl', 'mennt_cl']
    const marcaList = marca.split(',').map((s: string) => s.trim()).filter(Boolean)
    const marcaPrimaria = marcaList[0] || marca
    const marcaNorm = norm(marcaPrimaria)
    const formatoNorm = norm(formato || "video")
    const assignee = assigneeOverride || determinarAssignee(marcaNorm, formatoNorm, produccion || "")

    // Título: [BATCH] - [CONCEPTO] - [marca(s)]
    const marcaLabel = marcaList.length > 1 ? marcaList.join(' + ') : marca
    const titulo = `[${batch || "—"}] - ${concepto} - ${marcaLabel}`

    // Notas estructuradas
    const notes = buildNotes({
      linkBrief,
      objetivo,
      concepto,
      angulo,
      deseo,
      hipotesis,
      hook,
      hooksCount: typeof hooksCount === "number" ? hooksCount : undefined,
      produccion,
      formato,
      marcaLabel,
      batch,
      referencia,
    })

    // Custom fields
    const customFields: Record<string, unknown> = {}

    const fmtGid = findOpt(FORMATO_OPTS, formato || "video")
    if (fmtGid) customFields[CF.FORMATO] = fmtGid

    customFields[CF.PLATAFORMA] = PLATAFORMA_DEFAULT
    customFields[CF.FUNNEL] = FUNNEL_DEFAULT
    customFields[CF.PRIORIDAD] = PRIORIDAD_DEFAULT

    // Multi-marca: buscar GID para cada una y enviar array a Asana
    const mGids = marcaList.map((m: string) => findOpt(MARCA_OPTS, m)).filter(Boolean)
    if (mGids.length > 0) customFields[CF.MARCA] = mGids

    if (typeof hooksCount === "number") customFields[CF.HOOKS] = hooksCount

    if (objetivo) {
      const oGid = findOpt(OBJETIVO_OPTS, objetivo)
      if (oGid) customFields[CF.OBJETIVO] = [oGid]
    }

    // Crear tarea
    const taskData: Record<string, unknown> = {
      name: titulo,
      notes,
      projects: [PROJECT_GID],
      memberships: [{ project: PROJECT_GID, section: SECTION_GID }],
      custom_fields: customFields,
      followers: FOLLOWERS_FIJOS,
    }
    if (assignee) taskData.assignee = assignee

    const result = await asanaRequest("/tasks", "POST", { data: taskData })
    const taskGid = result.data.gid

    // Añadir tag "Validado por Brief Studio" (no-fatal)
    const tagGid = await resolveValidadoTag(pat)
    if (tagGid) {
      try {
        await asanaRequest(`/tasks/${taskGid}/addTag`, "POST", { data: { tag: tagGid } })
      } catch { /* no-fatal */ }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        taskGid,
        taskUrl: `https://app.asana.com/0/${PROJECT_GID}/${taskGid}`,
        titulo,
        assignee,
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
