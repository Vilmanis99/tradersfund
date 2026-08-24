import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Globe2, ListChecks, ShieldCheck, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/dlya-russkoyazychnykh-treyderov'
const TITLE = 'Проп-фирмы для русскоязычных трейдеров за рубежом'
const DESCRIPTION = 'Как русскоязычным трейдерам в разных странах проверить KYC, оплату и правила глобальных проп-фирм перед регистрацией; честный маршрут к партнёрским обзорам.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Можно ли русскоязычному трейдеру зарегистрироваться из другой страны?',
    a: 'Иногда да, но язык сайта ничего не гарантирует. Фирма может проверять отдельно гражданство, страну проживания, адрес, документ KYC, платёжный маршрут и санкционные ограничения. Используйте только правдивые данные и подтвердите маршрут у фирмы до оплаты.',
  },
  {
    q: 'Что проверять, если я переехал или имею два гражданства?',
    a: 'Сначала определите, какие сведения фирма просит в KYC: гражданство, резидентство, адрес и документ. Не выбирайте страну только потому, что карта или IP относятся к ней, и не отправляйте документы с противоречивыми данными.',
  },
  {
    q: 'Почему русская страница ведёт к глобальным, а не только российским фирмам?',
    a: 'Русскоязычные трейдеры живут во многих юрисдикциях. Глобальные продукты дают более широкий набор моделей для сравнения, но доступность всё равно устанавливается по конкретному человеку, стране и продукту. Российские операторы вынесены в отдельное исследование, а не смешаны с партнёрским рейтингом.',
  },
  {
    q: 'Можно ли использовать VPN, если фирма не принимает мою страну?',
    a: 'Нет. VPN, прокси или неверное указание страны не превращают запрещённый маршрут в разрешённый и могут создать проблему с KYC или выплатой. Если правила неясны, запросите письменное подтверждение у поддержки или выберите другой продукт.',
  },
  {
    q: 'Есть ли отдельные проп-фирмы для русскоязычных в Казахстане или ОАЭ?',
    a: 'Поисковый запрос не заменяет проверку доступа. Для Казахстана, ОАЭ и любой другой страны сначала сопоставьте гражданство, фактическое резидентство, адрес, документ KYC, способ оплаты и выплату; международный бренд или русскоязычная реклама сами по себе ничего не гарантируют.',
  },
]

const partnerRoutes = [
  {
    slug: 'fundednext',
    name: 'FundedNext',
    reviewHref: '/ru/obzor-fundednext',
    campaign: 'ru-diaspora-fundednext',
    summary: 'Русский разбор с отдельной проверкой противоречивых ограничений по стране.',
  },
  {
    slug: 'fundingpips',
    name: 'FundingPips',
    reviewHref: '/ru/obzor-fundingpips',
    campaign: 'ru-diaspora-fundingpips',
    summary: 'Русский разбор продуктовых цен, просадки, сплита и условий выплаты.',
  },
  {
    slug: 'bright-funded',
    name: 'Bright Funded',
    reviewHref: '/ru/obzor-bright-funded',
    campaign: 'ru-diaspora-bright-funded',
    summary: 'Русский разбор с валютой фирмы, KYC и предупреждениями о доступности.',
  },
] as const

