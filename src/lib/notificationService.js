import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = 'BAFbvI97ylavqApyw-9CLnQlu-4pZHGKCbdtGmqTqFg_vmDWehuyr5OCsEDAWmjB_EiAFtPwlpdyE8e06j0vLGU'

// Convert VAPID key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Check if push notifications are supported
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Get current permission status: 'granted', 'denied', 'default'
export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

// Check if currently subscribed for a given league
export async function isSubscribed(profileId, leagueId) {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('profile_id', profileId)
    .eq('league_id', leagueId)
  return data && data.length > 0
}

// Request permission and subscribe
export async function subscribeToPush(profileId, leagueId) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })

  // Store in Supabase
  const { error } = await supabase.from('push_subscriptions').upsert({
    profile_id: profileId,
    league_id: leagueId,
    subscription: subscription.toJSON(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'profile_id,league_id' })

  if (error) {
    console.error('Failed to save push subscription:', error)
  } else {
    console.log('Push subscription saved for profile:', profileId, 'league:', leagueId)
  }

  return subscription
}

// Unsubscribe
export async function unsubscribeFromPush(profileId, leagueId) {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await subscription.unsubscribe()

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', profileId)
    .eq('league_id', leagueId)
}

// Send notification via Edge Function
export async function sendPushNotification(leagueId, title, body, options = {}) {
  return supabase.functions.invoke('send-push', {
    body: { league_id: leagueId, title, body, ...options }
  })
}
