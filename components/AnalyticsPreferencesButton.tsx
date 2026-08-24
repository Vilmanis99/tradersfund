'use client'

export const OPEN_ANALYTICS_SETTINGS_EVENT = 'tfh:open-analytics-settings'

export default function AnalyticsPreferencesButton({ locale = 'en' }: { locale?: 'en' | 'ru' }) {
  return (
    <button
      type="button"
      className="footer-privacy-button"
      onClick={() => window.dispatchEvent(new Event(OPEN_ANALYTICS_SETTINGS_EVENT))}
    >
      {locale === 'ru' ? 'Настройки аналитики' : 'Analytics settings'}
    </button>
  )
}
