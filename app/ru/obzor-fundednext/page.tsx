import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, Database } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { challengeTierEconomics, getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/obzor-fundednext'
const TITLE = 'FundedNext: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Обзор FundedNext на русском: модели Stellar, цены, просадка, выплаты и проверка ограничений по стране с датой захвата условий.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

const payoutLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'каждые две недели',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу при выполнении условий',
}

function priceRange(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return 'не опубликована'
  const format = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return sorted[0] === sorted.at(-1) ? format(sorted[0]) : `${format(sorted[0])}–${format(sorted.at(-1)!)}`
}

function targetLabel(product: Challenge) {
  if (!product.profitTargets) return 'нет цели'
  const targets = [product.profitTargets.phase1, product.profitTargets.phase2]
    .filter((target): target is number => target != null)
  return targets.length > 0 ? `${targets.join('% / ')}%` : 'не опубликованы'
}

function lossLabel(product: Challenge) {
  const daily = product.dailyLossPct == null ? 'нет дневного лимита' : `${product.dailyLossPct}% в день`
  const maximum = product.maxLossPct == null ? 'максимум не опубликован' : `${product.maxLossPct}% максимум`
  return `${daily}; ${maximum}`
}

function payoutLabel(product: Challenge) {
  if (product.payoutFirstDays === 0) return 'по запросу после условий'
  if (product.payoutFirstDays == null) return 'срок не опубликован'
  return `${product.payoutFirstDays} дн.; ${payoutLabels[product.payoutFrequency ?? ''] ?? product.payoutFrequency ?? 'цикл не опубликован'}`
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Доступен ли FundedNext резидентам России?',
    a: 'Мы не можем подтвердить доступность. Официальная статья по CFD не включает Россию в список ограничений, но корпоративная страница FundedNext говорит, что компания не обслуживает резидентов России. Futures-продукты прямо запрещают покупку из России. До письменного подтверждения поддержки и успешной проверки профиля считать доступ доказанным нельзя.',
  },
  {
    q: 'Какая программа FundedNext самая дешёвая?',
    a: 'Минимальная цена зависит от модели, размера счёта, промоакции и возможной отдельной платы платформы. Проверяйте именно текущую страницу оплаты: наша таблица показывает цены только после свежего захвата условий.',
  },
  {
    q: 'Получает ли новый трейдер сплит 95%?',
    a: 'Нет универсального процента для всех моделей. Сплит, платные дополнения и условия роста могут различаться по продукту, поэтому сравнивайте их по свежему захвату и действующим правилам.',
  },
  {
    q: 'Можно ли обойти ограничение страны через VPN?',
    a: 'Нет. FundedNext прямо запрещает скрывать резидентство или использовать VPN, прокси, чужую личность либо неверные данные для обхода ограничений; это может привести к закрытию аккаунта.',
  },
  {
    q: 'Какая программа дешевле всего по захваченным ценам?',
    a: 'Минимальный опубликованный вход — Stellar Lite на $5K за $32.99. Следующие ориентиры — $59.99 для 2-Step на $6K и $59.99 для Instant на $2K, но у них разные просадка, сплит и возврат комиссии; сравнивать только цену нельзя.',
  },
  {
    q: 'Когда возвращают регистрационный взнос?',
    a: 'Для Stellar 2-Step возврат привязан к первому одобренному reward. Для новых 1-Step и Lite — к третьему одобренному reward. Stellar Instant не возвращает взнос, потому что оценочного этапа нет.',
  },
  {
    q: 'Что происходит с прибылью во время важных новостей?',
    a: 'На funded-счёте сделки за 5 минут до и 5 минут после указанного события получают только 40% зачёта прибыли, а убыток учитывается полностью. На этапе challenge действует другой режим, поэтому проверяйте продуктовую страницу.',
  },
  {
    q: 'Можно ли торговать с советником или копировать сделки?',
    a: 'EA зависит от платформы и отдельного разрешения; автоматизацию нельзя считать разрешённой на cTrader и Match-Trader только потому, что она доступна на MT4/MT5. Copy-trading ограничен счетами одного владельца, а копирование между funded-счетами запрещено.',
  },
]

