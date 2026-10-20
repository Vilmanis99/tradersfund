import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import ClosedFirmsList, { formatClosedFirmsDate } from '@/components/closed/ClosedFirmsList'
import {
  CLOSED_FIRMS_CAPTURED_AT,
  CLOSED_FIRMS_PUBLISHED,
  closedFirmsLanguageAlternates,
  getClosedFirmViews,
} from '@/lib/closedFirms'
import { RU_CLOSED_FIRMS_EDITORIAL_DATE, RU_CLOSED_FIRMS_PATH } from '@/lib/localizedRoutes'
import { jsonLd } from '@/lib/schema'

// Same data and the same publish flag as /prop-firms/closed: noindex, no hreflang and out of
// the sitemap while content/data/closed-firms.json has published: false. RU text: closed-firms.ru.json.
const PATH = RU_CLOSED_FIRMS_PATH
const TITLE = 'Закрытые проп-фирмы: даты, заявления и источники'
const DESCRIPTION = 'Закрытые проп-фирмы: какие компании закрылись или перестали работать, когда это случилось, что заявила сама фирма и архивная копия каждого источника.'
const AS_OF = formatClosedFirmsDate(CLOSED_FIRMS_CAPTURED_AT, 'ru', 'numeric')

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: closedFirmsLanguageAlternates() },
  robots: CLOSED_FIRMS_PUBLISHED ? undefined : { index: false, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
}

export default function RuClosedFirmsPage() {
  const closed = getClosedFirmViews('ru', 'closed')
  const offline = getClosedFirmViews('ru', 'offline')
  const modified = [RU_CLOSED_FIRMS_EDITORIAL_DATE, CLOSED_FIRMS_CAPTURED_AT].sort().at(-1) as string
  const [year, month, day] = modified.split('-')
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: modified,
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs locale="ru" items={[{ name: 'Главная', url: '/ru' }, { name: 'Закрытые проп-фирмы' }]} />
      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>Источники проверены {formatClosedFirmsDate(CLOSED_FIRMS_CAPTURED_AT, 'ru')}</div>
          <h1 className="blog-hero-title">Закрытые проп-фирмы</h1>
          <p className="blog-hero-sub">
            Проп-фирмы, которые закрылись или перестали работать: дата, что сказала сама фирма, и архивная копия источника.
          </p>
          <p className="ru-source-line" data-ru-closed-firms-updated={modified}>Обновлено <time dateTime={modified}>{`${day}.${month}.${year}`}</time>.</p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="tf-trust" data-trust-page="ru-closed-firms" data-closed-count={closed.length} data-offline-count={offline.length}>
          <p>
            Статусы ниже — по данным на {AS_OF}. Фирму мы считаем закрытой, когда об этом говорит она сама, регулятор или суд.
            Для каждой записи мы открываем официальный сайт фирмы и ищем архивную копию уведомления в Wayback Machine.
            Если единственный источник — отраслевое издание, запись начинается со слов «По данным» и ссылки на эту публикацию.
            Фирмы, у которых были проблемы, но которые продолжают работу или готовят перезапуск, в список не входят.
          </p>
          <p>
            Цитаты переведены нами, оригинал на английском приведён рядом. Если вы только знакомитесь с темой, сначала прочитайте,{' '}
            <Link href="/ru/prop-trejding">что такое проп-трейдинг</Link>.
          </p>
          <p data-ru-closed-firms-risk>
            Список не полный и не является юридической или финансовой оценкой. Если фирмы здесь нет, это не значит, что она надёжна
            или выплачивает деньги. Перед оплатой челленджа проверьте статус и условия на официальном сайте фирмы. Трейдинг связан
            с высоким риском убытка.
          </p>
          <ClosedFirmsList locale="ru" closed={closed} offline={offline} asOf={CLOSED_FIRMS_CAPTURED_AT} />
          <h2>Ищете фирмы, которые работают?</h2>
          <p>
            Условия действующих фирм и отметку доступа для РФ сравнивайте в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            Как отличить проверяемый отзыв от шума, разобрано на странице <Link href="/ru/otzyvy-prop-firm">проп компании: отзывы</Link>.
            Если фирма из списка вернулась или запись неточна, напишите нам через <Link href="/contact">страницу контактов</Link>,
            и мы внесём исправление в <Link href="/corrections">журнал исправлений</Link> (на английском).
          </p>
        </div>
      </section>
    </div>
  )
}
