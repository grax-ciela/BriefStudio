import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ASANA_BASE = "https://app.asana.com/api/1.0"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { taskGid, name, completed } = await req.json()

    if (!taskGid) {
      return new Response(
        JSON.stringify({ error: "Falta campo: taskGid" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (completed !== undefined) updateData.completed = completed

    await asanaRequest(`/tasks/${taskGid}`, "PUT", { data: updateData })

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }
})
