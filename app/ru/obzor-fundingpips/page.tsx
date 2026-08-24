import type { Metadata } from 'next'
import RussianPartnerReview from '@/components/RussianPartnerReview'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-fundingpips'
const TITLE = 'FundingPips: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Обзор FundingPips на русском: 5 продуктов, цены в USD, варианты сплита, просадка, выплаты и проверка страны перед регистрацией.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function RussianFundingPipsReviewPage() {
  return (
    <RussianPartnerReview
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      firmName="FundingPips"
      firmSlug="fundingpips"
      affiliateSlug="fundingpips"
      affiliateFrom="ru-fundingpips-review-verdict"
      englishReviewHref="/blog/funding-pips-review"
      lead={<>FundingPips публикует несколько разных наборов правил: 1 Step Flex, 2 Step Flex, 2 Step Pro, 2 Step Standard и FundingPips Zero. Сравнивать нужно конкретный продукт, выбранный цикл вознаграждения и ограничения на риск, а не максимальный рекламный процент.</>}
      countryNote={<>Русскоязычная страница предназначена для трейдеров в разных странах. В агрегированных данных нет достаточного доказательства, что конкретный профиль, резидентство, KYC и платёжный маршрут будут приняты FundingPips; проверьте это на официальном checkout до оплаты.</>}
      verdict={[
        { title: '1 Step Flex', body: <>Цель 12%, дневной лимит 3%, статический максимальный убыток 12% и базовый сплит 85%. Отдельная политика концентрации прибыли может добавить четыре прибыльных дня перед reward.</> },
        { title: '2 Step Flex', body: <>Цели 10% и 6%, дневной лимит 4%, статический максимальный убыток 12%. Сплит не единый: в заметках источника указаны выбор 85% или 95% с разными условиями.</> },
        { title: 'FundingPips Zero', body: <>Оценочного этапа нет, но 5% максимального убытка трейлит пик, открытый риск ограничен 1%, а reward требует минимум семь прибыльных дней и дополнительные проверки.</> },
      ]}
      editorialNotes={[
        'Возврат комиссии для 1 Step Flex не подтверждён: страница rewards и описание legacy 1 Step конфликтуют, поэтому поле возврата оставлено неопределённым.',
        'У 2 Step Standard нет одного сплита или единой частоты: on-demand, weekly, bi-weekly и monthly меняют процент и условия.',
        'Цены и правила захвачены 10 августа 2026 года; перед оплатой перепроверьте официальные страницы продукта и checkout.',
      ]}
      faqs={[
        {
          q: 'Какой продукт FundingPips самый дешёвый?',
          a: 'В текущем захвате минимальная опубликованная цена зависит от продукта и размера счёта. Таблица выше показывает каждую подтверждённую цену без пересчёта валюты; промоакции не считаются постоянным правилом.',
        },
        {
          q: 'У FundingPips всегда сплит 95%?',
          a: 'Нет. У 1 Step Flex в данных указан базовый сплит 85%, у 2 Step Pro — 80%, а Zero — 95%. В 2 Step Flex и Standard процент зависит от выбранного цикла или варианта условий.',
        },
        {
          q: 'Можно ли зарегистрироваться из России?',
          a: 'Мы не делаем такой вывод из русского языка страницы или общего рейтинга. Проверьте страну, KYC, оплату и выплаты на официальном checkout; не используйте VPN или неверные данные для обхода ограничений.',
        },
      ]}
    />
  )
}
