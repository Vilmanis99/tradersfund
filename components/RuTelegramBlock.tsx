import { ruTelegramHref } from '@/lib/ruTelegram'

/** Telegram glyph (inline: lucide-react has no brand icons). */
function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M21.94 4.66 18.7 19.9c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.3c-.26.26-.49.48-1 .48l.36-5.03 9.15-8.27c.4-.35-.09-.55-.62-.2L6.17 13.5l-4.87-1.52c-1.06-.33-1.08-1.06.22-1.57l19.03-7.33c.88-.33 1.65.2 1.39 1.58Z" />
    </svg>
  )
}

/**
 * «Подписаться» block for the RU Telegram channel. RU routes only: after the verdict box
 * on /ru/obzor-* reviews and RU comparisons, and once in the RU footer. It sits below the
 * verdict/CTA section, so the main sign-up CTA keeps its position on mobile.
 * `placement` becomes utm_campaign (page slug, or 'footer').
 */
export default function RuTelegramBlock({ placement, variant = 'section' }: { placement: string; variant?: 'section' | 'footer' }) {
  const href = ruTelegramHref(placement)
  const titleId = `ru-tg-title-${placement}`
  const card = (
    <aside className={`ru-tg ru-tg--${variant}`} data-ru-telegram={placement} aria-labelledby={titleId} lang="ru">
      <span className="ru-tg__icon"><TelegramIcon /></span>
      <div className="ru-tg__text">
        <p id={titleId} className="ru-tg__title">Telegram-канал TradersFundHub</p>
        <p className="ru-tg__lead">Изменения правил, новые промокоды и проверки доступа из РФ — коротко.</p>
      </div>
      <a className="ru-tg__btn" href={href} target="_blank" rel="noopener" data-ru-telegram-link={placement}>
        Подписаться<span className="sr-only"> на Telegram-канал (откроется в новой вкладке)</span>
      </a>
    </aside>
  )
  if (variant === 'footer') return card
  return (
    <section className="ru-section ru-tg-section" data-ru-telegram-section={placement}>
      <div className="ru-shell">{card}</div>
    </section>
  )
}
