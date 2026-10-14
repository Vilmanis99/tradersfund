import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import RuPendingLink from '@/components/RuPendingLink'
import { MessageSquareText } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel } from '@/lib/russiaAvailability'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import { getAllFirms } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'

const PATH = '/ru/prop-kompanii-otzyvy'
const CHECKED = '14.10.2026'
export const revalidate = 86400
const TITLE = 'Проп-компании: отзывы трейдеров 2026 — сводка по 19 фирмам'
const DESCRIPTION = 'Отзывы о проп-компаниях в одном месте: оценки Trustpilot с датой снимка, доступ из России и ссылки на подробные обзоры FundedNext, BrightFunded, FundingPips, FTMO и других.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['проп компании отзывы', 'проп трейдинг отзывы', 'проп компании для трейдеров отзывы', 'отзывы о проп фирмах'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const RU_REVIEWS: Record<string, string> = {
  'bright-funded': '/ru/obzor-bright-funded',
  fundednext: '/ru/obzor-fundednext',
  fundingpips: '/ru/obzor-fundingpips',
  ftmo: '/ru/obzor-ftmo',
}
const PRIORITY = ['bright-funded', 'fundednext', 'crypto-fund-trader']

const faqs: RussianFaqItem[] = [
  {
    q: 'Где читать отзывы о проп-компаниях?',
    a: 'Начните с Trustpilot — там у крупных фирм десятки тысяч оценок (у FundedNext 74 352 по данным на 27.07.2026). Затем сверяйте жалобы с правилами фирмы и нашими обзорами: отзыв без даты и названия продукта мало что доказывает.',
  },
  {
    q: 'Почему у некоторых фирм нет оценки?',
    a: 'Если Trustpilot скрыл или ограничил рейтинг фирмы, мы не показываем число, чтобы не вводить в заблуждение. Так сейчас у BrightFunded, Crypto Fund Trader, E8 Markets, Maven и OFP Funding.',
  },
  {
    q: 'Высокая оценка — гарантия выплаты?',
    a: 'Нет. Оценка отражает массовый опыт, а не ваш случай: выплату определяют правила продукта, KYC и страна. Например, у FTMO оценка 4,8, но для резидентов России фирма недоступна.',
  },
  {
    q: 'Проп-трейдинг — отзывы в основном негативные?',
    a: 'Нет единой картины: у The Funded Trader 2,9 при 21 965 отзывах, у My Funded Futures — 4,9 при 20 392 (данные на 27.07.2026). Разброс большой, поэтому смотрите конкретную фирму.',
  },
  {
    q: 'Как отличить фейковый отзыв?',
    a: 'Ищите конкретику: дату, продукт, размер счёта, названное правило и ответ фирмы. Отзывы без деталей — и восторженные, и гневные — малоинформативны.',
  },
]

