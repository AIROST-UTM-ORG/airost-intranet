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
    const pathname = url.pathname.replace('/auth', '')
    const pathParts = pathname.split('/').filter(Boolean)

    // GET /login/success
    if (req.method === 'GET' && pathParts[0] === 'login' && pathParts[1] === 'success') {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user) {
        return new Response(JSON.stringify({ success: true, message: "Successfully authenticated", user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
      } else {
        return new Response(JSON.stringify({ success: false, message: "User not authenticated" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
      }
    }

    // GET /login/failed
    if (req.method === 'GET' && pathParts[0] === 'login' && pathParts[1] === 'failed') {
      return new Response(JSON.stringify({ success: false, message: "Authentication failed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    // GET /logout
    if (req.method === 'GET' && pathParts[0] === 'logout') {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // In a real scenario, client side should redirect.
      return new Response(JSON.stringify({ success: true, message: "Logged out" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // GET /google & /google/callback are handled by Supabase Auth Client directly
    if (req.method === 'GET' && pathParts[0] === 'google') {
      return new Response(JSON.stringify({ message: "Google Auth should be handled on the client side using supabase.auth.signInWithOAuth({ provider: 'google' })" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
