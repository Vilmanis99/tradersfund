import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import RuPendingLink from '@/components/RuPendingLink'
import { getRussianReviewFinderHref } from '@/lib/challengeComparisonData'
import RussianPartnerReview from '@/components/RussianPartnerReview'
import { challengeTierEconomics, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import accessEvidence from '@/content/data/russian-fundingpips-access-evidence.json'

const PATH = '/ru/obzor-fundingpips'
export const revalidate = 3600
const TITLE = 'FundingPips (Funding Pips): отзывы, обзор 2026, доступ из РФ'
const DESCRIPTION = 'FundingPips (Фандинг Пипс): отзывы и обзор 2026 — 1 Step, 2 Step и Zero, цены в USD, просадка, сплит и выплаты, промокод и статус доступа из России.'
const RU_CHECKED = '14.10.2026'
const TRUSTPILOT_URL = 'https://www.trustpilot.com/review/fundingpips.com'
const TERMS_URL = 'https://fundingpips.com/terms-and-conditions'
const REWARD_METHODS_URL = 'https://help.fundingpips.com/hc/en-us/articles/34504564970385-Reward-Methods'
const REWARD_METHODS_CAPTURED_AT = '2026-09-30'
const GET_STARTED_URL = accessEvidence.sourceUrl
const RESPONSIBLE_TRADING_URL = 'https://help.fundingpips.com/hc/en-us/articles/47328410434065-Responsible-Trading-Policy'
const WORKSPACE_URL = 'https://help.fundingpips.com/hc/en-us/articles/43468639481105-Account-Workspace'
const MASTER_SETUP_URL = 'https://help.fundingpips.com/hc/en-us/articles/48636294148497-Master-Account-Setup'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

function FundingPipsDeepDive({ accessCurrent }: { accessCurrent: boolean }) {
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
      <section className="ru-section" id="dostup-iz-rossii">
        <div className="ru-shell ru-content" data-russian-fundingpips-russia="unclear">
          <h2>Доступна ли FundingPips из России</h2>
          <p><span className="ru-badge ru-badge--unclear">Доступ для РФ не ясен · проверено {RU_CHECKED}</span></p>
          <p>
            Россия в списках FundingPips прямо не названа. Но <a href={TERMS_URL} target="_blank" rel="nofollow noopener noreferrer">условия</a> исключают
            резидентов стран из санкционных списков FATF и ЕС/ООН, а также Вьетнама и ОАЭ; <a href={GET_STARTED_URL} target="_blank" rel="nofollow noopener noreferrer">справка</a>{' '}
            от {accessEvidence.sourceCapturedAt} добавляет Иран. Попадает ли под эту формулировку резидент России — из текста не следует. Кроме того, выплата через
            Rise требует KYC, а Pay to Card и банковский перевод работают только в перечисленных регионах.
          </p>
          <p>
            {'Кнопка FundingPips на странице помечена бейджем «Доступ для РФ не ясен»: если вы резидент России, до оплаты получите письменный ответ поддержки. '}
            Фирмы, которые на{' '}
            {RU_CHECKED} Россию не ограничивают: BrightFunded, Crypto Fund Trader (FundedNext с 20.10.2026 резидентам РФ недоступна) — таблица на странице{' '}
            <Link href="/ru/dlya-russkoyazychnykh-treyderov">«Проп-фирмы для россиян»</Link>. VPN и неверные данные не решают проблему, а создают новую на этапе KYC.
          </p>
        </div>
      </section>

      <section className="ru-section" id="otzyvy">
        <div className="ru-shell ru-content" data-russian-fundingpips-reviews="trustpilot">
          <h2>FundingPips: отзывы трейдеров</h2>
          <p>
            На <a href={TRUSTPILOT_URL} target="_blank" rel="nofollow noopener noreferrer">Trustpilot</a> у FundingPips оценка 4,5 при 63 734 отзывах
            (по данным на 27.07.2026). Высокая оценка при таком объёме говорит о массовой аудитории, но не о том, что
            ваша выплата пройдёт: отзывы не проверяют KYC и страну автора.
          </p>
          <p>
            Как читать отзывы о FundingPips: ищите дату (правила выплат менялись 15 и 26 августа 2026 года), название продукта — Zero,
            Pro, Flex и Standard живут по разным правилам — и названное правило, из-за которого отказали. Жалоба «не выплатили» без
            даты и продукта мало что значит.
            Методика — на странице <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>. Мастер-счёт FundingPips — пример того, что называют <RuPendingLink href="/ru/funded-account">funded account</RuPendingLink>; основы — в разделе <RuPendingLink href="/ru/prop-trejding">проп-трейдинг</RuPendingLink>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="reward-routes">
        <div className="ru-shell" data-russian-fundingpips-deep-dive="reward-routes">
          <div className="ru-content">
            <h2>100% по запросу (On Demand) или регулярная выплата: условия различаются</h2>
          <p>FundingPips заменил прежний ежемесячный маршрут 100% на выплату 100% по запросу (On Demand) для подходящих мастер-счетов. Для 2 Step Standard фирма перечисляет три цикла — еженедельно 60%, раз в две недели 80% или по запросу 100% (по данным на 20.10.2026; <a href="https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard" target="_blank" rel="noopener noreferrer">страница 2 Step Standard</a>). Число 100% выглядит выше, но вместе с ним появляются правило стабильности 35%, семь прибыльных дней минимум по 0,5% и Striking System с порогом 1%. Поэтому максимальную долю нельзя сравнивать без условий допуска и дополнительных ограничений.</p>
          </div>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-fundingpips-reward-routes="five-products">
              <thead><tr><th>Продукт</th><th>Более быстрый маршрут</th><th>100% по запросу (On Demand)</th><th>Что меняется</th></tr></thead>
              <tbody>
                <tr><td>1 Step Flex</td><td>80% раз в 14 дней</td><td>по запросу после выполнения условий</td><td>Правило стабильности 35%, 7 дней по 0,5%; Striking 1% уже действует</td></tr>
                <tr><td>2 Step Flex</td><td>80% или 95% раз в 14 дней</td><td>по запросу после выполнения условий</td><td>95% требует 3 дней по 0,5%; по запросу — 35%, 7 дней и Striking 1%</td></tr>
                <tr><td>2 Step Pro</td><td>80% каждые 7 дней</td><td>по запросу после выполнения условий</td><td>Маршрут по запросу добавляет 35%, 7 дней по 0,5% и Striking 1%</td></tr>
                <tr><td>2 Step Standard</td><td>60% еженедельно или 80% раз в 2 недели</td><td>по запросу после выполнения условий</td><td>Правило стабильности 35% действует только для маршрута 100% по запросу; прежние 90% по запросу и 100% ежемесячно больше не предлагаются</td></tr>
                <tr><td>FundingPips Zero</td><td>95% раз в 14 дней</td><td>не опубликован</td><td>Правило стабильности 15%, 7 дней по 0,25%, защитный запас 3%</td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-muted">Для новых счетов 2 Step Flex по маршруту 80% действует минимум {twoStepFlex?.minTradingDays ?? '—'} торговый день на фазу; у новых и сброшенных счетов 2 Step Pro {pro?.minTradingDays === 0 ? 'минимума торговых дней на фазу нет' : `минимум — ${pro?.minTradingDays ?? '—'} дн. на фазу`} (по данным на 19.10.2026). Старые счета до 26 августа могут сохранить прежний минимум, поэтому дата создания аккаунта влияет на правило.</p>
        </div>
      </section>

      <section className="ru-section" id="payout-methods">
        <div className="ru-shell" data-russian-fundingpips-deep-dive="payout-methods">
          <div className="ru-content">
            <h2>Как FundingPips выплачивает вознаграждение русскоязычному трейдеру</h2>
            <p>Официальная страница традиционных способов выплаты перечисляет 4 метода: карта, криптовалюта, Rise и банковский перевод. Отдельно она предлагает купить новый челлендж за reward или перевести reward в Tradin с рекламируемым бонусом 30%; это другие маршруты, а не пятый способ вывода денег. FundingPips обрабатывает запрос 1–3 рабочих дня, затем кошельку или банку может понадобиться ещё 1–2 рабочих дня. До запроса нужно закрыть все сделки и ожидающие ордера, подождать минимум 15 минут и использовать карту, кошелёк или счёт на своё имя.</p>
          </div>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-fundingpips-payout-routes="four">
              <thead><tr><th>Маршрут</th><th>Минимум и валюта</th><th>Что проверяется</th><th>Кому может подойти</th></tr></thead>
              <tbody>
                <tr><td><strong>Карта</strong></td><td>Общий минимум выплаты остаётся 1% размера мастер-счёта</td><td>Visa/Mastercard на имя трейдера; Pay to Card зависит от конкретного банка и региона</td><td>Поддерживаемый банк может получить Pay to Card быстрее; на Standard сумма обычно отражается за 1–5 рабочих дней после одобрения</td></tr>
                <tr><td><strong>Криптовалюта</strong></td><td>1% мастер-счёта; USDT или USDC</td><td>Только ERC-20; комиссия сервиса, конвертация и комиссия сети уменьшают итоговую сумму</td><td>Пользователю с законным кошельком и совместимым выходом в фиат, если точный профиль допускает криптовалюту</td></tr>
                <tr><td><strong>Rise</strong></td><td>Минимум $500</td><td>Адрес email должен совпадать с FundingPips; обязательны Rise ID, KYC, селфи и соглашение</td><td>Пользователю из страны поддержки Rise; если Rise недоступен, официальный маршрут переключает вознаграждение на криптовалюту</td></tr>
                <tr><td><strong>Банковский перевод</strong></td><td>Минимум $500</td><td>Банковский счёт нужно верифицировать; маршрут доступен только в выбранных регионах</td><td>Пользователю с поддерживаемым локальным счётом; отсутствие кнопки в профиле означает выбор другого метода</td></tr>
              </tbody>
            </table>
          </div>
          <div className="ru-content">
            <h3>Что это значит для русскоязычной диаспоры</h3>
            <p>Pay to Card и банковский перевод прямо называют Бельгию, Францию, Германию, Италию, Нидерланды, Испанию и Великобританию среди поддерживаемых регионов, но конкретный банк всё равно может отклонить быстрый маршрут. Казахстан и Израиль в опубликованном списке этих двух методов не названы; это не доказывает отсутствие всех вариантов выплаты, но требует проверки криптовалюты или Rise внутри верифицированного профиля. {accessCurrent ? 'Резидент ОАЭ не должен доходить до этого шага: страна прямо ограничена.' : 'Ограничение для резидентов ОАЭ отмечено в прежней проверке; актуальные условия нужно подтвердить заново.'}</p>
            <p>Все счета FundingPips номинированы в USD, даже если на странице оплаты выбрана другая валюта. Если вы платите в EUR, GBP, KZT или ILS, учитывайте банковскую конвертацию. Для выплаты отдельно проверьте комиссии сети и платёжного сервиса.</p>
            <p className="ru-source-line"><a href={REWARD_METHODS_URL} target="_blank" rel="noopener noreferrer">Официальные способы выплаты</a> · проверено {REWARD_METHODS_CAPTURED_AT}; <a href={GET_STARTED_URL} target="_blank" rel="noopener noreferrer">оплата, валюта счёта и KYC</a> · проверено {accessEvidence.sourceCapturedAt}.</p>
          </div>
        </div>
      </section>

      <section className="ru-section" id="strategy">
        <div className="ru-shell ru-content" data-russian-fundingpips-deep-dive="strategy-platforms">
          <h2>Платформы, новости, выходные и мастер-счёт</h2>
          <p><strong>FundingPips предоставляет симулированные счета, а не брокерский счёт с переданным капиталом.</strong> Текущий профиль фирмы перечисляет MT5, cTrader и Match-Trader. Официальный рабочий кабинет отдельно говорит, что MT5 недоступен в США и Канаде; это ограничение платформы, а не разрешение для любого другого продукта или профиля.</p>
          <p>Все 5 текущих продуктов допускают перенос позиций через ночь в будни, но перенос через выходные ограничен у 4 оценочных моделей, а FundingPips Zero запрещает удержание через выходные как серьёзное нарушение. Правило новостей тоже зависит от продукта: Zero запрещает окно новостей, а остальные модели нельзя считать полностью свободными только потому, что оценочная фаза допускает событие.</p>
          <p>После прохождения оценки мастер-счёт требует 4 шага: KYC, проверка, соглашение с клиентом и подключение. Два внутренних этапа FundingPips могут занимать до 2 рабочих дней каждый; торговать на мастер-счёте нельзя, пока KYC, соглашение и подключение не завершены. Instant Zero убирает оценку, но не KYC или соглашение с клиентом.</p>
          <p className="ru-source-line"><a href={RESPONSIBLE_TRADING_URL} target="_blank" rel="noopener noreferrer">Политика симулированных счетов и ограничения стран</a> · <a href={WORKSPACE_URL} target="_blank" rel="noopener noreferrer">платформы и географические ограничения</a> · <a href={MASTER_SETUP_URL} target="_blank" rel="noopener noreferrer">4 шага настройки мастер-счёта</a>.</p>
        </div>
      </section>

      <section className="ru-section" id="true-cost">
        <div className="ru-shell" data-russian-fundingpips-deep-dive="true-cost">
          <div className="ru-content">
            <h2>Полная стоимость маршрутов с фиксированной долей</h2>
            <p>Ниже комиссия делится на сохранённую долю более короткого маршрута: {oneStep?.profitSplitPct ?? '—'}% для 1 Step Flex, {pro?.profitSplitPct ?? '—'}% для 2 Step Pro и {zero?.profitSplitPct ?? '—'}% для Zero. Flex и Standard исключены из расчёта, потому что у них нет одного универсального процента.</p>
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
          <p className="ru-muted">Расчёт описывает одну покупку и не прогнозирует прохождение или выплату. Доля 100% по запросу уменьшает математический порог, но добавляет правило стабильности, прибыльные дни и продуктовую систему Striking.</p>
        </div>
      </section>

      <section className="ru-section" id="pros-cons">
        <div className="ru-shell ru-content" data-russian-fundingpips-deep-dive="pros-cons">
          <h2>Сильные стороны FundingPips</h2>
          <ul>
            <li>{products.length} текущих продуктов дают маршруты 1-Step, 2-Step и без оценочной фазы вместо одного универсального челленджа.</li>
            <li>{pricedTierCount} из 29 уровней имеют подтверждённую цену; минимальный опубликованный вход — {money(proFiveKPrice)} за 2 Step Pro $5K.</li>
            <li>2 Step Flex расширяет статический максимальный убыток до {twoStepFlex?.maxLossPct ?? '—'}%, а Standard оставляет {standard?.maxLossPct ?? '—'}% — трейдер может выбирать точку нарушения, а не только число фаз.</li>
            <li>Официальный процесс выплаты публикует 4 маршрута: карта, криптовалюта, Rise и банковский перевод, плюс отдельные сроки, минимумы и KYC.</li>
          </ul>

          <h2 className="ru-review-secondary-heading">Ограничения и причины отказаться</h2>
          <ul>
            <li>Для двух вариантов на $2.5K цена не подтверждена. Это не означает, что счёт бесплатный или доступен для покупки.</li>
            <li>100% по запросу (On Demand) добавляет правило стабильности 35%, 7 прибыльных дней и Striking System — это не стандартная доля без условий.</li>
            <li>Удержание позиций через выходные ограничено у всех 5 продуктов, а для Zero становится серьёзным нарушением вместе с запрещённым окном новостей.</li>
            <li>ОАЭ и Вьетнам прямо ограничены, дополнительно действуют списки FATF и санкционные списки ЕС/ООН; VPN или чужой адрес не создают допустимый профиль.</li>
            <li>Возврат комиссии указан только для 2 Step Standard после четвёртой выплаты — так пишет Help Centre, но Условия (Terms) этого не подтверждают; 1 Step Flex, 2 Step Flex, 2 Step Pro и Zero возврат не получают.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="pravila">
        <div className="ru-shell ru-content" data-russian-fundingpips-rules="verified">
          <h2>Правила FundingPips</h2>
          <p>Цели и лимиты по продуктам (данные проверены 29.09.2026):</p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-fundingpips-rules-table="products">
              <caption className="hidden-caption">Правила FundingPips по продуктам</caption>
              <thead><tr><th>Продукт</th><th>Цель</th><th>Дневной лимит</th><th>Максимальный убыток</th></tr></thead>
              <tbody>
                <tr><td>1 Step Flex</td><td>12%</td><td>3%</td><td>12%, статический</td></tr>
                <tr><td>2 Step Flex</td><td>10% и 8%</td><td>4%</td><td>12%, статический</td></tr>
                <tr><td>2 Step Pro</td><td>6% и 6%</td><td>3%</td><td>6%, статический</td></tr>
                <tr><td>2 Step Standard</td><td>8% и 5%</td><td>5%</td><td>10%, статический</td></tr>
                <tr><td>FundingPips Zero</td><td>без оценки</td><td>3%</td><td>5%, плавающий; открытый риск не более 1%</td></tr>
              </tbody>
            </table>
          </div>
          <ul>
            <li><strong>Правило стабильности:</strong> от 15% до 35% в зависимости от продукта; у части программ есть минимум прибыльных дней (у Zero — 7 дней).</li>
            <li><strong>Новости:</strong> торговля ограничена; у Zero окно новостей запрещено.</li>
            <li><strong>Перенос позиций:</strong> через ночь в будни разрешён; на этапе оценки 2 Step Standard перенос через выходные разрешён, а на мастер-счёте требует опции Swing; у Zero удержание через выходные — серьёзное нарушение.</li>
            <li><strong>Советники (EA) и копирование сделок:</strong> ограничены. Точные условия смотрите в правилах выбранного продукта.</li>
            <li><strong>Минимальные дни:</strong> 2 Step Flex — {twoStepFlex?.minTradingDays ?? '—'} день на фазу (маршрут 80%), 2 Step Pro — {pro?.minTradingDays === 0 ? 'без минимума' : `${pro?.minTradingDays ?? '—'} дн. на фазу`} для новых и сброшенных счетов (по данным на 19.10.2026; купленные до 26.08.2026 сохраняют 1 день).</li>
            <li><strong>Масштабирование:</strong> план масштабирования есть; условия зависят от продукта.</li>
            <li><strong>Платформы:</strong> MT5, cTrader, Match-Trader; MT5 недоступен в США и Канаде.</li>
          </ul>
        </div>
      </section>



      <section className="ru-section" id="promokod">
        <div className="ru-shell ru-content" data-russian-fundingpips-promo="pending">
          <h2>Промокод FundingPips</h2>
          <p>
            <strong>Промокод FundingPips: HELLO</strong> — скидка 20% на первую покупку. Не действует на счёт $100K; дата окончания не
            опубликована. Источник — Prop Firm Tracker, проверено {RU_CHECKED}. Пример: если счёт стоит $100, с кодом вы заплатите $80.
            Все проверенные коды — в разделе <Link href="/ru/promokody-prop-firm">промокоды проп-фирм</Link>.
          </p>
          <p>Если код у вас уже есть, сверьте итоговую сумму до подтверждения платежа: счета FundingPips номинированы в USD, и при оплате в другой валюте добавится конвертация банка.</p>
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
              <p>На мастер-счетах (Master Accounts) удержание через выходные сейчас ограничено, а у Zero это жёсткое нарушение. Трейдеру, который системно держит позицию с пятницы на понедельник, нужно сравнить русскоязычный рейтинг до оплаты.</p>
            </article>
            <article className="ru-card">
              <h3>{accessCurrent ? 'Не подходит резиденту ОАЭ' : 'ОАЭ: перепроверьте доступ'}</h3>
              <p>{accessCurrent ? 'Официальный справочный центр FundingPips прямо включает ОАЭ в ограничения по резидентству. Русскоязычному трейдеру в Дубае нельзя использовать этот маршрут только потому, что фирма зарегистрирована или представлена в ОАЭ.' : `Последняя проверка справки от ${accessEvidence.sourceCapturedAt} включала резидентов ОАЭ в ограничения. Источник устарел; подтвердите текущую политику до регистрации и оплаты.`}</p>
            </article>
          </div>
          <p className="ru-muted">Standard сохраняет {standard?.minTradingDays ?? '—'} дня на фазу, а Zero не имеет оценки, но сочетает плавающий лимит {zero?.maxLossPct ?? '—'}%, правило стабильности {zero?.consistencyRulePct ?? '—'}% и семь прибыльных дней. Это пять разных контрактов, а не единый «челлендж FundingPips».</p>
        </div>
      </section>
    </>
  )
}

