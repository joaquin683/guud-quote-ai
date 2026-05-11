import posthog from 'posthog-js'

let initialized = false

export function initPosthog() {
  if (typeof window === 'undefined') return
  if (initialized) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // manual only for clean data
    persistence: 'localStorage+cookie',
    loaded: () => { initialized = true }
  })
}

export function track(event, props = {}) {
  if (typeof window === 'undefined') return
  if (!posthog?.__loaded) return
  posthog.capture(event, { ...props, app: 'guud-quote-ai' })
}

// Funnel events
export const analytics = {
  // Top of funnel
  chatStarted: (agente) =>
    track('chat_started', { agente }),

  // Mid funnel
  quoteGenerated: (agente, precio, proyecto) =>
    track('quote_generated', { agente, precio_min: precio, proyecto }),

  quoteAccepted: (agente, precio) =>
    track('quote_accepted', { agente, precio_min: precio }),

  quoteAdjusted: (agente) =>
    track('quote_adjusted', { agente }),

  // Bottom funnel
  schedulerOpened: (agente) =>
    track('scheduler_opened', { agente }),

  meetingScheduled: (agente, precio) =>
    track('meeting_scheduled', { agente, precio_min: precio }),

  // Sharing
  quoteShared: (agente) =>
    track('quote_shared', { agente }),

  quotePdfDownloaded: (agente) =>
    track('quote_pdf_downloaded', { agente }),

  // Language
  languageChanged: (lang) =>
    track('language_changed', { lang }),
}
