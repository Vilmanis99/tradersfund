'use client'

export const OPEN_ANALYTICS_SETTINGS_EVENT = 'tfh:open-analytics-settings'

export default function AnalyticsPreferencesButton() {
  return (
    <button
      type="button"
      className="footer-privacy-button"
      onClick={() => window.dispatchEvent(new Event(OPEN_ANALYTICS_SETTINGS_EVENT))}
    >
      Analytics settings
    </button>
  )
}
