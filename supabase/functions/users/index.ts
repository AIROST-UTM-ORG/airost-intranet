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
    const id = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null

    if (req.method === 'PATCH' && id) {
      const body = await req.json()
      const { data, error } = await supabase
        .from('users')
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
