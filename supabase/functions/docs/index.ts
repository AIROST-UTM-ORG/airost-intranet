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
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    // the route will be /docs or /docs/:id
    // pathParts will typically be ["docs"] or ["docs", "123"]
    const id = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null

    if (req.method === 'GET' && !id) {
      const { data, error } = await supabase
        .from('docs')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (req.method === 'GET' && id) {
      const { data, error } = await supabase
        .from('docs')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      if (!data) return new Response(JSON.stringify({ error: 'Not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })
      
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { image, title, profile, author, date, type, description, content } = body
      
      let emptyFields = []
      if (!image) emptyFields.push('image')
      if (!title) emptyFields.push('title')
      if (!profile) emptyFields.push('profile')
      if (!author) emptyFields.push('author')
      if (!date) emptyFields.push('date')
      if (!type) emptyFields.push('type')
      if (!description) emptyFields.push('description')
      if (!content) emptyFields.push('content')
      
      if (emptyFields.length > 0) {
        return new Response(JSON.stringify({ error: 'Please fill in all the fields', emptyFields }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
      }

      const { data, error } = await supabase
        .from('docs')
        .insert([{ image, title, profile, author, date, type, description, content }])
        .select()
        .single()

      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (req.method === 'DELETE' && id) {
      const { data, error } = await supabase
        .from('docs')
        .delete()
        .eq('id', id)

      if (error) throw error
      return new Response(JSON.stringify({ message: 'Doc deleted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (req.method === 'PATCH' && id) {
      const body = await req.json()
      const { data, error } = await supabase
        .from('docs')
        .update({ ...body })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
