import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, Database } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { challengeTierEconomics, getAllFirms, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
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
          <h1>FundedNext: обзор 2026 — модели, цены и правила</h1>
          <p className="ru-lead">
            Модели Stellar различаются числом этапов, просадкой, сплитом и сроком первой выплаты.
            Выбирать нужно по ограничивающему правилу, а не по максимальному рекламному проценту.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>текущих моделей</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>опубликованных цен</span></div>
            <div className="ru-stat"><strong>{priceRange(pricedTiers.map(item => item.price))}</strong><span>диапазон входа</span></div>
            <div className="ru-stat"><strong>{firm?.score.toFixed(1) ?? '—'}/10</strong><span>редакционный балл</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-fundednext-russia-access="conflicting">
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
            <h2>Что именно проверяет этот обзор</h2>
            <p>Это не рекламная витрина и не обещание выплаты. Мы сопоставляем правила на официальных страницах FundedNext с карточками продуктов, показываем дату захвата и отдельно отмечаем поля, которых нет в источнике. Поэтому цена в таблице — опубликованный листинг до промокода, платформенной платы и платных дополнений.</p>
            <p>Для русскоязычного трейдера важны не только проценты. Нужно проверить страну проживания, документ KYC, способ оплаты, платформу, валюту списания и условия Performance Reward. Русский язык интерфейса или наличие знакомого платёжного метода сами по себе не означают, что профиль будет принят.</p>
            <p>Дата продуктового захвата: <strong>{latestProductCapture ?? 'не указана'}</strong>. Если строка помечена как устаревшая, мы не подставляем старую цену в новый вывод — откройте официальный checkout и сохраните его условия перед оплатой.</p>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Разбор четырёх моделей Stellar</h2>
          <p className="ru-muted">У FundedNext нет одной универсальной программы: одинаковый логотип скрывает четыре разных набора ограничений.</p>
          <div className="ru-grid">
            {twoStep && twoStep100k ? (
              <article className="ru-card">
                <h3>Stellar 2-Step — классическая проверка</h3>
                <p>На уровне $100K листинговая цена составляет {money(twoStep100k.priceUsd)}. Цели — {twoStep.profitTargets?.phase1}% в первой фазе и {twoStep.profitTargets?.phase2}% во второй; дневной лимит — {twoStep.dailyLossPct}%, максимальный убыток — {twoStep.maxLossPct}% {twoStep.drawdownType ? (drawdownLabels[twoStep.drawdownType] ?? twoStep.drawdownType) : 'не указан'}.</p>
                <p>Минимум — {twoStep.minTradingDays} торговых дней в каждой фазе. Первая стандартная выплата указана через {twoStep.payoutFirstDays} дней, затем — {payoutLabels[twoStep.payoutFrequency ?? ''] ?? twoStep.payoutFrequency}. Регистрационный взнос возвращается с первым одобренным reward, если выполнены условия.</p>
              </article>
            ) : null}
            {oneStep && oneStep100k ? (
              <article className="ru-card">
                <h3>Stellar 1-Step — быстрее, но жёстче</h3>
                <p>На $100K цена — {money(oneStep100k.priceUsd)}. Одна фаза требует {oneStep.profitTargets?.phase1}% прибыли, но дневной лимит снижается до {oneStep.dailyLossPct}%, а максимальный убыток — до {oneStep.maxLossPct}% статической просадки.</p>
                <p>Минимум — {oneStep.minTradingDays} дня; первая выплата — через {oneStep.payoutFirstDays} дней. Для новых покупок возврат взноса привязан к третьему одобренному reward, поэтому низкое число фаз не означает низкую стоимость попытки.</p>
              </article>
            ) : null}
            {lite && lite100k ? (
              <article className="ru-card">
                <h3>Stellar Lite — самый низкий вход</h3>
                <p>На $100K листинговая цена — {money(lite100k.priceUsd)}. Модель требует {lite.profitTargets?.phase1}% и {lite.profitTargets?.phase2}% по фазам, допускает {lite.dailyLossPct}% дневного убытка и {lite.maxLossPct}% максимальной статической просадки.</p>
                <p>Входная цена ниже, чем у 2-Step, но максимальный запас убытка меньше, а возврат взноса для новых счетов наступает только с третьим одобренным reward.</p>
              </article>
            ) : null}
            {instant && instant10k ? (
              <article className="ru-card">
                <h3>Stellar Instant — без оценки</h3>
                <p>На $10K цена — {money(instant10k.priceUsd)}, возврата нет. Этапов оценки и числовой дневной нормы нет; вместо этого действует {instant.maxLossPct}% {instant.drawdownType ? (drawdownLabels[instant.drawdownType] ?? instant.drawdownType) : 'неуказанной'} просадки, которая движется вслед за максимумом и фиксируется на стартовом балансе.</p>
                <p>Стартовая доля reward — {instant.profitSplitPct}%. Запрос по требованию доступен после роста 5% и проверки EOD; при росте от 1% до 5% применяется 14-дневный цикл. Такая модель экономит время оценки, но не отменяет риск быстрого нарушения trailing-границы.</p>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Сколько нужно заработать до возврата комиссии</h2>
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
        <div className="ru-shell ru-content">
          <h2>Выплаты, новости и ограничения стратегии</h2>
          <ul>
            <li><strong>Выплата:</strong> у 2-Step и Lite первая стандартная заявка начинается через 21 день, у 1-Step — через 5 дней. Instant не имеет фиксированной даты, но требует отдельного условия роста и EOD-проверки.</li>
            <li><strong>Новости:</strong> на funded-счёте сделки в окне 5 минут до и после указанного события получают только 40% зачёта прибыли; убыток засчитывается полностью. Разрешение торговать новость на этапе оценки не равно полной выплате на funded-этапе.</li>
            <li><strong>Автоматизация:</strong> EA зависит от платформы и платного разрешения; на cTrader и Match-Trader автоматизация ограничена. Copy-trading разрешён только в узких сценариях для счетов одного владельца, а копирование между funded-счетами запрещено.</li>
            <li><strong>Резидентство:</strong> для России официальные страницы противоречат друг другу. Для русскоязычных трейдеров за пределами России проверяйте фактическую страну, адрес и платёжный профиль — гражданство и язык общения не заменяют KYC.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Кому какая модель подходит</h2>
          <div className="ru-grid">
            <article className="ru-card"><h3>Нужен фиксированный пол просадки</h3><p>Смотрите Stellar 2-Step: статические {twoStep?.maxLossPct ?? '—'}% проще заложить в риск-план, чем trailing-линию. Цена — не единственный критерий: две фазы и 21-дневное ожидание первой стандартной выплаты требуют запаса времени.</p></article>
            <article className="ru-card"><h3>Нужна одна фаза</h3><p>Stellar 1-Step сокращает этапы, но оставляет {oneStep?.dailyLossPct ?? '—'}% дневного лимита и {oneStep?.maxLossPct ?? '—'}% максимальной просадки. Сравните это с собственной серией убытков до покупки.</p></article>
            <article className="ru-card"><h3>Нужен старт без оценки</h3><p>Instant подходит только если вы умеете управлять trailing-границей и принимаете невозвратную комиссию. Отсутствие цели и consistency-правила не означает отсутствия payout-gate или риска закрытия.</p></article>
          </div>
          <p>Перед регистрацией сохраните страницу выбранного продукта, проверьте юридическое лицо, итоговую валюту, KYC и доступный платёжный метод. Затем можно открыть <Link href="/go/fundednext?from=ru-fundednext-review-guide" rel="sponsored nofollow noopener">актуальные планы FundedNext</Link> через контролируемый переход; партнёрская ссылка не меняет цифры или вывод обзора.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>Сводная таблица моделей</h2>
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
          <h2>{hasFreshProducts ? 'Цены по свежему захвату без пересчёта валюты' : 'Цены временно не показываются'}</h2>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Модель</th><th>Размер счёта</th><th>Цена</th><th>Возврат взноса</th><th>Источник</th></tr></thead>
              <tbody>
                {pricedTiers.length > 0 ? pricedTiers.map(({ product, tier, price }) => (
                  <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                    <td>{product.productName}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>${price.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 })}</td>
                    <td>{tier.refundable ? 'условно возвратный' : 'невозвратный'}</td>
                    <td>{product.sourceCapturedAt}</td>
                  </tr>
                )) : <tr><td colSpan={5}>Нет свежих цен для безопасного отображения; откройте официальную страницу оплаты.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Уникальных свежих страниц продукта: {sourceUrls.length}. Полные доказательства и
            примечания доступны в <Link href="/blog/fundednext-review" hrefLang="en">английском обзоре FundedNext</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Вердикт: сначала правило, потом цена</h2>
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
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
