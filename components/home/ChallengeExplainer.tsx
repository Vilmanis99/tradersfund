import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Banknote, CalendarCheck, ClipboardCheck, GitCompareArrows, History, MapPin, Receipt, ShieldAlert, Wallet } from 'lucide-react'
import FirmPairPicker from './FirmPairPicker'
import { RUSSIAN_FINDER_REVIEWS } from '@/lib/challengeComparisonData'
import { COST_FACT_SIZE, dayMonth, type ChallengeSectionFacts, type DateSpan, type RuleNote } from './challengeFacts'

type Locale = 'en' | 'ru'

export interface ExplainerCard {
  href: string
  label: string
  title: string
  cta: string
  data?: Record<string, string>
}

export interface ExplainerProps {
  locale: Locale
  id: string
  title: string
  facts: ChallengeSectionFacts
  /** Three cards in order: how challenges work, cost, rules. */
  cards: [ExplainerCard, ExplainerCard, ExplainerCard]
  more?: ReactNode
  data?: Record<string, string>
  /** Destination when the picker runs without JS or a pair has no page. */
  pickerFallbackHref: string
  pickerInitial: [string, string]
  country: { lead: string; label: string; href: string; data?: Record<string, string> }
  /** Optional compact link line under the bottom row. */
  extra?: { label: string; links: Array<{ href: string; title: string }>; data?: Record<string, string> }
  /** RU: access badge rendered next to the cheapest firm. */
  firmBadge?: (firmSlug: string) => ReactNode
}

const pct = (value: number) => `${String(value).replace('.', ',').replace(/,0$/, '')}%`
const pctEn = (value: number) => `${value}%`

