'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RefreshCw, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'
import {
  russianPartnerMatcherDecision,
  type RussianMatcherAccess,
  type RussianMatcherCapability,
  type RussianMatcherPriority,
  type RussianMatcherPartnerSlug,
} from '@/lib/russianPartnerMatcher'

export interface RussianPartnerMatcherProfile extends RussianMatcherCapability {
  slug: RussianMatcherPartnerSlug
  name: string
  priceCount: number
  priceRange: string
  captureDate: string
  reviewHref: string
}

const accessOptions: { value: RussianMatcherAccess; label: string }[] = [
  { value: 'unchecked', label: 'Ещё не проверено' },
  { value: 'confirmed', label: 'Да — страна, KYC, оплата и выплата подтверждены' },
  { value: 'unclear', label: 'Нет или ответ поддержки неясен' },
]

const priorityOptions: { value: RussianMatcherPriority; label: string }[] = [
  { value: 'compare', label: 'Сначала сравнить обе фирмы' },
  { value: 'instant', label: 'Нужен продукт с 0 оценочных фаз' },
  { value: 'eur-tradelocker', label: 'Нужны цены в EUR и TradeLocker' },
  { value: 'broader-choice', label: 'Нужна самая широкая текущая линейка продуктов' },
]

function resultReason(priority: RussianMatcherPriority) {
  if (priority === 'instant') {
    return 'Результат отобран по наличию текущего продукта с 0 оценочных фаз. Трейлинг-просадка, невозвратный взнос или ограничение первой выплаты при этом могут сохраняться.'
  }
  if (priority === 'eur-tradelocker') {
    return 'Совпадение требует одновременно опубликованных цен в EUR и TradeLocker в текущем профиле фирмы. Доступный payout-маршрут всё равно проверяется отдельно.'
  }
  if (priority === 'broader-choice') {
    return 'Показана фирма с наибольшим числом текущих продуктов среди этой пары. При равенстве инструмент вернёт обе фирмы; конкретный продукт всё равно проверяется отдельно.'
  }
  return 'Один фильтр не выбрал победителя. Сопоставьте полную стоимость, тип просадки, платформу и первую выплату у обеих фирм.'
}

