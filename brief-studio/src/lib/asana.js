import { supabase } from './supabaseClient'

/**
 * Envía un brief a Asana vía Edge Function.
 * Retorna { ok, taskGid, taskUrl, titulo, assignee, followers } o lanza error.
 */
export async function crearTareaAsana({
  batch,
  concepto,
  formato,
  marca,
  produccion,
  hook,
  angulo,
  deseo,
  referencia,
  hooksCount,
  objetivo,
  assigneeOverride,
  linkBrief,
}) {
  const assigneeOverrideFinal = (assigneeOverride && assigneeOverride.trim() !== '') ? assigneeOverride : null
  console.log('[crearTareaAsana] assigneeOverride recibido:', assigneeOverride, '→ enviando:', assigneeOverrideFinal)

  const { data, error } = await supabase.functions.invoke('crear-tarea-asana', {
    body: {
      batch,
      concepto,
      formato,
      marca,
      produccion,
      hook,
      angulo,
      deseo,
      referencia,
      hooksCount,
      objetivo,
      assigneeOverride: assigneeOverrideFinal,
      linkBrief: linkBrief || null,
    },
  })

  if (error) throw new Error(error.message || 'Error al conectar con Asana')
  if (!data.ok) throw new Error(data.error || 'Error desconocido de Asana')

  return data
}

/**
 * Descarta una tarea en Asana: renombra con [DESCARTADO] y la marca como completada.
 */
export async function descartarTareaAsana(taskGid, tituloOriginal) {
  const { data, error } = await supabase.functions.invoke('actualizar-tarea-asana', {
    body: {
      taskGid,
      name: `[DESCARTADO] - ${tituloOriginal}`,
      completed: true,
    },
  })

  if (error) throw new Error(error.message || 'Error al actualizar tarea en Asana')
  return data
}