export default function RussianFundedNextReviewPage() {
  const firm = getAllFirms().find(candidate => candidate.name === 'FundedNext')
  const products = getChallengesByFirm('fundednext')
  const freshProducts = products.filter(product => isChallengeFresh(product))
  const pricedTiers = freshProducts.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceUsd != null && tier.priceUsd > 0 ? [{ product, tier, price: tier.priceUsd }] : []))
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')
  const sourceUrls = [...new Set(freshProducts.map(product => product.sourceUrl))]
  const latestProductCapture = products.map(product => product.sourceCapturedAt).sort().at(-1)
  const hasFreshProducts = freshProducts.length > 0
  const twoStep = freshProducts.find(product => product.productSlug === 'stellar-2-step')
  const oneStep = freshProducts.find(product => product.productSlug === 'stellar-1-step')
  const lite = freshProducts.find(product => product.productSlug === 'stellar-lite')
  const instant = freshProducts.find(product => product.productSlug === 'stellar-instant')
  const tierFor = (product: typeof twoStep, sizeUsd: number) =>
    product?.accountSizes.find(tier => tier.sizeUsd === sizeUsd)
  const twoStep100k = tierFor(twoStep, 100000)
  const oneStep100k = tierFor(oneStep, 100000)
  const lite100k = tierFor(lite, 100000)
  const instant10k = tierFor(instant, 10000)
  const twoStepCost = twoStep && twoStep100k ? challengeTierEconomics(twoStep, twoStep100k) : null
  const instantCost = instant && instant10k ? challengeTierEconomics(instant, instant10k) : null
  const money = (value: number | null | undefined) => value == null
    ? '—'
    : `$${value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор FundedNext' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2024-09-02',
    dateModified: latestProductCapture ?? marketEvidence.capturedAt,
    author: { '@type': 'Person', name: 'Edris Derakhshi' },
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / FundedNext</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> {hasFreshProducts ? `Свежие данные продуктов: ${latestProductCapture}` : `Захват условий от ${latestProductCapture ?? 'неуказанной даты'} требует обновления`}</div>
          <h1>FundedNext: обзор 2026 — 22 цены и 4 набора правил</h1>
          <p className="ru-lead">
            Модели Stellar различаются числом этапов, просадкой, сплитом и сроком первой выплаты.
            Выбирать нужно по ограничивающему правилу, а не по максимальному рекламному проценту.
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {latestProductCapture ?? marketEvidence.capturedAt}</span>
            <span>12 минут чтения</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>текущих моделей</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>опубликованных цен</span></div>
            <div className="ru-stat"><strong>{priceRange(pricedTiers.map(item => item.price))}</strong><span>диапазон входа</span></div>
            <div className="ru-stat"><strong>{firm?.score.toFixed(1) ?? '—'}/10</strong><span>редакционный балл</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-fundednext-article="long-form">
      <section className="ru-section ru-review-opening" data-russian-fundednext-editorial-shell="review-parity">
        <div className="ru-shell">
          <div className="ru-notice ru-disclosure ru-review-top-disclosure">
            <strong>Партнёрское раскрытие.</strong> Мы можем получить комиссию, если читатель
            зарегистрируется через подходящую ссылку на этой странице; цена для читателя
            не увеличивается. Партнёрство даёт <strong>0 баллов</strong> к оценке 8.8/10 и
            не меняет сравнение 4 продуктов, 22 цен или ограничений по стране.
          </div>

          {firm ? (
            <aside className="ru-review-firm-card" aria-label="Краткая карточка FundedNext">
              <div className="ru-review-firm-brand">
                {firm.logo ? (
                  <Image
                    src={firm.logo}
                    alt="Логотип FundedNext"
                    width={64}
                    height={64}
                    className="ru-review-firm-logo"
                  />
                ) : null}
                <div>
                  <div className="ru-review-firm-title-row">
                    <strong>FundedNext</strong>
                    <span className="ru-pill">TFH {firm.score.toFixed(1)}/10</span>
                  </div>
                  <p>
                    {freshProducts.length} модели CFD · {pricedTiers.length} цен · проверено {latestProductCapture ?? 'без даты'}
                  </p>
                  {firm.trustpilotScore != null && firm.trustpilotCount != null ? (
                    <p className="ru-review-trustpilot">
                      Trustpilot: {firm.trustpilotScore.toFixed(1)}/5 по {firm.trustpilotCount.toLocaleString('ru-RU')} отзывам,
                      захват {firm.trustpilotCapturedAt ?? 'без даты'}; рейтинг не доказывает выплату по конкретному счёту.
                      {firm.trustpilotUrl ? <> <a href={firm.trustpilotUrl} target="_blank" rel="noopener noreferrer">Проверить профиль</a>.</> : null}
                    </p>
                  ) : null}
                </div>
              </div>

              <dl className="ru-review-firm-facts">
                <div><dt>Базовая доля</dt><dd>80% challenge / 70% Instant</dd></div>
                <div><dt>Просадка</dt><dd>статическая или trailing</dd></div>
                <div><dt>Первая выплата</dt><dd>5 или 21 день; Instant по условиям</dd></div>
                <div><dt>Макс. распределение</dt><dd>{firm.maxAllocation}</dd></div>
              </dl>

              <div className="ru-review-firm-action">
                <p>Сначала подтвердите страну проживания, KYC, платформу и итоговую сумму checkout.</p>
                <Link
                  href="/go/fundednext?from=ru-fundednext-review-summary"
                  rel="sponsored nofollow noopener"
                  className="btn-primary btn-glow"
                >
                  Открыть текущие планы <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <section className="ru-section ru-review-toc-section">
        <div className="ru-shell">
          <nav className="toc ru-review-toc" aria-label="Содержание обзора FundedNext">
            <div className="toc-title">Содержание обзора</div>
            <ol>
              <li><a href="#verdict">Краткий вывод</a></li>
              <li><a href="#access">Доступ для России и русскоязычных за рубежом</a></li>
              <li><a href="#method">Методика проверки</a></li>
              <li><a href="#facts">FundedNext в цифрах</a></li>
              <li><a href="#products">Четыре модели Stellar</a></li>
              <li><a href="#true-cost">Реальная стоимость и возврат комиссии</a></li>
              <li><a href="#rules">Выплаты и торговые правила</a></li>
              <li><a href="#pros">Плюсы и ограничения</a></li>
              <li><a href="#fit">Кому подходит или не подходит FundedNext</a></li>
              <li><a href="#prices">Все цены и ограничения</a></li>
              <li><a href="#final-check">Проверка перед регистрацией</a></li>
              <li><a href="#alternatives">С чем сравнить FundedNext</a></li>
              <li><a href="#faq">Частые вопросы</a></li>
            </ol>
          </nav>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="verdict">Краткий вывод</h2>
          <p><strong>FundedNext нельзя оценивать по одной цифре «до 95%».</strong> В захвате от {latestProductCapture ?? 'неуказанной даты'} находятся {freshProducts.length} разные модели и {pricedTiers.length} листинговых цен: challenge-счета стартуют с {twoStep?.profitSplitPct ?? 'неуказанной'}% reward share, а Stellar Instant — с {instant?.profitSplitPct ?? 'неуказанной'}%. Поэтому сначала выбирают правило просадки и срок выплаты, а только потом размер счёта.</p>
          <p>Для трейдера, которому нужен фиксированный запас риска, отправной точкой служит Stellar 2-Step с {twoStep?.maxLossPct ?? '—'}% статического максимального убытка. Stellar Lite снижает минимальный вход до {money(lite?.accountSizes.find(tier => tier.sizeUsd === 5000)?.priceUsd)}, но уменьшает максимальный запас до {lite?.maxLossPct ?? '—'}%. Instant убирает оценочные фазы, однако заменяет их {instant?.maxLossPct ?? '—'}% трейлинг-границей и невозвратным взносом.</p>
          <p>Для русскоязычного трейдера за пределами России главный фильтр — не язык, а фактическая страна проживания, KYC и доступный checkout. Для резидента России официальные страницы противоречат друг другу, поэтому этот обзор не выдаёт партнёрскую ссылку за подтверждение доступа.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div id="access" className="ru-notice ru-anchor-target" data-fundednext-russia-access="conflicting">
            <strong><AlertTriangle size={16} aria-hidden="true" /> Для резидентов России данные противоречат друг другу.</strong>{' '}
            Статья FundedNext по ограничениям CFD от 8 апреля 2026 года не называет
            Россию, но корпоративная страница говорит, что FundedNext Ltd не обслуживает
            резидентов России. Futures-направление прямо запрещает покупку из России,
            а банковский перевод для выплат в Россию недоступен. Мы не считаем доступ
            подтверждённым, пока поддержка и страница оплаты не подтвердят конкретный продукт и профиль.
          </div>
          <div className="ru-actions" aria-label="Источники ограничений FundedNext">
            {accessEvidence?.sourceUrls.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="btn-outline">
                Официальный источник {index + 1}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-content">
            <h2 id="method">Что именно проверяет этот обзор</h2>
            <p>Это не рекламная витрина и не обещание выплаты. Мы сопоставляем правила на официальных страницах FundedNext с карточками продуктов, показываем дату захвата и отдельно отмечаем поля, которых нет в источнике. Поэтому цена в таблице — опубликованный листинг до промокода, платформенной платы и платных дополнений.</p>
            <p>Для русскоязычного трейдера важны не только проценты. Нужно проверить страну проживания, документ KYC, способ оплаты, платформу, валюту списания и условия Performance Reward. Русский язык интерфейса или наличие знакомого платёжного метода сами по себе не означают, что профиль будет принят.</p>
            <p>Дата продуктового захвата: <strong>{latestProductCapture ?? 'не указана'}</strong>. Если строка помечена как устаревшая, мы не подставляем старую цену в новый вывод — откройте официальный checkout и сохраните его условия перед оплатой.</p>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-content">
            <h2 id="facts">FundedNext в цифрах</h2>
            <p>Этот блок отделяет факты из захвата условий от редакционной оценки. Если checkout показывает другую цену или правило, приоритет имеет checkout: промокоды, платформа и дополнительные опции меняют итоговую сумму.</p>
            <div className="ru-table-wrap">
              <table className="ru-table" data-fundednext-russian-facts="true">
                <tbody>
                  <tr><th>Год основания</th><td>{firm?.founded ?? 'не указан'}</td></tr>
                  <tr><th>Продукты в захвате</th><td>{freshProducts.length} модели Stellar / {pricedTiers.length} ценовых уровня</td></tr>
                  <tr><th>Диапазон листинговой цены</th><td>{priceRange(pricedTiers.map(item => item.price))} до дополнений и скидок</td></tr>
                  <tr><th>Стартовая доля reward</th><td>{freshProducts.length ? `${Math.min(...freshProducts.map(product => product.profitSplitPct ?? 0))}%–${Math.max(...freshProducts.map(product => product.profitSplitPct ?? 0))}%` : 'не опубликована'}</td></tr>
                  <tr><th>Совокупный лимит</th><td>{firm?.maxAllocation ?? 'не указан'}</td></tr>
                  <tr><th>Платформы</th><td>{firm?.platforms.join(', ') ?? 'не опубликованы'}</td></tr>
                  <tr><th>Последняя проверка</th><td>{latestProductCapture ?? 'не указана'}</td></tr>
                </tbody>
              </table>
            </div>
            <p>Заявление о доле 95% не является стартовым условием: текущие карточки продуктов показывают базовые {freshProducts.filter(product => product.profitSplitPct === 80).length ? '80%' : 'значения'} для challenge-моделей и {instant?.profitSplitPct ?? '—'}% для Instant. Более высокая доля требует отдельных условий, поэтому мы не подставляем её в расчёт окупаемости.</p>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="products">Разбор четырёх моделей Stellar</h2>
          <p className="ru-muted">У FundedNext нет одной универсальной программы: одинаковый логотип скрывает четыре разных набора ограничений.</p>
          <div className="ru-prose-stack">
            {twoStep && twoStep100k ? (
              <section>
                <h3>Stellar 2-Step — классическая проверка</h3>
                <p>На уровне $100K листинговая цена составляет {money(twoStep100k.priceUsd)}. Цели — {twoStep.profitTargets?.phase1}% в первой фазе и {twoStep.profitTargets?.phase2}% во второй; дневной лимит — {twoStep.dailyLossPct}%, максимальный убыток — {twoStep.maxLossPct}% {twoStep.drawdownType ? (drawdownLabels[twoStep.drawdownType] ?? twoStep.drawdownType) : 'не указан'}.</p>
                <p>Минимум — {twoStep.minTradingDays} торговых дней в каждой фазе. Первая стандартная выплата указана через {twoStep.payoutFirstDays} дней, затем — {payoutLabels[twoStep.payoutFrequency ?? ''] ?? twoStep.payoutFrequency}. Регистрационный взнос возвращается с первым одобренным reward, если выполнены условия.</p>
              </section>
            ) : null}
            {oneStep && oneStep100k ? (
              <section>
                <h3>Stellar 1-Step — быстрее, но жёстче</h3>
                <p>На $100K цена — {money(oneStep100k.priceUsd)}. Одна фаза требует {oneStep.profitTargets?.phase1}% прибыли, но дневной лимит снижается до {oneStep.dailyLossPct}%, а максимальный убыток — до {oneStep.maxLossPct}% статической просадки.</p>
                <p>Минимум — {oneStep.minTradingDays} дня; первая выплата — через {oneStep.payoutFirstDays} дней. Для новых покупок возврат взноса привязан к третьему одобренному reward, поэтому низкое число фаз не означает низкую стоимость попытки.</p>
              </section>
            ) : null}
            {lite && lite100k ? (
              <section>
                <h3>Stellar Lite — самый низкий вход</h3>
                <p>На $100K листинговая цена — {money(lite100k.priceUsd)}. Модель требует {lite.profitTargets?.phase1}% и {lite.profitTargets?.phase2}% по фазам, допускает {lite.dailyLossPct}% дневного убытка и {lite.maxLossPct}% максимальной статической просадки.</p>
                <p>Входная цена ниже, чем у 2-Step, но максимальный запас убытка меньше, а возврат взноса для новых счетов наступает только с третьим одобренным reward.</p>
              </section>
            ) : null}
            {instant && instant10k ? (
              <section>
                <h3>Stellar Instant — без оценки</h3>
                <p>На $10K цена — {money(instant10k.priceUsd)}, возврата нет. Этапов оценки и числовой дневной нормы нет; вместо этого действует {instant.maxLossPct}% {instant.drawdownType ? (drawdownLabels[instant.drawdownType] ?? instant.drawdownType) : 'неуказанной'} просадки, которая движется вслед за максимумом и фиксируется на стартовом балансе.</p>
                <p>Стартовая доля reward — {instant.profitSplitPct}%. Запрос по требованию доступен после роста 5% и проверки EOD; при росте от 1% до 5% применяется 14-дневный цикл. Такая модель экономит время оценки, но не отменяет риск быстрого нарушения trailing-границы.</p>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="true-cost">Сколько нужно заработать до возврата комиссии</h2>
          <p>Fee-recovery — это математический порог, а не прогноз дохода. Он показывает, какой валовой Performance Reward нужен, чтобы доля трейдера покрыла первоначальный взнос; не учитывает повторные попытки, комиссии платёжного провайдера, налоги или проскальзывание.</p>
          <div className="ru-grid">
            <article className="ru-card">
              <h3>Stellar 2-Step $100K</h3>
              <p>Взнос {money(twoStep100k?.priceUsd)} при базовой доле {twoStep?.profitSplitPct ?? '—'}% даёт порог {money(twoStepCost?.breakEvenProfit)} валовой прибыли. Возврат комиссии может прийти только вместе с первым одобренным reward, поэтому дата допуска к выплате остаётся отдельным ограничением.</p>
            </article>
            <article className="ru-card">
              <h3>Stellar Instant $10K</h3>
              <p>Взнос {money(instant10k?.priceUsd)} при стартовой доле {instant?.profitSplitPct ?? '—'}% требует около {money(instantCost?.breakEvenProfit)} валовой прибыли. Комиссия невозвратная, а 6% trailing-лимит на $10K оставляет {money(instant10k ? instant10k.sizeUsd * ((instant?.maxLossPct ?? 0) / 100) : null)} стартового запаса убытка.</p>
            </article>
          </div>
          <p className="ru-muted">Не сравнивайте эти суммы напрямую с рекламным «95%»: для новых счетов это не универсальная стартовая доля. Сначала зафиксируйте выбранную модель, размер и платформу, затем пересчитайте итог в checkout.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-content">
            <h2>Полный расчёт true cost по каждому уровню</h2>
            <p>Это единая математика для всех опубликованных цен: минимальная стоимость делится на стартовый сплит, затем сравнивается с заявленным максимальным убытком. Значение «дни» — условная модель роста на 1% в торговый день, а не обещание пройти проверку или получить выплату.</p>
          </div>
          <div className="ru-table-wrap">
            <table className="ru-table" data-fundednext-russian-truecost="true">
              <thead><tr><th>Модель / счёт</th><th>Стоимость</th><th>Валовая прибыль для возврата</th><th>R-множитель к макс. убытку</th><th>Дни при 1%/день</th></tr></thead>
              <tbody>
                {pricedTiers.length > 0 ? pricedTiers.map(({ product, tier }) => {
                  const economics = challengeTierEconomics(product, tier)
                  return (
                    <tr key={`true-cost-${product.productSlug}-${tier.sizeUsd}`}>
                      <td>{product.productName} ${tier.sizeUsd.toLocaleString('en-US')}</td>
                      <td>{economics ? money(economics.minimumCost) : '—'}</td>
                      <td>{economics ? money(economics.breakEvenProfit) : '—'} ({product.profitSplitPct ?? '—'}%)</td>
                      <td>{economics?.rMultiple == null ? '—' : economics.rMultiple.toFixed(2)}</td>
                      <td>{economics?.dayCount == null ? '—' : economics.dayCount}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={5}>Нет свежих цен для расчёта.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="rules">Выплаты, новости и ограничения стратегии</h2>
          <p>Периодичность reward — это отдельное ограничение от цели и просадки. Для 2-Step и Lite первый стандартный запрос начинается через 21 день, затем применяется двухнедельный цикл; для 1-Step захват указывает 5 дней. Instant не имеет оценочной фазы, но требует роста 5% и проверки в конце дня для запроса по требованию; при росте от 1% до 5% действует 14-дневный цикл.</p>
          <div className="ru-prose-stack">
            <section>
              <h3>Новости на funded-счёте</h3>
              <p>В окне 5 минут до и после указанного события прибыль получает только 40% зачёта, а убыток учитывается полностью. То, что новость разрешена на этапе оценки, не означает полного зачёта на funded-этапе.</p>
            </section>
            <section>
              <h3>Ночные и выходные позиции</h3>
              <p>Условия захвата разрешают удержание позиций overnight и на выходных по всем четырём CFD-моделям. Своп и закрытие рынка всё равно нужно заложить в собственный риск-план: разрешение держать позицию не отменяет лимиты убытка.</p>
            </section>
            <section>
              <h3>EA и copy-trading</h3>
              <p>Автоматизация зависит от платформы и отдельного разрешения; cTrader и Match-Trader нельзя считать эквивалентом MT4/MT5. Copy-trading ограничен сценариями одного владельца, а копирование между funded-счетами запрещено в зафиксированных правилах.</p>
            </section>
            <section>
              <h3>Куда может прийти reward</h3>
              <p>В профиле FundedNext заявлены методы: {firm?.payoutMethods?.join(', ') ?? 'методы не опубликованы'}. Доступный метод и комиссия зависят от страны, валюты и проверки KYC; не считайте наличие метода на сайте гарантией для российского или зарубежного профиля.</p>
            </section>
          </div>
          <div className="ru-notice">
            <strong>Проверка перед выплатой.</strong> Для резидента России остаётся конфликт официальных страниц. Для русскоязычного трейдера в Казахстане, ОАЭ, Европе, Израиле или Северной Америке важны фактическая страна проживания, адрес и платёжный профиль — гражданство и язык общения их не заменяют.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="pros">Сильные стороны FundedNext</h2>
          <ul>
            <li>Четыре модели позволяют выбрать статическую или трейлинг-просадку и наличие оценочных этапов.</li>
            <li>2-Step сохраняет {twoStep?.maxLossPct ?? '—'}% статического максимального убытка и {twoStep?.dailyLossPct ?? '—'}% дневного лимита.</li>
            <li>Ночные и выходные позиции заявлены разрешёнными для всех 4 текущих CFD-моделей.</li>
            <li>Все {pricedTiers.length} цен показаны рядом со сплитом, просадкой и сроком первой выплаты, а не как отдельный рекламный прайс.</li>
          </ul>

          <h2 className="ru-review-secondary-heading">Ограничения и причины отказаться</h2>
          <ul>
            <li>Базовая доля начинается с {freshProducts.length ? `${Math.min(...freshProducts.map(product => product.profitSplitPct ?? 0))}%` : 'неуказанного значения'}, а «95%» требует отдельных условий.</li>
            <li>На funded-счёте 10-минутное новостное окно даёт только 40% зачёта прибыли, хотя убыток учитывается полностью.</li>
            <li>Instant использует {instant?.maxLossPct ?? '—'}% трейлинг-просадки и не возвращает первоначальный взнос.</li>
            <li>Доступ для России не подтверждён из-за противоречия официальных страниц; партнёрская ссылка не является обходом KYC.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="fit">Кому какая модель подходит</h2>
          <div className="ru-prose-stack">
            <section><h3>Нужен фиксированный пол просадки</h3><p>Смотрите Stellar 2-Step: статические {twoStep?.maxLossPct ?? '—'}% проще заложить в риск-план, чем trailing-линию. Цена — не единственный критерий: две фазы и 21-дневное ожидание первой стандартной выплаты требуют запаса времени.</p></section>
            <section><h3>Нужна одна фаза</h3><p>Stellar 1-Step сокращает этапы, но оставляет {oneStep?.dailyLossPct ?? '—'}% дневного лимита и {oneStep?.maxLossPct ?? '—'}% максимальной просадки. Сравните это с собственной серией убытков до покупки.</p></section>
            <section><h3>Нужен старт без оценки</h3><p>Instant подходит только если вы умеете управлять trailing-границей и принимаете невозвратную комиссию. Отсутствие цели и consistency-правила не означает отсутствия payout-gate или риска закрытия.</p></section>
          </div>
          <h2 className="ru-review-secondary-heading">Кому FundedNext не подходит</h2>
          <p>Новостному скальперу модель не подходит, если стратегия регулярно открывает или закрывает позиции в окне 5 минут до и после важного события: на funded-этапе засчитывается только 40% прибыли, а 100% убытка остаётся в расчёте.</p>
          <p>Алгоритмическому трейдеру на cTrader или Match-Trader нельзя переносить правила MT4/MT5 на выбранную платформу. Резиденту России также нельзя оплачивать challenge до письменного подтверждения конкретного профиля: официальный CFD-список и корпоративная страница FundedNext дают противоречивые сигналы.</p>
          <p>Перед регистрацией сохраните страницу выбранного продукта, проверьте юридическое лицо, итоговую валюту, KYC и доступный платёжный метод. Затем можно открыть <Link href="/go/fundednext?from=ru-fundednext-review-guide" rel="sponsored nofollow noopener">актуальные планы FundedNext</Link> через контролируемый переход; партнёрская ссылка не меняет цифры или вывод обзора.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2 id="prices">Сводная таблица моделей</h2>
          <p className="ru-muted">{hasFreshProducts ? 'Все числа ниже выводятся из свежего продуктового файла; цена — до промоакций и без отдельной платформенной платы, если она применяется.' : `Числовые условия временно не показываем: последний захват продуктов (${latestProductCapture ?? 'дата не указана'}) старше 30 дней. Проверьте текущие правила FundedNext перед оплатой.`}</p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-fundednext-russian-products={freshProducts.length}>
              <thead>
                <tr><th>Модель</th><th>Этапы</th><th>Цена</th><th>Дневной лимит</th><th>Макс. убыток</th><th>Просадка</th><th>Стартовый сплит</th><th>Первая выплата</th></tr>
              </thead>
              <tbody>
                {hasFreshProducts ? freshProducts.map(product => {
                  const prices = product.accountSizes.flatMap(tier => tier.priceUsd == null ? [] : [tier.priceUsd])
                  return (
                    <tr key={product.productSlug}>
                      <td><strong>{product.productName}</strong></td>
                      <td>{product.phases === 0 ? 'без оценки' : product.phases}</td>
                      <td>{priceRange(prices)}</td>
                      <td>{product.dailyLossPct == null ? 'не опубликован' : `${product.dailyLossPct}%`}</td>
                      <td>{product.maxLossPct == null ? 'не опубликован' : `${product.maxLossPct}%`}</td>
                      <td>{product.drawdownType
                        ? (drawdownLabels[product.drawdownType] ?? product.drawdownType)
                        : 'не опубликована'}</td>
                      <td>{product.profitSplitPct == null ? 'не опубликован' : `${product.profitSplitPct}%`}</td>
                      <td>{product.payoutFirstDays === 0 ? 'по запросу после условий' : `${product.payoutFirstDays} дн.; ${payoutLabels[product.payoutFrequency ?? ''] ?? product.payoutFrequency}`}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={8}>Свежий продуктовый захват временно отсутствует; цены и правила не подставляются.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>{hasFreshProducts ? `Все ${pricedTiers.length} ценовых уровня и их ограничения` : 'Цены временно не показываются'}</h2>
          <p className="ru-muted">Одна и та же цена имеет разный смысл при статической и трейлинг-просадке. Поэтому ниже рядом с каждым уровнем показаны этапы, цели, лимиты и стартовая доля, а не только размер счёта.</p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Модель</th><th>Счёт</th><th>Этапы / цели</th><th>Цена</th><th>Лимиты</th><th>Просадка</th><th>Сплит</th><th>Возврат</th><th>Захват</th></tr></thead>
              <tbody>
                {pricedTiers.length > 0 ? pricedTiers.map(({ product, tier, price }) => (
                  <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                    <td>{product.productName}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{product.phases === 0 ? 'без оценки' : `${product.phases}; ${targetLabel(product)}`}</td>
                    <td>${price.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 })}</td>
                    <td>{lossLabel(product)}</td>
                    <td>{product.drawdownType ? (drawdownLabels[product.drawdownType] ?? product.drawdownType) : 'не опубликована'}</td>
                    <td>{product.profitSplitPct == null ? 'не опубликован' : `${product.profitSplitPct}%`}</td>
                    <td>{tier.refundable ? 'условно возвратный' : 'невозвратный'}</td>
                    <td>{product.sourceCapturedAt}; {payoutLabel(product)}</td>
                  </tr>
                )) : <tr><td colSpan={9}>Нет свежих цен для безопасного отображения; откройте официальную страницу оплаты.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Уникальных свежих страниц продукта: {sourceUrls.length}. Полные доказательства и
            примечания доступны в <Link href="/blog/fundednext-review" hrefLang="en">английском обзоре FundedNext</Link>.
          </p>
          <p className="ru-source-line">
            Официальные страницы, использованные для цен и правил:{' '}
            {sourceUrls.map((url, index) => (
              <span key={url}>{index > 0 ? '; ' : ''}<a href={url} target="_blank" rel="noopener noreferrer">источник {index + 1}</a></span>
            ))}
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="final-check">Проверка перед регистрацией: сначала правило, потом цена</h2>
          <div className="ru-grid">
            {hasFreshProducts ? freshProducts.map(product => {
              const stage = product.phases === 0 ? 'без оценочного этапа' : `${product.phases} этапа оценки`
              const drawdown = product.drawdownType ? (drawdownLabels[product.drawdownType] ?? product.drawdownType) : 'тип просадки не опубликован'
              const payout = product.payoutFirstDays === 0
                ? 'выплата по запросу после выполнения условий'
                : product.payoutFirstDays != null
                  ? `первая выплата от ${product.payoutFirstDays} дней`
                  : 'срок первой выплаты не опубликован'
              return (
                <article className="ru-card" key={product.productSlug}>
                  <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                  <h3>{product.productName}</h3>
                  <p className="ru-muted">{stage}; {drawdown}; {payout}. Перед оплатой подтвердите страну, KYC и актуальный регламент.</p>
                </article>
              )
            }) : (
              <div className="ru-notice"><strong>Вердикт по модели отложен.</strong> Последний захват условий старше 30 дней, поэтому редакция не повторяет устаревшие проценты, цены или сроки. Откройте официальный checkout и сравните свежие правила.</div>
            )}
          </div>

          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="fundednext">
            <strong>Партнёрское раскрытие.</strong> Мы можем получить комиссию, если
            подходящий читатель зарегистрируется по ссылке ниже. Цена для читателя от
            этого не увеличивается, а редакционные числа и вердикт не меняются.
            Резидентам России нельзя использовать ссылку до разрешения противоречия
            между официальными страницами и подтверждения конкретного профиля.
          </div>
          {firm?.affiliateUrl ? (
            <div className="ru-actions">
              <Link
                href="/go/fundednext?from=ru-fundednext-review-verdict"
                rel="sponsored nofollow noopener"
                className="btn-primary btn-glow"
              >
                Проверить страну и условия на FundedNext <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/ru/luchshie-prop-firmy" className="btn-outline">
                Сравнить с другими фирмами
              </Link>
            </div>
          ) : (
            <p>Партнёрская ссылка сейчас не настроена; используйте рейтинг для сравнения.</p>
          )}
          <p className="ru-source-line"><BadgeDollarSign size={14} aria-hidden="true" /> Переход ведёт через контролируемый редирект Traders Fund Hub; отношения ссылки помечены как sponsored и nofollow.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="alternatives">С чем сравнить FundedNext</h2>
          <p>Сравнение должно отвечать на конкретное ограничение. Если не подходит 6% trailing у Instant, сравнивайте продукт с продуктом; если проблема в доступе по стране, сначала проверяйте KYC и checkout, а не редакционный балл.</p>
          <ul className="ru-review-related-links">
            <li><Link href="/ru/fundednext-vs-bright-funded">FundedNext или Bright Funded</Link> — основное сравнение 7 продуктов и 40 USD/EUR цен по просадке, true cost, выплатам и KYC.</li>
            <li><Link href="/ru/fundednext-vs-fundingpips">FundedNext или FundingPips</Link> — сравнение 4 моделей FundedNext с 5 продуктами FundingPips по ценам, просадке и payout-gates.</li>
            <li><Link href="/ru/obzor-fundingpips">Обзор FundingPips</Link> — отдельный разбор 17 цен и 5 наборов правил для другого глобального партнёра.</li>
            <li><Link href="/ru/obzor-bright-funded">Обзор Bright Funded</Link> — 3 программы и 18 цен в EUR, если важна европейская валюта checkout.</li>
            <li><Link href="/ru/luchshie-prop-firmy">Рейтинг проп-фирм</Link> — переход к полному списку, если ни одна из 4 моделей FundedNext не совпадает с риск-планом.</li>
          </ul>

          <div className="ru-review-author" aria-label="Автор обзора FundedNext">
            <div className="ru-review-author-avatar" aria-hidden="true">ED</div>
            <div>
              <strong>Автор: Edris Derakhshi</strong>
              <p>Основатель Traders Fund Hub, funded-трейдер с 2020 года и рыночный аналитик, публиковавшийся в CryptoQuant и CryptoPotato. Числа в этом обзоре отделены от партнёрской оценки и привязаны к датированным продуктовым источникам.</p>
              <Link href="/authors/edris-derakhshi">Профиль автора</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="faq">Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
      </article>
    </>
  )
}
