import type { Metadata } from 'next'
import RussianPartnerReview from '@/components/RussianPartnerReview'
import { challengeTierEconomics, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-fundingpips'
const TITLE = 'FundingPips: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Обзор FundingPips на русском: продукты и цены в USD, варианты сплита, просадка, выплаты и проверка страны перед регистрацией.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

function FundingPipsDeepDive() {
  const products = getChallengesByFirm('fundingpips').filter(product => isChallengeFresh(product))
  const oneStep = products.find(product => product.productSlug === '1-step-flex')
  const twoStepFlex = products.find(product => product.productSlug === '2-step-flex')
  const pro = products.find(product => product.productSlug === '2-step-pro')
  const standard = products.find(product => product.productSlug === '2-step-standard')
  const zero = products.find(product => product.productSlug === 'zero')
  const proFiveKPrice = pro?.accountSizes.find(tier => tier.sizeUsd === 5000)?.priceUsd
  const flexFiveKPrice = twoStepFlex?.accountSizes.find(tier => tier.sizeUsd === 5000)?.priceUsd
  const fiveKPriceGap = proFiveKPrice != null && flexFiveKPrice != null
    ? flexFiveKPrice - proFiveKPrice
    : null
  const fixedRouteRows = products.flatMap(product => {
    if (product.profitSplitPct == null) return []
    return product.accountSizes.flatMap(tier => {
      const economics = challengeTierEconomics(product, tier)
      return economics ? [{ product, tier, economics }] : []
    })
  })
  const money = (value: number | null | undefined) => value == null
    ? '—'
    : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

  return (
    <>
      <section className="ru-section">
        <div className="ru-shell" data-russian-fundingpips-deep-dive="reward-routes">
          <div className="ru-content">
            <h2>100% monthly или более быстрая выплата: это разные условия</h2>
            <p>FundingPips добавил месячные маршруты для подходящих Master Accounts, купленных с 15 августа 2026 года. Число 100% выглядит выше, но вместе с ним появляются 35% consistency, семь прибыльных дней минимум по 0,5% и Striking System с порогом 1%. Поэтому максимальный сплит нельзя сравнивать без календаря и дополнительных ограничений.</p>
          </div>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-fundingpips-reward-routes="five-products">
              <thead><tr><th>Продукт</th><th>Более быстрый маршрут</th><th>100% monthly</th><th>Что меняется</th></tr></thead>
              <tbody>
                <tr><td>1 Step Flex</td><td>85% раз в 14 дней</td><td>30 дней</td><td>35% consistency, 7 дней по 0,5%; Striking 1% уже действует</td></tr>
                <tr><td>2 Step Flex</td><td>85% или 95% раз в 14 дней</td><td>30 дней</td><td>95% требует 3 дней по 0,5%; monthly — 35%, 7 дней и Striking 1%</td></tr>
                <tr><td>2 Step Pro</td><td>80% каждые 7 дней</td><td>30 дней</td><td>Monthly добавляет 35%, 7 дней по 0,5% и Striking 1%</td></tr>
                <tr><td>2 Step Standard</td><td>60% weekly, 80% bi-weekly или 90% on demand</td><td>30 дней</td><td>On demand требует 35% и 2% прибыли; monthly — 35%, 7 дней и Striking 1%</td></tr>
                <tr><td>FundingPips Zero</td><td>95% раз в 14 дней</td><td>не опубликован</td><td>15% consistency, 7 дней по 0,25%, 3% safety cushion</td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-muted">Для новых счетов 2 Step Flex по маршруту 85% действует минимум {twoStepFlex?.minTradingDays ?? '—'} торговый день на фазу; 2 Step Pro требует {pro?.minTradingDays ?? '—'} дня на фазу. Старые счета до 26 августа могут сохранить прежний минимум, поэтому дата создания аккаунта влияет на правило.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-fundingpips-deep-dive="true-cost">
          <div className="ru-content">
            <h2>True cost для маршрутов с фиксированным сплитом</h2>
            <p>Ниже комиссия делится на сохранённый сплит более короткого маршрута: {oneStep?.profitSplitPct ?? '—'}% для 1 Step Flex, {pro?.profitSplitPct ?? '—'}% для 2 Step Pro и {zero?.profitSplitPct ?? '—'}% для Zero. Flex и Standard исключены из расчёта, потому что у них нет одного универсального процента.</p>
          </div>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-fundingpips-truecost={fixedRouteRows.length}>
              <thead><tr><th>Продукт / счёт</th><th>Комиссия</th><th>Валовая прибыль для возврата</th><th>R к макс. убытку</th><th>Модель 1%/день</th></tr></thead>
              <tbody>
                {fixedRouteRows.map(({ product, tier, economics }) => (
                  <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                    <td>{product.productName} ${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{money(economics.minimumCost)}</td>
                    <td>{money(economics.breakEvenProfit)} при {product.profitSplitPct}%</td>
                    <td>{economics.rMultiple == null ? '—' : economics.rMultiple.toFixed(2)}</td>
                    <td>{economics.dayCount == null ? '—' : `${economics.dayCount} дн.`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-muted">Расчёт описывает одну покупку и не прогнозирует прохождение или выплату. Monthly 100% уменьшает математический порог, но добавляет 30-дневный цикл, consistency, прибыльные дни и продуктовый Striking System.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-fundingpips-deep-dive="fit">
          <h2>Кому FundingPips подходит, а кому лучше сравнить другую фирму</h2>
          <div className="ru-grid">
            <article className="ru-card">
              <h3>Подходит для выбора по правилам</h3>
              <p>2 Step Pro начинается с {money(proFiveKPrice)} на $5K и даёт 6% статической просадки; Flex стоит {money(flexFiveKPrice)} и расширяет её до 12%. Разница в {money(fiveKPriceGap)} покупает другой запас риска, а не просто другой логотип продукта.</p>
            </article>
            <article className="ru-card">
              <h3>Не подходит для торговли на выходных</h3>
              <p>На Master Accounts удержание через выходные сейчас ограничено, а у Zero это жёсткое нарушение. Трейдеру, который системно держит позицию с пятницы на понедельник, нужно сравнить русскоязычный рейтинг до оплаты.</p>
            </article>
            <article className="ru-card">
              <h3>Не подходит резиденту ОАЭ</h3>
              <p>Официальный FundingPips Help Center прямо включает ОАЭ в ограничения по резидентству. Русскоязычному трейдеру в Дубае нельзя использовать этот маршрут только потому, что фирма зарегистрирована или представлена в ОАЭ.</p>
            </article>
          </div>
          <p className="ru-muted">Standard сохраняет {standard?.minTradingDays ?? '—'} дня на фазу, а Zero не имеет оценки, но сочетает {zero?.maxLossPct ?? '—'}% trailing, {zero?.consistencyRulePct ?? '—'}% consistency и семь прибыльных дней. Это пять разных контрактов, а не единый «челлендж FundingPips».</p>
        </div>
      </section>
    </>
  )
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
      lead={<>FundingPips публикует пять разных наборов правил и несколько циклов reward. После обновлений 15 и 26 августа 2026 года сравнивать нужно не только цену и рекламный процент, но также минимальные дни, consistency, Striking System и дату создания аккаунта.</>}
      countryNote={<>FundingPips прямо указывает, что не обслуживает резидентов ОАЭ и Вьетнама, а также юрисдикций из применимых санкционных списков. Русскоязычному трейдеру в Дубае этот маршрут не подходит; в любой другой стране сначала подтвердите резидентство, KYC, оплату и вывод.</>}
      verdict={[
        { title: '1 Step Flex', body: <>Цель 12%, дневной лимит 3% и статический максимум 12%. Маршрут 85% работает раз в 14 дней; 100% monthly добавляет 35% consistency и семь дней минимум по 0,5%.</> },
        { title: '2 Step Flex', body: <>Цели 10% и 6%, дневной лимит 4%, статический максимум 12%. Новый 85% счёт требует один день на фазу, 95% — три прибыльных дня, а 100% monthly добавляет отдельные payout-gates.</> },
        { title: '2 Step Pro', body: <>Цели 6% и 6%, дневной лимит 3% и статический максимум 6%. Новые счета требуют два дня на фазу; можно сравнить 80% weekly с более медленным 100% monthly.</> },
      ]}
      editorialNotes={[
        'Возврат комиссии для 1 Step Flex не подтверждён: страница вознаграждений и описание прежней модели 1 Step конфликтуют, поэтому поле возврата оставлено неопределённым.',
        'У 2 Step Standard нет одной доли или единой частоты: on demand 90%, weekly 60%, bi-weekly 80% и monthly 100% имеют разные сроки и условия.',
        'Цены и правила повторно захвачены 27 августа 2026 года после обновления официальных страниц 26 августа; две цены $2.5K по-прежнему оставлены null из-за конфликта источников.',
      ]}
      decisionGuide={{
        title: 'Как читать линейку FundingPips без ловушки одного сплита',
        intro: <>У FundingPips пять разных моделей, поэтому вопрос «какой процент?» недостаточен. Для решения сначала выберите риск-механику и способ запроса вознаграждения, а уже потом сравнивайте цену и доступность страны.</>,
        items: [
          { title: 'Flex и Pro — разные компромиссы', body: <>2 Step Flex за $32 на $5K даёт 12% статического запаса и минимум один день на фазу по маршруту 85%. 2 Step Pro за $29 сокращает запас до 6% и требует два дня на фазу, но предлагает weekly 80%.</> },
          { title: '100% меняет календарь', body: <>Monthly 100% требует 35% consistency, семь прибыльных дней минимум по 0,5% и Striking System 1%. Сравнивайте чистую доступность reward, а не только процент после одобрения.</> },
          { title: 'Zero — не режим без правил', body: <>FundingPips Zero не имеет оценочного этапа, но сочетает трейлинг-лимит 5%, максимальный открытый риск 1%, минимум 7 прибыльных дней и consistency до 15%. Такой маршрут нужно сравнивать с вашей статистикой, а не с ценой обычного челленджа.</> },
        ],
      }}
      firmAnalysis={<FundingPipsDeepDive />}
      faqs={[
        {
          q: 'Какой продукт FundingPips самый дешёвый?',
          a: 'Самая низкая подтверждённая цена — $29 для 2 Step Pro на $5K. Строки $2.5K у Pro и Standard остаются без цены, потому что официальные страницы противоречат друг другу; null не означает бесплатный счёт.',
        },
        {
          q: 'У FundingPips теперь всегда сплит 100%?',
          a: 'Нет. 100% — месячный маршрут для подходящих Master Accounts, купленных с 15 августа 2026 года. Он требует 35% consistency, семь прибыльных дней минимум по 0,5% и продуктовые условия Striking System. Более быстрые циклы используют другие сплиты.',
        },
        {
          q: 'Сколько минимальных дней у 2 Step Flex и Pro?',
          a: 'Новые или сброшенные 2 Step Flex счета по маршруту 85% требуют один торговый день на фазу; маршрут 95% требует три прибыльных дня по 0,5%. Новые или сброшенные 2 Step Pro счета требуют два торговых дня на фазу. Старые счета до 26 августа 2026 года могут сохранить прежнее правило.',
        },
        {
          q: 'Можно ли использовать FundingPips из ОАЭ?',
          a: 'Нет по текущей официальной странице: FundingPips включает ОАЭ в список ограниченных резидентств. Русскоязычный трейдер в Дубае должен выбрать другую фирму и не обходить ограничение через VPN или неверный адрес.',
        },
        {
          q: 'Можно ли зарегистрироваться из России?',
          a: 'Мы не делаем такой вывод из русского языка страницы или общего рейтинга. Проверьте страну, KYC, оплату и выплаты на официальной странице оплаты; не используйте VPN или неверные данные для обхода ограничений.',
        },
      ]}
    />
  )
}
