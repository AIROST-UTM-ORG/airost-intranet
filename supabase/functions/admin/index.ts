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
    const pathname = url.pathname.replace('/admin', '')
    const pathParts = pathname.split('/').filter(Boolean)

    // GET /users
    if (req.method === 'GET' && pathParts[0] === 'users' && pathParts.length === 1) {
      const { data, error } = await supabase.from('users').select('*')
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // POST /users/verified
    if (req.method === 'POST' && pathParts[0] === 'users' && pathParts[1] === 'verified') {
      const body = await req.json()
      const { data, error } = await supabase
        .from('verified_users')
        .insert([body])
        .select()
        .single()
        
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 })
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