export default function RussianPartnerMatcher({
  profiles,
}: {
  profiles: RussianPartnerMatcherProfile[]
}) {
  const [access, setAccess] = useState<RussianMatcherAccess>('unchecked')
  const [priority, setPriority] = useState<RussianMatcherPriority>('compare')
  const startedRef = useRef(false)
  const decision = russianPartnerMatcherDecision(access, priority, profiles)
  const matchedProfiles = decision.partnerSlugs.flatMap(slug => {
    const profile = profiles.find(candidate => candidate.slug === slug)
    return profile ? [profile] : []
  })
  const primaryProfileSetComplete = ['fundednext', 'bright-funded'].every(slug =>
    profiles.some(profile => profile.slug === slug && profile.productCount > 0 && profile.priceCount > 0),
  )
  const profileDataMissing = !primaryProfileSetComplete || (
    decision.kind !== 'blocked' && matchedProfiles.length !== decision.partnerSlugs.length
  )
  const commercialBlocked = decision.kind === 'blocked' || profileDataMissing

  const trackState = (
    changedControl: 'access' | 'priority',
    nextAccess: RussianMatcherAccess,
    nextPriority: RussianMatcherPriority,
  ) => {
    if (!startedRef.current) {
      startedRef.current = true
      track('russian_partner_matcher_started', { surface: 'russian_ranking' })
    }
    const nextDecision = russianPartnerMatcherDecision(nextAccess, nextPriority, profiles)
    track('russian_partner_matcher_result', {
      surface: 'russian_ranking',
      changed_control: changedControl,
      access: nextAccess,
      priority: nextPriority,
      outcome: nextDecision.outcome,
      matching_firms: nextDecision.partnerSlugs.length,
    })
  }

  const changeAccess = (next: RussianMatcherAccess) => {
    setAccess(next)
    trackState('access', next, priority)
  }

  const changePriority = (next: RussianMatcherPriority) => {
    setPriority(next)
    trackState('priority', access, next)
  }

  const reset = () => {
    if (access === 'unchecked' && priority === 'compare') return
    setAccess('unchecked')
    setPriority('compare')
    track('russian_partner_matcher_reset', { surface: 'russian_ranking' })
  }

  return (
    <section className="ru-section" id="podbor">
      <div
        className="ru-shell"
        data-russian-partner-matcher="eligibility-first"
        data-russian-matcher-result={commercialBlocked ? 'blocked' : decision.kind}
        data-russian-matcher-data-state={profileDataMissing ? 'missing' : 'current'}
        data-russian-matcher-affiliate-actions="hidden-until-confirmed"
      >
        <div className="ru-matcher-head">
          <div>
            <div className="ru-eyebrow"><SlidersHorizontal size={14} aria-hidden="true" /> 2 шага без ввода персональных данных</div>
            <h2 id="russian-partner-matcher-heading">Подобрать FundedNext или Bright Funded по задаче</h2>
            <p className="ru-muted">
              Инструмент не проверяет документы и не определяет доступность страны. Он показывает коммерческий маршрут
              только после вашего отдельного подтверждения четырёх полей.
            </p>
          </div>
          <span className="ru-matcher-privacy">Персональные данные не вводятся</span>
        </div>

        <div className="ru-matcher-controls" aria-labelledby="russian-partner-matcher-heading">
          <label className="ru-matcher-field" htmlFor="ru-matcher-access">
            <span>1. Подтверждены страна, KYC, оплата и способ выплаты?</span>
            <select
              id="ru-matcher-access"
              value={access}
              onChange={event => changeAccess(event.target.value as RussianMatcherAccess)}
            >
              {accessOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="ru-matcher-field" htmlFor="ru-matcher-priority">
            <span>2. Какая продуктовая задача главная?</span>
            <select
              id="ru-matcher-priority"
              value={priority}
              onChange={event => changePriority(event.target.value as RussianMatcherPriority)}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="ru-matcher-toolbar">
          <p>Результат основан на закрытых вариантах ответа; имя, email и документы вводить не нужно.</p>
          <button type="button" onClick={reset} className="ru-matcher-reset">
            <RefreshCw size={13} aria-hidden="true" /> Сбросить
          </button>
        </div>

        <div className="ru-matcher-result" aria-live="polite">
          {commercialBlocked ? (
            <div className="ru-notice" data-russian-matcher-block="country-kyc-payment-payout">
              <strong>Коммерческий результат пока заблокирован.</strong>{' '}
              {profileDataMissing
                ? 'Для выбранного результата нет полного текущего набора продуктов и цен. Дождитесь обновления источников и не переходите к checkout по устаревшей карточке.'
                : 'Сначала получите письменное подтверждение страны и гражданства, документов KYC, способа оплаты и payout-маршрута. Ни русский язык страницы, ни VPN не заменяют эти 4 проверки.'}
              <div className="ru-actions">
                <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверить профиль по стране</Link>
                <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Подготовить вопросы по KYC</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="partner-matcher">
                <strong>{decision.kind === 'single' ? 'Подходящий маршрут по выбранному фильтру.' : 'Сравните оба основных маршрута.'}</strong>{' '}
                {resultReason(priority)} Переходы ниже партнёрские и могут принести Traders Fund Hub комиссию.
              </div>
              <div className="ru-grid" data-russian-matcher-profile-count={matchedProfiles.length}>
                {matchedProfiles.map(profile => (
                  <article className="ru-card" key={profile.slug} data-russian-matcher-partner={profile.slug}>
                    <div className="ru-card-head">
                      <h3>{profile.name}</h3>
                      <span className="ru-score">Продуктов: {profile.productCount}</span>
                    </div>
                    <ul className="ru-facts">
                      <li><ShieldCheck size={14} aria-hidden="true" /> {profile.priceCount} цен; диапазон {profile.priceRange}</li>
                      <li>Самая ранняя дата проверки продукта: {profile.captureDate}</li>
                    </ul>
                    <div className="ru-actions">
                      <Link href={profile.reviewHref} className="btn-outline">Сначала прочитать обзор</Link>
                      <Link
                        href={`/go/${profile.slug}?from=ru-ranking-matcher-${profile.slug}`}
                        prefetch={false}
                        rel="sponsored nofollow noopener"
                        className="btn-primary"
                      >
                        Проверить {profile.name} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="ru-source-line">
          Результат не является гарантией checkout, KYC или выплаты. Если условия фирмы изменились после указанной даты,
          используйте официальный checkout и письменный ответ поддержки как более свежий источник.
        </p>
      </div>
    </section>
  )
}