function ruPlural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function money(locale: Locale, value: number, currency: 'USD' | 'EUR') {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

const KIND_RU: Record<RuleNote['kind'], string> = {
  'rule-change': 'изменение правил',
  'price-watch': 'цены',
  'lineup-change': 'линейка программ',
  'source-conflict': 'расхождение источников',
}

function Checked({ locale, span, count }: { locale: Locale; span: DateSpan | null; count?: number }) {
  if (!span) return null
  // Show the oldest supporting capture so a newer one never overstates freshness.
  const range = span.oldest === span.latest ? dayMonth(span.oldest) : `${dayMonth(span.oldest)}–${dayMonth(span.latest)}`
  const title = locale === 'ru'
    ? `${count != null ? `${count} ${ruPlural(count, 'программа проверена', 'программы проверены', 'программ проверены')}` : 'Источники проверены'}: ${range}`
    : `${count != null ? `${count} programmes checked` : 'Sources checked'} ${range}`
  return (
    <p className="uc-card__checked" title={title}>
      <CalendarCheck size={14} aria-hidden="true" />
      {locale === 'ru' ? 'Данные проверены' : 'Data checked'} <time dateTime={span.oldest}>{dayMonth(span.oldest)}</time>
    </p>
  )
}

function CardShell({ card, index, icon, children, checked }: { card: ExplainerCard; index: number; icon: ReactNode; children: ReactNode; checked: ReactNode }) {
  return (
    <article className="uc-card" {...card.data}>
      <div className="uc-card__top">
        <span className="uc-card__icon" aria-hidden="true">{icon}</span>
        <span className="th-guide__label">{String(index + 1).padStart(2, '0')} · {card.label}</span>
      </div>
      <h3>{card.title}</h3>
      <div className="uc-card__body">{children}</div>
      <div className="uc-card__foot">
        {checked}
        <Link href={card.href} className="uc-card__cta">{card.cta} <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>
  )
}

export default function ChallengeExplainer(props: ExplainerProps) {
  const { locale, id, title, facts, cards, more, data, country, extra } = props
  const ru = locale === 'ru'
  const p = ru ? pct : pctEn
  const { rules, cost, notes } = facts

  const steps = [
    {
      icon: <ClipboardCheck size={20} />,
      name: ru ? 'Оценка' : 'Evaluation',
      value: rules.target1 ? (ru ? `цель ${p(rules.target1.median)}` : `${p(rules.target1.median)} target`) : null,
      subs: [rules.target2 ? (ru ? `2-й этап: ${p(rules.target2.median)}` : `phase 2: ${p(rules.target2.median)}`) : null],
    },
    {
      icon: <Wallet size={20} />,
      name: ru ? 'Капитал' : 'Funded',
      value: rules.split ? (ru ? `доля ${p(rules.split.median)}` : `${p(rules.split.median)} split`) : null,
      subs: [rules.split ? (ru ? 'вашей прибыли' : 'of profit to you') : null],
    },
    {
      icon: <Banknote size={20} />,
      name: ru ? 'Выплата' : 'Payout',
      value: rules.firstPayoutDays ? (ru ? `через ${rules.firstPayoutDays.median} дн.` : `after ${rules.firstPayoutDays.median} days`) : null,
      subs: [rules.firstPayoutDays ? (ru ? 'первый запрос' : 'first request') : null],
    },
  ]

  const c = cost.cheapest
  const refundLine = c
    ? c.refundable === true
      ? (ru ? 'Взнос возвращается по условиям фирмы.' : 'Fee is refundable under the firm’s terms.')
      : c.refundable === false
        ? (ru ? 'Взнос этой программы не возвращается.' : 'This programme’s fee is not refundable.')
        : (ru ? 'Условия возврата взноса не подтверждены.' : 'Refund terms are not verified.')
    : null

  return (
    <section className="th-section uc" aria-labelledby={id}>
      <div className="th-wrap" {...data}>
        <div className="th-section__head"><h2 id={id}>{title}</h2>{more}</div>

        <div className="uc-cards">
          <CardShell card={cards[0]} index={0} icon={<ClipboardCheck size={18} />} checked={<Checked locale={locale} span={rules.checked} count={rules.programmes} />}>
            {rules.programmes > 0 ? (
              <p className="uc-card__lead">{ru
                ? `Медиана по ${rules.programmes} ${ruPlural(rules.programmes, 'программе', 'программам', 'программам')} ${rules.firms} ${ruPlural(rules.firms, 'фирмы', 'фирм', 'фирм')} с актуальными источниками.`
                : `Median rules across ${rules.programmes} source-fresh programmes from ${rules.firms} firms.`}</p>
            ) : null}
            <ol className="uc-steps" aria-label={ru ? 'Этапы челленджа' : 'Challenge stages'}>
              {steps.map((step, index) => (
                <li key={step.name} className="uc-step">
                  <span className="uc-step__dot" aria-hidden="true">{step.icon}</span>
                  <span className="uc-step__name"><span className="uc-step__num">{index + 1}</span> {step.name}</span>
                  {step.value ? <strong className="uc-step__value">{step.value}</strong> : null}
                  {step.subs.filter(Boolean).map(sub => <span key={sub} className="uc-step__sub">{sub}</span>)}
                </li>
              ))}
            </ol>
            {rules.daily || rules.max ? (
              <p className="uc-limits">
                <span>{ru ? 'Медианные лимиты убытка на оценке' : 'Median loss limits during evaluation'}</span>
                {rules.daily ? <strong>{ru ? `${p(rules.daily.median)} в день` : `${p(rules.daily.median)} daily`}</strong> : null}
                {rules.max ? <strong>{ru ? `${p(rules.max.median)} всего` : `${p(rules.max.median)} max`}</strong> : null}
              </p>
            ) : null}
          </CardShell>

          <CardShell card={cards[1]} index={1} icon={<Receipt size={18} />} checked={<Checked locale={locale} span={cost.checked} />}>
            {c ? (
              <div className="uc-fact" data-home-cheapest={`${c.firmSlug}`}>
                <strong className="uc-fact__value">{money(locale, c.costToFundedUsd, 'USD')}</strong>
                <span className="uc-fact__label">
                  {ru ? `Самый дешёвый челлендж $${(COST_FACT_SIZE / 1000)}K сейчас:` : `Cheapest $${COST_FACT_SIZE / 1000}K challenge right now:`}{' '}
                  {ru && RUSSIAN_FINDER_REVIEWS[c.firmSlug]
                    ? <Link href={RUSSIAN_FINDER_REVIEWS[c.firmSlug]}>{c.firmName}</Link>
                    : <Link href={c.reviewUrl} hrefLang={ru ? 'en' : undefined}>{c.firmName}</Link>} · {c.product}
                  {props.firmBadge ? <> {props.firmBadge(c.firmSlug)}</> : null}
                </span>
                {c.costToFundedUsd !== c.upfrontUsd ? (
                  <span className="uc-fact__label">{ru
                    ? `${money(locale, c.upfrontUsd, 'USD')} при оплате, остальное — после прохождения.`
                    : `${money(locale, c.upfrontUsd, 'USD')} at checkout; the rest is due after passing.`}</span>
                ) : null}
              </div>
            ) : null}
            <ul className="uc-notes">
              {refundLine ? <li>{refundLine}</li> : null}
              {cost.refundable ? (
                <li>{ru
                  ? `Возврат взноса предусмотрен у ${cost.refundable.count} из ${cost.refundable.of} тарифов $${COST_FACT_SIZE / 1000}K с проверенными условиями.`
                  : `${cost.refundable.count} of ${cost.refundable.of} verified $${COST_FACT_SIZE / 1000}K tiers list a fee refund.`}</li>
              ) : null}
              {cost.subscriptions ? (
                <li>{ru
                  ? `${cost.subscriptions.programmes} ${ruPlural(cost.subscriptions.programmes, 'программа', 'программы', 'программ')} ${cost.subscriptions.firms} ${ruPlural(cost.subscriptions.firms, 'фирмы', 'фирм', 'фирм')} списывают плату ежемесячно до прохождения — здесь не учтены.`
                  : `${cost.subscriptions.programmes} programmes from ${cost.subscriptions.firms} firms bill monthly until you pass and are left out here.`}</li>
              ) : null}
              {cost.cheapestEur ? (
                <li>{ru
                  ? `В евро — от ${money(locale, cost.cheapestEur.priceEur, 'EUR')} (${cost.cheapestEur.firmName}, ${cost.cheapestEur.product}); валюты не пересчитываем.`
                  : `EUR-priced from ${money(locale, cost.cheapestEur.priceEur, 'EUR')} (${cost.cheapestEur.firmName}, ${cost.cheapestEur.product}); currencies are not converted.`}</li>
              ) : null}
            </ul>
          </CardShell>

          <CardShell card={cards[2]} index={2} icon={<ShieldAlert size={18} />} checked={<Checked locale={locale} span={rules.checked} count={rules.programmes} />}>
            {rules.daily || rules.max ? (
              <dl className="uc-pair">
                {rules.daily ? <div><dt>{ru ? 'Медиана дневного лимита убытка' : 'Median daily loss limit'}</dt><dd>{p(rules.daily.median)}</dd></div> : null}
                {rules.max ? <div><dt>{ru ? 'Медиана общего лимита убытка' : 'Median max loss limit'}</dt><dd>{p(rules.max.median)}</dd></div> : null}
              </dl>
            ) : null}
            <ul className="uc-notes">
              {rules.trailing ? (
                <li>{ru
                  ? `У ${rules.trailing.count} из ${rules.trailing.of} программ просадка трейлинговая (в т.ч. по закрытию дня).`
                  : `${rules.trailing.count} of ${rules.trailing.of} programmes use a trailing or end-of-day trailing drawdown.`}</li>
              ) : null}
              {rules.consistency ? (
                <li>{ru
                  ? `${rules.consistency.count} из ${rules.consistency.of} публикуют правило консистентности.`
                  : `${rules.consistency.count} of ${rules.consistency.of} publish a consistency cap.`}</li>
              ) : null}
              {rules.newsLimited ? (
                <li>{ru
                  ? `${rules.newsLimited.count} из ${rules.newsLimited.of} запрещают или ограничивают торговлю на новостях.`
                  : `${rules.newsLimited.count} of ${rules.newsLimited.of} ban or restrict news trading.`}</li>
              ) : null}
              {rules.minDays ? (
                <li>{ru
                  ? `Медиана минимума торговых дней: ${rules.minDays.median} (по ${rules.minDays.n} ${ruPlural(rules.minDays.n, 'программе', 'программам', 'программам')}).`
                  : `Median minimum trading days: ${rules.minDays.median} (${rules.minDays.n} programmes publish one).`}</li>
              ) : null}
            </ul>
          </CardShell>
        </div>

        <div className="uc-bottom">
          {facts.picker.firms.length >= 2 ? (
            <div className="uc-panel" data-home-compare-picker={locale}>
              <h3 className="uc-panel__title"><GitCompareArrows size={18} aria-hidden="true" /> {ru ? 'Сравнить две фирмы' : 'Compare two firms'}</h3>
              <p className="uc-panel__lead">{ru
                ? `${facts.picker.firms.length} ${ruPlural(facts.picker.firms.length, 'фирма', 'фирмы', 'фирм')} с актуальными источниками. Пара открывает сравнение условий бок о бок${Object.values(facts.picker.pairHrefs).some(href => href.startsWith('/ru/')) ? ' — на русском, где страница есть' : ''}.`
                : `${facts.picker.firms.length} firms with current sources. Each pair opens its side-by-side rules page.`}</p>
              <FirmPairPicker locale={locale} firms={facts.picker.firms} pairHrefs={facts.picker.pairHrefs} fallbackHref={props.pickerFallbackHref} initial={props.pickerInitial} />
              {/* Crawlable link to the same destination as the picker's no-JS fallback (the form action is not a link). */}
              <p className="uc-panel__more"><Link href={props.pickerFallbackHref}>{ru ? 'Открыть подбор и рейтинг →' : 'See all comparisons →'}</Link></p>
            </div>
          ) : (
            // No pair with current sources: keep the comparison entry point as a plain link.
            <div className="uc-panel" data-home-compare-picker={`${locale}-link-only`}>
              <h3 className="uc-panel__title"><GitCompareArrows size={18} aria-hidden="true" /> {ru ? 'Сравнить две фирмы' : 'Compare two firms'}</h3>
              <p className="uc-panel__more"><Link href={props.pickerFallbackHref}>{ru ? 'Открыть подбор и рейтинг →' : 'See all comparisons →'}</Link></p>
            </div>
          )}
          {notes.length ? (
            <div className="uc-panel" data-home-rule-notes={notes.length}>
              <h3 className="uc-panel__title"><History size={18} aria-hidden="true" /> {ru ? 'Последние заметки о правилах' : 'Recent rule notes'}</h3>
              <ol className="uc-feed">
                {notes.map(note => (
                  <li key={note.id}>
                    <time dateTime={note.observedAt}>{dayMonth(note.observedAt)}</time>
                    <Link href={`/prop-firm-challenge-changes#${note.id}`} hrefLang={ru ? 'en' : undefined}>
                      <strong>{note.firmName}</strong>{' '}
                      {ru ? <span>— {KIND_RU[note.kind]}</span> : <span>{note.title}</span>}
                    </Link>
                    <span className={`uc-chip uc-chip--${note.status}`}>{note.status === 'verified' ? (ru ? 'подтверждено' : 'verified') : (ru ? 'на проверке' : 'watching')}</span>
                  </li>
                ))}
              </ol>
              <Link href="/prop-firm-challenge-changes" hrefLang={ru ? 'en' : undefined} className="th-link">
                {ru ? `Все ${facts.notesTotal} ${ruPlural(facts.notesTotal, 'заметка', 'заметки', 'заметок')} (на английском)` : `All ${facts.notesTotal} dated notes`} <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </div>

        <p className="uc-country" {...country.data}>
          <MapPin size={16} aria-hidden="true" />
          <strong>{country.lead}</strong>
          <Link href={country.href} className="th-link">{country.label} <ArrowRight size={14} aria-hidden="true" /></Link>
        </p>
        {extra ? (
          <p className="uc-extra" {...extra.data}>
            <span>{extra.label}</span>
            {extra.links.map(link => <Link key={link.href} href={link.href}>{link.title}</Link>)}
          </p>
        ) : null}
      </div>
    </section>
  )
}
