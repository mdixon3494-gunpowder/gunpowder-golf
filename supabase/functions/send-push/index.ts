import webpush from "npm:web-push"
import { createClient } from "npm:@supabase/supabase-js@2"

webpush.setVapidDetails(
  'mailto:mdixon3494@gmail.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  // CORS headers for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { league_id, title, body, profile_ids, tag, url } = await req.json()

    // Build query for subscriptions
    let query = supabase.from('push_subscriptions').select('subscription, profile_id')
    if (league_id) query = query.eq('league_id', league_id)
    if (profile_ids?.length) query = query.in('profile_id', profile_ids)

    const { data: subs, error } = await query
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const payload = JSON.stringify({ title, body, tag, url })
    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, payload))
    )

    // Clean up expired subscriptions (410 Gone)
    const expired = results
      .map((r, i) => r.status === 'rejected' && (r.reason as any)?.statusCode === 410 ? subs[i] : null)
      .filter(Boolean)

    if (expired.length > 0) {
      await supabase.from('push_subscriptions')
        .delete()
        .in('profile_id', expired.map(e => e!.profile_id))
    }

    const sent = results.filter(r => r.status === 'fulfilled').length
    return new Response(JSON.stringify({ sent, failed: results.length - sent }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
