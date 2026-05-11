// Posthog analytics — loaded via CDN snippet

function loadPosthog(key, host) {
  if (typeof window === 'undefined') return
  if (window.__posthogLoaded) return
  window.__posthogLoaded = true
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","").replace("https://","")+"https://us-assets.i.posthog.com/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(a!==void 0?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return a!=="posthog"&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  })
}

export function initPosthog() {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  loadPosthog(key)
}

export function track(event, props = {}) {
  if (typeof window === 'undefined') return
  try {
    if (window.posthog?.capture) {
      window.posthog.capture(event, { ...props, app: 'guud-quote-ai' })
    }
  } catch(e) {}
}

export const analytics = {
  chatStarted:        (agente)          => track('chat_started',         { agente }),
  quoteGenerated:     (agente, precio, proyecto) => track('quote_generated',    { agente, precio_min: precio, proyecto }),
  quoteAccepted:      (agente, precio)  => track('quote_accepted',       { agente, precio_min: precio }),
  quoteAdjusted:      (agente)          => track('quote_adjusted',        { agente }),
  schedulerOpened:    (agente)          => track('scheduler_opened',     { agente }),
  meetingScheduled:   (agente, precio)  => track('meeting_scheduled',    { agente, precio_min: precio }),
  quoteShared:        (agente)          => track('quote_shared',          { agente }),
  quotePdfDownloaded: (agente)          => track('quote_pdf_downloaded', { agente }),
  languageChanged:    (lang)            => track('language_changed',     { lang }),
}
