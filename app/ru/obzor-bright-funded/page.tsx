import type { Metadata } from 'next'
import RussianPartnerReview from '@/components/RussianPartnerReview'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-bright-funded'
const TITLE = 'Bright Funded: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Обзор Bright Funded на русском: 3 продукта, цены в EUR, просадка, сплиты, выплаты, KYC и проверка страны перед регистрацией.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function RussianBrightFundedReviewPage() {
  return (
    <RussianPartnerReview
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      firmName="Bright Funded"
      firmSlug="bright-funded"
      affiliateSlug="bright-funded"
      affiliateFrom="ru-bright-funded-review-verdict"
      englishReviewHref="/blog/bright-funded-prop-firm"
      lead={<>Bright Funded предлагает три разных набора правил: 1-Step, 2-Step Bright и 2-Step Classic. Все текущие ценовые уровни в захвате выражены в EUR, а платное дополнение для большей доли и временные скидки нельзя смешивать с базовой ценой.</>}
      countryNote={<>Русскоязычная страница не означает доступность для резидента России или другой страны. Перед оплатой подтвердите конкретные ограничения, KYC, валюту страницы оплаты и способ будущей выплаты на официальном сайте Bright Funded.</>}
      verdict={[
        { title: 'Bright Funded 1-Step', body: <>Один этап, цель 10%, дневной лимит 3% и трейлинг-максимальный убыток 6%. Базовая доля на funded-этапе — 80%; более высокий процент оформляется отдельно.</> },
        { title: '2-Step Bright', body: <>Цели 8% и 5%, дневной лимит 4% и статический максимальный убыток 8%. Оба этапа требуют пять торговых дней по текущему захвату.</> },
        { title: '2-Step Classic', body: <>Цели 10% и 5%, дневной лимит 5% и статический максимальный убыток 10%. Цена в EUR и стандартное окно первой выплаты важнее рекламного потолка 90%.</> },
      ]}
      editorialNotes={[
        'Все текущие цены в таблице — EUR list prices; временные SUMMER30, SUMMER25 и SUMMER15 намеренно исключены.',
        'Обычная первая выплата указана через 30 дней после первой сделки на funded-этапе, затем цикл 14 дней; в справочных материалах есть конфликт о том, является ли режим раз в две недели платным дополнением.',
        'Стандартный возврат не равен рекламному дополнению с возвратом 100%: эти условия разделены в захвате и не объединяются.',
      ]}
      faqs={[
        {
          q: 'В какой валюте Bright Funded показывает цену?',
          a: 'Текущий захват Bright Funded хранит цены в EUR. Мы не конвертируем их в USD или рубли, потому что курс и комиссия платежного провайдера меняются.',
        },
        {
          q: 'У Bright Funded всегда сплит 90%?',
          a: 'Нет. В текущих данных базовая доля — 80%; 90% указано как верхняя граница после дополнения. Сравнивайте фактическую цену страницы оплаты и условия выбранного дополнения.',
        },
        {
          q: 'Можно ли зарегистрироваться из России?',
          a: 'Страница не подтверждает доступность. Проверьте актуальные ограничения по странам, KYC, оплату и выплаты на официальной странице оплаты; обход ограничений VPN или неверными данными недопустим.',
        },
      ]}
    />
  )
}