export default function RussianPropFirmReviewsHubPage() {
  const firms = getAllFirms()
  const rows = firms
    .map(firm => ({ firm, slug: outboundSlug(firm.name) }))
    .sort((a, b) => {
      const pa = PRIORITY.indexOf(a.slug), pb = PRIORITY.indexOf(b.slug)
      if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
      return (b.firm.trustpilotCount ?? 0) - (a.firm.trustpilotCount ?? 0)
    })
  const crumbs = breadcrumbSchema([{ name: 'Русская версия', url: '/ru' }, { name: 'Отзывы о проп-компаниях' }])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    dateModified: russianRouteDateModified(PATH),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-reviews-hub="trustpilot">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Отзывы о проп-компаниях</div>
          <div className="ru-eyebrow"><MessageSquareText size={14} aria-hidden="true" /> Обновлено {CHECKED}</div>
          <h1>Проп-компании: отзывы трейдеров 2026</h1>
          <p className="ru-lead">
            У FTMO 4,8 на Trustpilot, у The Funded Trader — 2,9. Обе цифры собраны из десятков тысяч отзывов, и обе мало что скажут
            о вашей выплате, если вы не знаете правил. Здесь — сводка оценок с датой снимка, статус доступа для РФ и ссылки на
            подробные обзоры, где отзывы сверены с правилами.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Оценки Trustpilot — по датам снимков в таблице; доступ для РФ — проверено {CHECKED}.</p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="reviews-hub">
            <strong>Партнёрское раскрытие.</strong> По кнопкам мы можем получить комиссию; это не влияет на оценки и порядок отзывов.
          </div>
        </div>
      </section>

      <section className="ru-section" id="svodka">
        <div className="ru-shell ru-content">
          <h2>Отзывы о проп-компаниях: сводная таблица</h2>
          <p>Первыми идут фирмы, открытые для России; остальные — по числу отзывов.</p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-reviews-hub-table={rows.length}>
              <caption className="hidden-caption">Оценки Trustpilot и доступ для РФ по проп-компаниям</caption>
              <thead><tr><th>Проп-компания</th><th>Trustpilot</th><th>Отзывов</th><th>Снимок</th><th>Обзор</th><th>Доступ из России</th></tr></thead>
              <tbody>
                {rows.map(({ firm, slug }, index) => {
                  const suppressed = Boolean((firm as { trustpilotRatingSuppressed?: boolean }).trustpilotRatingSuppressed)
                  const review = RU_REVIEWS[slug] ?? firm.reviewUrl
                  return (
                    <tr key={slug} data-reviews-firm={slug}>
                      <td><strong>{slug === 'bright-funded' ? 'BrightFunded' : firm.name}</strong></td>
                      <td>{suppressed || firm.trustpilotScore == null ? 'оценка скрыта' : `${firm.trustpilotScore.toFixed(1)}/5`}</td>
                      <td>{firm.trustpilotCount != null ? firm.trustpilotCount.toLocaleString('ru-RU') : '—'}</td>
                      <td>{(firm as { trustpilotCapturedAt?: string }).trustpilotCapturedAt ?? '—'}</td>
                      <td><Link href={review}>{RU_REVIEWS[slug] ? 'Обзор на русском' : 'Обзор (англ.)'}</Link></td>
                      <td>
                        <RuGoLink firm={slug} href={`/go/${slug}?from=ru-prop-kompanii-otzyvy-table-${index + 1}`} rel={goLinkRel(slug)} className="btn-outline">
                          Сайт
                        </RuGoLink>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kak-chitat">
        <div className="ru-shell ru-content">
          <h2>Проп-трейдинг: отзывы и как их читать</h2>
          <ol>
            <li><strong>Дата.</strong> Правила меняются: FundingPips, например, обновлял условия выплат в августе 2026 года — отзыв от июля описывает другой продукт.</li>
            <li><strong>Продукт.</strong> У FundingPips пять программ с разными правилами; жалоба на Zero ничего не говорит о 2 Step Pro.</li>
            <li><strong>Названное правило.</strong> «Не выплатили» без указания, какое правило нарушено, — сигнал читать дальше, а не вывод.</li>
            <li><strong>Ответ фирмы.</strong> Публичный ответ с номером правила полезнее, чем шаблонное «напишите в поддержку».</li>
            <li><strong>Страна.</strong> Отзыв трейдера из другой страны не говорит о вашем доступе: проверьте <RuPendingLink href="/ru/prop-kompanii-v-rossii">статус для России</RuPendingLink>.</li>
          </ol>
          <h3>Где искать отзывы о проп-трейдинге</h3>
          <p>
            Trustpilot даёт самую большую выборку, но там много коротких оценок. Обсуждения на форумах и в сообществах трейдеров
            подробнее, зато авторов сложнее проверить. Каналы и чаты самих фирм полезны для поиска объявлений об изменении правил, но не
            как независимый источник: модерацию там ведёт фирма. Лучшее сочетание — оценка с крупной площадки, свежие подробные отзывы и
            официальные правила на дату покупки.
          </p>
          <p>
            Обращайте внимание и на размер выборки. Оценка 4,6 по 1 402 отзывам (TradeDay, по данным на 28.07.2026) и 4,5 по 74 352 отзывам
            (FundedNext) — цифры разного веса: у небольшой выборки каждая волна жалоб сильнее двигает средний балл.
          </p>
          <p>Методика проверки отзывов подробно — на странице <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах: методика</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="krasnye-flagi">
        <div className="ru-shell ru-content">
          <h2>Красные флаги: признаки проблемной проп-компании в отзывах</h2>
          <p>
            Один гневный отзыв ничего не доказывает — недовольны бывают и те, кто нарушил правило. Тревожный сигнал — повторяющийся
            сюжет у разных авторов в одно и то же время. На что смотреть:
          </p>
          <ul>
            <li><strong>Волна отказов в выплате после смены правил.</strong> Если много трейдеров одновременно пишут об отказе со ссылкой на новое или «скрытое» правило, сравните дату отзывов с датой изменения условий.</li>
            <li><strong>Размытая причина отказа.</strong> «Нарушение торговой политики» без номера пункта и без примера сделки — повод задать фирме письменный вопрос до покупки.</li>
            <li><strong>Задержки без объяснений.</strong> Сравните обещанный график выплат с тем, что пишут трейдеры. Если фирма заявляет одно, а в отзывах систематически другое — это важнее средней оценки.</li>
            <li><strong>Скрытый или ограниченный рейтинг.</strong> Если площадка отзывов скрыла оценку фирмы, выясните причину на самой площадке. Само по себе это не доказывает мошенничество, но и опираться на чужие оценки в таком случае нельзя.</li>
            <li><strong>Однотипные пятёрки.</strong> Короткие восторженные отзывы без деталей, появившиеся пачкой, часто связаны с акциями «оставь отзыв — получи скидку». Они ничего не говорят о выплатах.</li>
            <li><strong>Давление и обход правил.</strong> Предложения «пройти за вас», платить на личную карту или регистрироваться через VPN — признак мошенников, а не фирмы. Официальный сайт открывайте только по ссылке из нашего обзора или по адресу, который знаете сами.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="dokazatelstva-vyplat">
        <div className="ru-shell ru-content">
          <h2>Где проверять доказательства выплат</h2>
          <p>Скриншот «сертификата выплаты» легко подделать. Надёжность источников по убыванию:</p>
          <ol>
            <li><strong>Транзакция в блокчейне.</strong> Если выплата пришла в USDT или USDC, у неё есть хеш транзакции. Его можно открыть в обозревателе сети (для ERC-20 — Etherscan, для TRC-20 — Tronscan) и увидеть сумму, дату и адрес отправителя.</li>
            <li><strong>Официальная справка фирмы.</strong> Способы и график выплат должны быть описаны в правилах или справочном центре. Мы ссылаемся на эти страницы в каждом обзоре и указываем дату проверки.</li>
            <li><strong>Отзыв с деталями.</strong> Продукт, размер счёта, сумма, срок от запроса до получения и способ выплаты — такой отзыв можно сопоставить с правилами.</li>
            <li><strong>Сертификаты и посты в соцсетях.</strong> Это маркетинг фирмы: они подтверждают, что выплаты бывают, но не говорят, как часто бывают отказы.</li>
          </ol>
          <p>
            Мы пока не ставим фирмам отметку о выплатах, проверенных нашей редакцией. Ни у одной фирмы в наших данных такой отметки нет,
            поэтому выводы ниже опираются на правила и датированные оценки, а не на личный опыт выплат.
          </p>
        </div>
      </section>

      <section className="ru-section" id="verdikty">
        <div className="ru-shell ru-content">
          <h2>Короткий вердикт по фирмам с обзором на русском</h2>
          <ul>
            <li><strong><Link href="/ru/obzor-bright-funded">BrightFunded</Link></strong> — основана в 2023 году, открыта для РФ, выплаты в USDC (ERC-20) или EUR. Рейтинг на Trustpilot скрыт (по данным на 01.10.2026), поэтому решение стоит принимать по правилам из обзора, а не по отзывам.</li>
            <li><strong><Link href="/ru/obzor-fundednext">FundedNext</Link></strong> — основана в 2022 году, 4,5 при 74 352 отзывах (по данным на 27.07.2026) — самая большая выборка в нашей таблице. CFD-направление открыто для РФ, Futures — нет.</li>
            <li><strong><Link href="/ru/obzor-fundingpips">FundingPips</Link></strong> — основана в 2022 году, 4,5 при 63 734 отзывах (по данным на 27.07.2026). Россия не названа прямо, но условия исключают санкционные юрисдикции — доступ для РФ не ясен.</li>
            <li><strong><Link href="/ru/obzor-ftmo">FTMO</Link></strong> — основана в 2015 году, 4,8 при 47 019 отзывах (по данным на 27.07.2026). Сильная репутация, но для резидентов России недоступна.</li>
            <li><strong>Российские проп-компании</strong> — <Link href="/ru/obzor-eratrade">Era Trade</Link>, <Link href="/ru/obzor-proplive">PropLive</Link>, <Link href="/ru/obzor-kascapital">KasCapital</Link>, <Link href="/ru/obzor-teamtraders">TeamTraders</Link>. Модель другая (отбор и договор, а не CFD-челлендж), поэтому оценки Trustpilot к ним неприменимы; читайте обзоры.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="dlya-treyderov">
        <div className="ru-shell ru-content">
          <h2>Проп-компании для трейдеров из России: отзывы и обзоры</h2>
          <p>
            Для трейдеров из РФ важнее всего отзывы о фирмах, открытых для России. Подробные обзоры с разбором отзывов:{' '}
            <Link href="/ru/obzor-bright-funded">BrightFunded</Link>, <Link href="/ru/obzor-fundednext">FundedNext</Link> (4,5 при 74 352 отзывах
            по данным на 27.07.2026) и <Link href="/ru/obzor-fundingpips">FundingPips</Link> (4,5 при 63 734; доступ для РФ не ясен).
            У Crypto Fund Trader на Trustpilot 1 140 отзывов, но рейтинг скрыт — смотрите правила в <Link href="/blog/crypto-fund-trader-review">обзоре</Link>.
            Сравнить фирмы по правилам — в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
          </p>
          <div className="ru-notice" data-russian-risk-disclaimer="reviews-hub">
            <strong>Риск.</strong> Отзывы не заменяют чтение правил. Торговля с плечом связана с высоким риском; взнос за челлендж не возвращается.
          </div>
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
