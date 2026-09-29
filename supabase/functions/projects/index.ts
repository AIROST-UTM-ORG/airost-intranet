import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = getSupabaseClient(req)
    const url = new URL(req.url)
    const pathname = url.pathname.replace('/projects', '')
    const pathParts = pathname.split('/').filter(Boolean)

    // GET / -> getProjects
    if (req.method === 'GET' && pathParts.length === 0) {
      const { data, error } = await supabase.from('projects').select('*')
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // POST / -> createProject
    if (req.method === 'POST' && pathParts.length === 0) {
      const body = await req.json()
      
      const { data: lastProject, error: countError } = await supabase
        .from('projects')
        .select('project_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      const newProjectId = (lastProject?.project_id || 0) + 1

      const { data, error } = await supabase
        .from('projects')
        .insert([{ project_id: newProjectId, ...body }])
        .select()
        .single()
      
      if (error) throw error

      await supabase.from('project_boards').insert([{ project_id: newProjectId, ...body }])
      
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // DELETE /:id -> deleteProject
    if (req.method === 'DELETE' && pathParts.length === 1) {
      const id = pathParts[0]
      const { data, error } = await supabase.from('projects').delete().eq('project_id', id).select().single()
      if (error) throw error
      await supabase.from('project_boards').delete().eq('project_id', id)
      
      return new Response(JSON.stringify({ message: 'Project deleted', deletedProject: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // GET /tracking/:uid -> getProjectBoard
    if (req.method === 'GET' && pathParts[0] === 'tracking' && pathParts.length === 2) {
      const uid = pathParts[1]
      const { data, error } = await supabase.from('project_boards').select('*').eq('project_id', uid).single()
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // POST /tracking -> createProjectBoard
    if (req.method === 'POST' && pathParts[0] === 'tracking') {
      const body = await req.json()
      const { data: existing, error: findError } = await supabase.from('project_boards').select('*').eq('project_id', body.projectId).single()
      
      if (!existing) {
        const { data, error } = await supabase.from('project_boards').insert([body]).select().single()
        if (error) throw error
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 })
      } else {
        const { data, error } = await supabase.from('project_boards').update({ tasks: body.tasks }).eq('project_id', body.projectId).select().single()
        if (error) throw error
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
      }
    }

    // PUT /tracking -> refreshProjectBoard
    if (req.method === 'PUT' && pathParts[0] === 'tracking') {
      const body = await req.json()
      const { data, error } = await supabase.from('project_boards').update({ tasks: body.tasks }).eq('project_id', body.projectId).select().single()
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // PUT /update -> updateProjectBoard
    if (req.method === 'PUT' && pathParts[0] === 'update') {
      const body = await req.json()
      // In PostgreSQL we would use JSONB operations to update a specific task in the tasks array,
      // but for simplicity we will just fetch, modify, and save, or assume tasks are in a separate table.
      // Since it's a direct translation of the Mongo code, we'll fetch, update array, and save.
      const { data: board, error: fetchErr } = await supabase.from('project_boards').select('*').eq('project_id', body.projectId).single()
      if (fetchErr) throw fetchErr

      const tasks = board.tasks || []
      const taskIndex = tasks.findIndex((t: any) => t.task_id === body.tasks.task_id)
      if (taskIndex >= 0) {
        tasks[taskIndex] = body.tasks
      } else {
        tasks.push(body.tasks)
      }

      const { data, error } = await supabase.from('project_boards').update({ tasks }).eq('project_id', body.projectId).select().single()
      if (error) throw error

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // GET /tasks/:taskId/history
    if (req.method === 'GET' && pathParts[0] === 'tasks' && pathParts[2] === 'history') {
      const taskId = pathParts[1]
      const { data, error } = await supabase.from('task_history').select('*').eq('task_id', taskId).order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // GET /:projectId/history
    if (req.method === 'GET' && pathParts[1] === 'history') {
      const projectId = pathParts[0]
      const { data, error } = await supabase.from('task_history').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