export default function RussianDiasporaGuidePage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const partnerCards = partnerRoutes.map(route => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === route.slug)
    const freshProducts = challenges.filter(challenge =>
      challenge.firmSlug === route.slug && isChallengeFresh(challenge),
    )
    return { ...route, firm, freshProducts }
  }).filter(item => item.firm?.affiliateUrl)

  const freshPartnerProducts = partnerCards.reduce((sum, item) => sum + item.freshProducts.length, 0)
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Для русскоязычных трейдеров' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Organization', name: 'Traders Fund Hub' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-diaspora-guide="global-access">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Для русскоязычных трейдеров</div>
          <div className="ru-eyebrow"><Globe2 size={14} aria-hidden="true" /> Русский язык — не страна</div>
          <h1>Проп-фирмы для русскоязычных трейдеров: проверка доступа в разных странах</h1>
          <p className="ru-lead">
            Эта страница предназначена для русскоязычных трейдеров по всему миру — независимо от того,
            где они живут. Сначала определите свой KYC-маршрут, затем сравните конкретный продукт и только
            после этого переходите к глобальной фирме.
          </p>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy" className="btn-primary btn-glow">Открыть глобальный рейтинг <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#proverka" className="btn-outline">Пройти проверку перед оплатой</Link>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{partnerCards.length}</strong><span>глобальных партнёрских маршрута</span></div>
            <div className="ru-stat"><strong>{freshPartnerProducts}</strong><span>свежих продуктов в этих маршрутах</span></div>
            <div className="ru-stat"><strong>5</strong><span>проверок до регистрации</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="diaspora-not-access">
            <strong>Страница не подтверждает доступность страны.</strong>{' '}
            Русскоязычный интерфейс подходит людям в разных странах, но гражданство, резидентство,
            IP, адрес, KYC, карта и способ выплаты проверяются отдельно. Резидентам России нельзя обходить
            ограничения VPN, прокси или неверными данными.
          </div>
          <h2>Три ситуации, которые нельзя смешивать</h2>
          <div className="ru-grid">
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Живёте за пределами России</h3>
              <p className="ru-muted">Проверьте, какие поля фирма считает определяющими: гражданство, резидентство, адрес или документ. Не делайте вывод только по языку страницы и месту нахождения карты.</p>
            </article>
            <article className="ru-card">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Переехали или имеете два гражданства</h3>
              <p className="ru-muted">Подготовьте непротиворечивый KYC-маршрут и заранее спросите поддержку, какие документы и страна указываются в договоре. Сохраняйте ответ до оплаты.</p>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Русскоязычный трейдер в любой другой стране</h3>
              <p className="ru-muted">Сначала выберите рынок и продукт, затем проверьте платёж, платформу, ограничения и выплату именно для вашей юрисдикции. Язык — удобство, а не разрешение.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kazakhstan-oae">
        <div className="ru-shell ru-content" data-russian-diaspora-regions="kazakhstan-uae">
          <h2>Казахстан и ОАЭ: география поиска не равна доступу</h2>
          <p>
            Запросы «проп-фирмы для трейдеров в Казахстане» и «проп-фирмы в ОАЭ» часто смешивают
            местную регистрацию, русскоязычный маркетинг и фактическую возможность купить глобальный продукт.
            Для нашей русской аудитории это разные вопросы: где вы живёте, какое гражданство указываете,
            какой документ принимает KYC и каким способом фирма выплачивает именно вам.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Казахстан</h3>
              <p className="ru-muted">Проверьте адрес и резидентство в договоре, валюту и провайдера оплаты, а также доступность выбранного продукта. Казахстанская карта не доказывает, что фирма принимает любое гражданство.</p>
            </article>
            <article className="ru-card">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>ОАЭ и страны GCC</h3>
              <p className="ru-muted">Юрисдикция фирмы, страна проживания трейдера и место выплаты могут быть разными. Сохраните письменное подтверждение KYC и метода выплаты до регистрации.</p>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Русскоязычный маршрут</h3>
              <p className="ru-muted">После пяти проверок откройте глобальный обзор ниже; если страна или продукт не подтверждены, не используйте VPN и не подменяйте данные.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="proverka">
        <div className="ru-shell ru-content">
          <h2>Пять проверок перед регистрацией</h2>
          <ol>
            <li><strong>Идентичность:</strong> какие гражданство, резидентство, адрес и документы запросит KYC.</li>
            <li><strong>Доступ:</strong> есть ли ваша страна или гражданство в ограничениях конкретной фирмы и продукта.</li>
            <li><strong>Оплата:</strong> проходит ли выбранный способ оплаты без обхода правил и с понятной комиссией.</li>
            <li><strong>Правила:</strong> цена, тип просадки, цели, торговые ограничения и первая выплата у нужного размера счёта.</li>
            <li><strong>Вывод:</strong> доступен ли вам метод выплаты и какие документы потребуются после успешного этапа.</li>
          </ol>
          <p>
            Если один пункт не подтверждён, не превращайте предположение в рекомендацию. Откройте страницу
            конкретного продукта, задайте вопрос поддержке и сравните альтернативы в{' '}
            <Link href="/ru/luchshie-prop-firmy">русском рейтинге глобальных фирм</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="diaspora-guide">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Часть глобальных фирм ниже имеет партнёрскую ссылку. Мы можем получить комиссию,
            если читатель зарегистрируется после перехода; это не меняет порядок рейтинга, цены или
            проверку доступа. Перед оплатой подтвердите условия у самой фирмы.
          </div>
          <h2>Глобальные обзоры на русском</h2>
          <p className="ru-muted">Сначала откройте разбор, затем переходите на официальную страницу оплаты только после проверки своей юрисдикции.</p>
          <div className="ru-grid">
            {partnerCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-diaspora-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">{item.firm?.score.toFixed(1) ?? '—'}/10</span></div>
                <p className="ru-muted">{item.summary}</p>
                <p className="ru-source-line">{item.freshProducts.length} свежих продуктов в текущем захвате данных.</p>
                <div className="ru-actions">
                  <Link href={item.reviewHref} className="btn-outline">Читать разбор</Link>
                  <Link href={`/go/${item.slug}?from=${item.campaign}`} rel="sponsored nofollow noopener" className="btn-primary">
                    Проверить условия <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="ru-source-line">
            Нужны локальные примеры? Смотрите отдельное <Link href="/ru/rossiyskie-prop-kompanii">исследование «Российские проп-компании»</Link>:
            оно не является рейтингом и не содержит неактивированных партнёрских переходов. Локальные разборы: <Link href="/ru/obzor-proplive">PropLive</Link>, <Link href="/ru/obzor-eratrade">Era Trade</Link> и <Link href="/ru/obzor-kascapital">KasCapital</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Короткий чек-лист перед кликом</h2>
          <div className="ru-grid">
            <article className="ru-card"><ListChecks size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Сохраните источник</h3><p className="ru-muted">Откройте страницу правил и зафиксируйте дату, продукт, размер счёта и способ выплаты.</p></article>
            <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Не скрывайте страну</h3><p className="ru-muted">Несовпадение IP, адреса, документа и платёжного профиля может повлиять на KYC и выплату.</p></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Считайте полную стоимость</h3><p className="ru-muted">Сравнивайте не только входную цену, но и активацию, повторную оплату, возврат и условия первой выплаты.</p></article>
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