export default function RussianFundingPipsReviewPage() {
  const payoutEvidenceDate = marketEvidence.payoutEvidence.find(item => item.firmSlug === 'fundingpips')?.sourceCapturedAt ?? ''
  const accessCurrent = isChallengeFresh({ sourceCapturedAt: accessEvidence.sourceCapturedAt })
  return (
    <RussianPartnerReview
      path={PATH}
      title={TITLE}
      headline="FundingPips: отзывы и обзор 2026 — цены, правила, доступ из России"
      description={DESCRIPTION}
      firmName="FundingPips"
      firmSlug="fundingpips"
      affiliateSlug="fundingpips"
      affiliateFrom="ru-fundingpips-review-verdict"
      englishReviewHref="/blog/funding-pips-review"
      lead={<>FundingPips публикует пять разных наборов правил и несколько циклов выплат. После обновлений 15 и 26 августа 2026 года сравнивать нужно не только цену и рекламный процент, но также минимальные дни, правило стабильности, Striking System и дату создания аккаунта.</>}
      countryNote={<span data-russian-fundingpips-country-source-status={accessCurrent ? 'dated' : 'recapture-required'}>
        <a href={GET_STARTED_URL} target="_blank" rel="nofollow noopener noreferrer">Справка FundingPips</a>, проверена {accessEvidence.sourceCapturedAt}:{' '}
        {accessCurrent
          ? 'фирма не принимает резидентов ОАЭ и Вьетнама и применяет ограничения по санкционным спискам. Русскоязычному трейдеру в Дубае этот маршрут не подходит; для любой другой страны отдельно подтвердите резидентство, KYC, оплату и вывод.'
          : 'ранее справка ограничивала резидентов ОАЭ и Вьетнама. Страновые условия требуют повторной проверки; этот старый список не подтверждает доступ сегодня. До оплаты уточните резидентство, KYC и выплату напрямую у фирмы.'}
      </span>}
      verdict={[
        { title: '1 Step Flex', body: <>Цель 12%, дневной лимит 3% и статический максимум 12%. Маршрут 80% работает раз в 14 дней; 100% по запросу (On Demand) добавляют правило стабильности 35% и семь дней минимум по 0,5%.</> },
        { title: '2 Step Flex', body: <>Цели 10% и 8%, дневной лимит 4%, статический максимум 12%. Вариант с долей 80% требует один день на фазу, 95% — три прибыльных дня. Выплата 100% по запросу добавляет отдельные условия допуска (по данным на 20.10.2026).</> },
        { title: '2 Step Pro', body: <>Цели 6% и 6%, дневной лимит 3% и статический максимум 6%. Новые и сброшенные счета требуют 0 минимальных дней на фазу; можно сравнить 80% еженедельно с 100% по запросу (On Demand) при выполнении условий.</> },
      ]}
      editorialNotes={[
        'Комиссия за 1 Step Flex не возвращается: Help Centre (Get Started) прямо исключает этот продукт из возврата после четвёртой выплаты.',
        'У 2 Step Standard нет одной доли или единой частоты: еженедельно 60%, раз в 2 недели 80% и 100% по запросу (On Demand) имеют разные сроки и условия.',
        'Цены и правила повторно проверены 29 сентября 2026 года после обновления официальных страниц. Две цены для счетов $2.5K не указаны: источники противоречат друг другу.',
      ]}
      decisionGuide={{
        title: 'Как читать линейку FundingPips без ловушки одного сплита',
        intro: <>У FundingPips пять разных моделей, поэтому вопрос «какой процент?» недостаточен. Для решения сначала выберите риск-механику и способ запроса вознаграждения, а уже потом сравнивайте цену и доступность страны.</>,
        items: [
          { title: 'Flex и Pro — разные компромиссы', body: <>2 Step Flex за $32 на $5K даёт 12% статического запаса и минимум один день на фазу по маршруту 80%. 2 Step Pro за $29 сокращает запас до 6%, зато для новых и сброшенных счетов не требует минимума торговых дней (по данным на 19.10.2026) и предлагает 80% еженедельно.</> },
          { title: '100% меняет условия', body: <>100% по запросу требуют правила стабильности 35%, прибыльных дней и Striking System 1% (по данным на 20.10.2026). Сравнивайте реальную доступность выплаты, а не только процент после одобрения.</> },
          { title: 'Zero — не режим без правил', body: <>FundingPips Zero не имеет оценочного этапа, но сочетает плавающий лимит 5%, максимальный открытый риск 1%, минимум 7 прибыльных дней и правило стабильности до 15%. Такой маршрут нужно сравнивать с вашей статистикой, а не с ценой обычного челленджа.</> },
        ],
      }}
      analysisTocItems={[
        { href: '#dostup-iz-rossii', label: 'Доступ из России' },
        { href: '#otzyvy', label: 'Отзывы о FundingPips' },
        { href: '#reward-routes', label: 'Циклы выплат и 100%' },
        { href: '#payout-methods', label: 'Карта, криптовалюта, Rise и банк' },
        { href: '#strategy', label: 'Платформы и торговые правила' },
        { href: '#true-cost', label: 'Полная стоимость 17 уровней' },
        { href: '#pros-cons', label: 'Плюсы и ограничения' },
        { href: '#pravila', label: 'Правила FundingPips' },
        { href: '#promokod', label: 'Промокод FundingPips' },
        { href: '#fit', label: 'Кому подходит FundingPips' },
      ]}
      relatedLinks={[
        { href: getRussianReviewFinderHref('fundingpips'), label: 'Сравнить двухэтапные программы в подборе', body: 'начните с FundingPips и FundedNext на одном размере счёта; затем измените фильтры под свою стратегию' },
        { href: '/ru/fundednext-vs-fundingpips', label: 'FundedNext или FundingPips', body: 'сравнение программ по цене, просадке и циклу выплат' },
        { href: '/ru/ftmo-vs-fundingpips', label: 'FTMO или FundingPips', body: 'взносы в EUR и USD, возврат взноса, правило стабильности и способы выплаты' },
        { href: '/ru/prop-firmy-bez-chelendzha', label: 'Проп-фирмы без челленджа', body: 'FundingPips Zero рядом с FundedNext Stellar Instant и другими продуктами без оценочной фазы' },
        { href: '/ru/vyplaty-prop-firm', label: 'Выплаты проп-фирм', body: 'отдельная проверка первой даты, криптовалюты, банка и условий запроса' },
        { href: '/ru/obzor-bright-funded', label: 'Обзор BrightFunded', body: 'программы с ценами в EUR; доступность для своего гражданства и места проживания нужно проверить отдельно' },
      ]}
      readTime={15}
      firmAnalysis={<FundingPipsDeepDive accessCurrent={accessCurrent} />}
      faqSourceDates={[payoutEvidenceDate, REWARD_METHODS_CAPTURED_AT, accessEvidence.sourceCapturedAt]}
      faqs={[
        {
          q: 'Какой продукт FundingPips самый дешёвый?',
          a: 'Самая низкая подтверждённая цена — $29 для 2 Step Pro на $5K. Для счетов $2.5K у Pro и Standard цена не указана, потому что официальные страницы противоречат друг другу. Это не бесплатные предложения.',
        },
        {
          q: 'У FundingPips теперь всегда сплит 100%?',
          a: 'Нет. Ежемесячного маршрута больше нет: 100% дают выплаты по запросу (On Demand), например у 2 Step Standard — еженедельно 60%, раз в две недели 80% или по запросу 100% (по данным на 20.10.2026). Для 100% нужны правило стабильности 35%, прибыльные дни и условия Striking System. Регулярные циклы используют другие доли.',
        },
        {
          q: 'Сколько минимальных дней у 2 Step Flex и Pro?',
          a: 'Новые или сброшенные 2 Step Flex счета по маршруту 80% требуют один торговый день на фазу; маршрут 95% требует три прибыльных дня по 0,5%. У новых или сброшенных 2 Step Pro счетов минимума торговых дней на фазу нет (по данным на 19.10.2026). Существующие счета 2 Step Pro, купленные до 26 августа 2026 года, сохраняют минимум один торговый день. У 2 Step Flex старые счета до 26 августа 2026 года также могут сохранить прежнее правило.',
        },
        {
          q: 'Можно ли использовать FundingPips из ОАЭ?',
          a: accessCurrent
            ? `Нет для резидента ОАЭ по справке FundingPips, проверенной ${accessEvidence.sourceCapturedAt}: ОАЭ включены в ограничения. Русскоязычному трейдеру в Дубае следует выбрать другую фирму; не обходите ограничение через VPN или неверный адрес.`
            : `По справке от ${accessEvidence.sourceCapturedAt} резиденты ОАЭ были ограничены, но страновой источник требует повторной проверки. Старое наблюдение не подтверждает доступ сегодня; уточните условия у FundingPips и не используйте VPN или неверный адрес.`,
        },
        {
          q: 'Можно ли зарегистрироваться из России?',
          a: accessCurrent
            ? `Доступ нужно подтвердить для конкретного трейдера. По справке FundingPips от ${accessEvidence.sourceCapturedAt} ограничены резиденты Ирана, Вьетнама, ОАЭ и юрисдикций из применимых списков FATF и санкционных списков ЕС/ООН. Это не подтверждает оплату, KYC и выплату для резидента России. Получите письменный ответ поддержки до оплаты; не обходите ограничения через VPN или неверные данные.`
            : `Страновая справка FundingPips от ${accessEvidence.sourceCapturedAt} требует повторной проверки. Прежний список ограничений не подтверждает регистрацию, оплату, KYC или выплату резиденту России сегодня. Получите письменный ответ поддержки до оплаты; не обходите ограничения через VPN или неверные данные.`,
        },
        {
          q: 'Есть ли рабочий промокод FundingPips?',
          a: 'Да: HELLO даёт 20% на первую покупку, кроме счёта $100K; дата окончания не опубликована (Prop Firm Tracker, проверено 14.10.2026). Доступ для РФ при этом не ясен.',
        },
        {
          q: 'Какие отзывы о FundingPips?',
          a: 'На Trustpilot — 4,5 при 63 734 отзывах (снимок от 27.07.2026). Читайте отзывы с датой и названием продукта: правила выплат менялись в августе 2026 года.',
        },
        {
          q: 'Какие способы выплаты есть у FundingPips?',
          a: 'Официальная страница перечисляет карту, криптовалюту, Rise и банковский перевод. Криптовалюта использует USDT/USDC ERC-20 с минимумом 1% размера мастер-счёта; Rise и банковский перевод требуют минимум $500. Конкретный банк, карта или провайдер зависят от страны и профиля.',
        },
        {
          q: 'Почему указано 27 цен, если в данных 29 размеров?',
          a: 'У пяти программ 29 вариантов размера счёта. Для двух вариантов на $2.5K — у 2 Step Pro и 2 Step Standard — цена не подтверждена из-за конфликта официальных страниц. Поэтому обзор показывает 27 цен, а две оставшиеся помечены как неопределённые.',
        },
        {
          q: 'FundingPips выдаёт реальный брокерский счёт?',
          a: 'Нет по текущей политике ответственной торговли: все аккаунты работают в симулированной демо-среде. Мастер-счёт — договорный этап для расчёта вознаграждения, а не доказательство передачи трейдеру реального брокерского капитала.',
        },
      ]}
    />
  )
}
