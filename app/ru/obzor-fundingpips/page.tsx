import type { Metadata } from 'next'
import RussianPartnerReview from '@/components/RussianPartnerReview'
import { challengeTierEconomics, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-fundingpips'
const TITLE = 'FundingPips: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Обзор FundingPips на русском: продукты и цены в USD, варианты сплита, просадка, выплаты и проверка страны перед регистрацией.'
const REWARD_METHODS_URL = 'https://help.fundingpips.com/hc/en-us/articles/34504564970385-Reward-Methods'
const GET_STARTED_URL = 'https://help.fundingpips.com/hc/en-us/articles/44390730743825-Get-Started'
const RESPONSIBLE_TRADING_URL = 'https://help.fundingpips.com/hc/en-us/articles/47328410434065-Responsible-Trading-Policy'
const WORKSPACE_URL = 'https://help.fundingpips.com/hc/en-us/articles/43468639481105-Account-Workspace'
const MASTER_SETUP_URL = 'https://help.fundingpips.com/hc/en-us/articles/48636294148497-Master-Account-Setup'

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
  const pricedTierCount = products.reduce((count, product) => count + product.accountSizes.filter(tier =>
    tier.priceUsd != null && tier.priceUsd > 0,
  ).length, 0)
  const money = (value: number | null | undefined) => value == null
    ? '—'
    : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

  return (
    <>
      <section className="ru-section" id="reward-routes">
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

      <section className="ru-section" id="payout-methods">
        <div className="ru-shell" data-russian-fundingpips-deep-dive="payout-methods">
          <div className="ru-content">
            <h2>Как FundingPips выплачивает reward русскоязычному трейдеру</h2>
            <p>Официальная страница Reward Methods перечисляет 4 способа выплаты: Card, Crypto, Rise и Bank Transfer. FundingPips обрабатывает запрос 1–3 рабочих дня, затем кошельку или банку может понадобиться ещё 1–2 рабочих дня. До запроса нужно закрыть все сделки и ожидающие ордера, подождать минимум 15 минут и использовать карту, кошелёк или счёт на своё имя.</p>
          </div>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-fundingpips-payout-routes="four">
              <thead><tr><th>Маршрут</th><th>Минимум и валюта</th><th>Что проверяется</th><th>Кому может подойти</th></tr></thead>
              <tbody>
                <tr><td><strong>Card</strong></td><td>Общий минимум выплаты остаётся 1% размера Master Account</td><td>Visa/Mastercard на имя трейдера; Pay to Card зависит от конкретного банка и региона</td><td>Поддерживаемый банк может получить Pay to Card быстрее; Standard обычно отражается за 1–5 рабочих дней после одобрения</td></tr>
                <tr><td><strong>Crypto</strong></td><td>1% Master Account; USDT или USDC</td><td>Только ERC-20; service, exchange-rate и network fees уменьшают итоговую сумму</td><td>Пользователю с законным кошельком и совместимым off-ramp, если точный профиль допускает crypto</td></tr>
                <tr><td><strong>Rise</strong></td><td>Минимум $500</td><td>Email должен совпадать с FundingPips; обязательны Rise ID, KYC, selfie и соглашение</td><td>Пользователю из страны поддержки Rise; если Rise недоступен, официальный flow переключает reward на Crypto</td></tr>
                <tr><td><strong>Bank Transfer</strong></td><td>Минимум $500</td><td>Банковский счёт нужно верифицировать; маршрут доступен только в выбранных регионах</td><td>Пользователю с поддерживаемым локальным счётом; отсутствие кнопки в профиле означает выбор другого метода</td></tr>
              </tbody>
            </table>
          </div>
          <div className="ru-content">
            <h3>Что это значит для русскоязычной диаспоры</h3>
            <p>Pay to Card и bank transfer прямо называют Бельгию, Францию, Германию, Италию, Нидерланды, Испанию и Великобританию среди поддерживаемых регионов, но конкретный банк всё равно может отклонить быстрый маршрут. Казахстан и Израиль в опубликованном списке этих двух методов не названы; это не доказывает отсутствие всех payout-вариантов, но требует проверки Crypto или Rise внутри верифицированного профиля. Резидент ОАЭ не должен доходить до этого шага: страна прямо ограничена.</p>
            <p>Все аккаунты FundingPips номинированы в USD, даже если checkout показывает другую валюту оплаты. Русскоязычному пользователю в EUR, GBP, KZT или ILS нужно отдельно учитывать банковскую конвертацию и чистую сумму после network/provider fees.</p>
            <p className="ru-source-line"><a href={REWARD_METHODS_URL} target="_blank" rel="noopener noreferrer">Официальные Reward Methods</a> · <a href={GET_STARTED_URL} target="_blank" rel="noopener noreferrer">checkout, валюта аккаунта и KYC</a> · проверено 2026-08-27.</p>
          </div>
        </div>
      </section>

      <section className="ru-section" id="strategy">
        <div className="ru-shell ru-content" data-russian-fundingpips-deep-dive="strategy-platforms">
          <h2>Платформы, новости, выходные и Master Account</h2>
          <p><strong>FundingPips предоставляет simulated accounts, а не брокерский счёт с переданным капиталом.</strong> Текущий фирменный профиль перечисляет MT5, cTrader и Match-Trader. Официальный Account Workspace отдельно говорит, что MT5 недоступен в США и Канаде; это platform restriction, а не разрешение для любого другого продукта или профиля.</p>
          <p>Все 5 текущих продуктов допускают weekday overnight, но weekend-поле ограничено у 4 evaluation-моделей, а FundingPips Zero запрещает удержание через выходные как hard breach. News-rule тоже продуктовый: Zero запрещает news-window, а остальные модели нельзя считать полностью свободными только потому, что оценочная фаза допускает событие.</p>
          <p>После прохождения evaluation Master Account требует 4 шага: KYC, In Review, Customer Agreement и Onboarding. Два внутренних этапа FundingPips могут занимать до 2 рабочих дней каждый; торговать на Master нельзя, пока KYC, соглашение и onboarding не завершены. Instant Zero убирает evaluation, но не KYC или Customer Agreement.</p>
          <p className="ru-source-line"><a href={RESPONSIBLE_TRADING_URL} target="_blank" rel="noopener noreferrer">Simulated-account policy и ограничения стран</a> · <a href={WORKSPACE_URL} target="_blank" rel="noopener noreferrer">платформы и geo-restrictions</a> · <a href={MASTER_SETUP_URL} target="_blank" rel="noopener noreferrer">4 шага Master setup</a>.</p>
        </div>
      </section>

      <section className="ru-section" id="true-cost">
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

      <section className="ru-section" id="pros-cons">
        <div className="ru-shell ru-content" data-russian-fundingpips-deep-dive="pros-cons">
          <h2>Сильные стороны FundingPips</h2>
          <ul>
            <li>{products.length} текущих продуктов дают 1-Step, 2-Step и 0-phase маршруты вместо одного универсального challenge.</li>
            <li>{pricedTierCount} из 29 уровней имеют подтверждённую цену; минимальный опубликованный вход — {money(proFiveKPrice)} за 2 Step Pro $5K.</li>
            <li>2 Step Flex расширяет статический maximum loss до {twoStepFlex?.maxLossPct ?? '—'}%, а Standard оставляет {standard?.maxLossPct ?? '—'}% — трейдер может выбирать failure-point, а не только число фаз.</li>
            <li>Официальный payout flow публикует 4 маршрута: Card, Crypto, Rise и Bank Transfer, плюс отдельные сроки, минимумы и KYC.</li>
          </ul>

          <h2 className="ru-review-secondary-heading">Ограничения и причины отказаться</h2>
          <ul>
            <li>Два $2.5K уровня остаются без подтверждённой цены; null нельзя показывать как бесплатный или доступный продукт.</li>
            <li>100% monthly добавляет 30-дневный календарь, 35% consistency, 7 прибыльных дней и Striking System — это не стандартный сплит без условий.</li>
            <li>Weekend holding ограничен у всех 5 продуктов, а для Zero становится hard breach вместе с запрещённым news-window.</li>
            <li>ОАЭ и Вьетнам прямо ограничены, дополнительно действуют FATF и EU/UN sanctions lists; VPN или чужой адрес не создают допустимый профиль.</li>
            <li>Refund подтверждён только для 2 Step Standard на четвёртом reward; 1 Step Flex остаётся unresolved, а Pro, Flex и Zero refund не получают.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="fit">
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
      headline="FundingPips: обзор 2026 — 5 продуктов и 27 цен"
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
      analysisTocItems={[
        { href: '#reward-routes', label: 'Reward cycles и 100%' },
        { href: '#payout-methods', label: 'Card, Crypto, Rise и Bank' },
        { href: '#strategy', label: 'Платформы и торговые правила' },
        { href: '#true-cost', label: 'True cost по 17 уровням' },
        { href: '#pros-cons', label: 'Плюсы и ограничения' },
        { href: '#fit', label: 'Кому подходит FundingPips' },
      ]}
      relatedLinks={[
        { href: '/ru/fundednext-vs-fundingpips', label: 'FundedNext или FundingPips', body: 'сравнение 4 продуктов FundedNext с 5 моделями FundingPips по цене, drawdown и reward cycle' },
        { href: '/ru/prop-firmy-bez-chelendzha', label: 'Проп-фирмы без челленджа', body: 'FundingPips Zero рядом с FundedNext Stellar Instant и другими 0-phase продуктами' },
        { href: '/ru/vyplaty-prop-firm', label: 'Выплаты проп-фирм', body: 'отдельная проверка первой даты, crypto, bank и условий запроса' },
        { href: '/ru/obzor-bright-funded', label: 'Обзор Bright Funded', body: 'EUR-priced альтернатива, если USD checkout или country-path FundingPips не подходит' },
      ]}
      readTime={15}
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
          a: 'Мы не считаем доступ подтверждённым без проверки конкретного профиля. FundingPips прямо ограничивает Иран, Вьетнам, ОАЭ и юрисдикции из применимых FATF и EU/UN sanctions lists, но общий текст не доказывает успешный checkout, KYC и payout российского резидента. Получите письменный ответ поддержки до оплаты и не используйте VPN или неверные данные.',
        },
        {
          q: 'Какие способы выплаты есть у FundingPips?',
          a: 'Официальная страница перечисляет Card, Crypto, Rise и Bank Transfer. Crypto использует USDT/USDC ERC-20 с минимумом 1% Master Account; Rise и Bank Transfer требуют минимум $500. Конкретный банк, карта или провайдер зависят от страны и профиля.',
        },
        {
          q: 'Почему указано 27 цен, если в данных 29 размеров?',
          a: 'У пяти продуктов 29 строк размеров, но две строки $2.5K — у 2 Step Pro и 2 Step Standard — не имеют подтверждённой цены из-за конфликта официальных страниц. Поэтому обзор показывает 27 цен и сохраняет две неопределённые строки как null.',
        },
        {
          q: 'FundingPips выдаёт реальный брокерский счёт?',
          a: 'Нет по текущей Responsible Trading Policy: все аккаунты работают в simulated demo environment. Master Account — договорный этап для расчёта reward, а не доказательство передачи трейдеру реального брокерского капитала.',
        },
      ]}
    />
  )
}
