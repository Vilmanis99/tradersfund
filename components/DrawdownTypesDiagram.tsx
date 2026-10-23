/**
 * C15 drawdown-types diagram (design/article-format-spec.md §4 C15, P3). The
 * same illustrative equity path is drawn three times against a static floor, a
 * real-time trailing floor and an end-of-day trailing floor, so the difference
 * is visible rather than described. It is deliberately unitless: no balance,
 * percentage or firm figure appears, and the caption says it is an illustration.
 * Server component, inline SVG, no JS.
 */

type Locale = 'en' | 'ru'
type Kind = 'static' | 'realtime' | 'eod'

// Chart geometry: x = trading days 0..4, y = account value on an arbitrary scale
// where 100 is the start balance and the permitted loss is 10 below the high-water mark.
const X0 = 24
const X1 = 292
const Y_TOP = 14
const Y_BOTTOM = 150
const V_MIN = 88
const V_MAX = 112
const px = (day: number) => X0 + (day / 4) * (X1 - X0)
const py = (value: number) => Y_BOTTOM - ((value - V_MIN) / (V_MAX - V_MIN)) * (Y_BOTTOM - Y_TOP)
const pt = (day: number, value: number) => `${px(day).toFixed(1)},${py(value).toFixed(1)}`

// Equity path: (day, value). Day k closes at x = k. Intraday peak on day 2, dip on day 3.
const EQUITY: Array<[number, number]> = [[0, 100], [0.5, 102], [1, 103], [1.4, 107], [1.7, 109], [2, 106], [2.4, 102], [2.8, 98.5], [3, 100], [3.5, 103], [4, 105]]
const PERMITTED_LOSS = 10

const equityPoints = EQUITY.map(([d, v]) => pt(d, v)).join(' ')

// Floors. Static: flat at start − permitted loss. Real-time: running high-water mark − loss.
// End of day: high-water mark of closes (day 1: 103, day 2: 106) − loss, stepping at each close.
const staticFloor = `${pt(0, 100 - PERMITTED_LOSS)} ${pt(4, 100 - PERMITTED_LOSS)}`
const realtimeFloor = [[0, 90], [1, 93], [1.4, 97], [1.7, 99], [4, 99]].map(([d, v]) => pt(d, v)).join(' ')
const eodFloor = [[0, 90], [1, 90], [1, 93], [2, 93], [2, 96], [4, 96]].map(([d, v]) => pt(d, v)).join(' ')
// The real-time floor (99) is crossed on day 3 between (2.4, 102) and (2.8, 98.5).
const breachDay = 2.4 + 0.4 * ((102 - 99) / (102 - 98.5))

const COPY = {
  en: {
    title: 'Same account, three kinds of loss floor',
    ariaLabel: 'Diagram: one equity path against a static, a real-time trailing and an end-of-day trailing loss floor',
    panels: {
      static: { name: 'Static', text: 'The floor never moves. It stays where the start balance put it, whatever the account earns.', result: 'Floor never moves' },
      realtime: { name: 'Real-time trailing', text: 'The floor follows every new peak, including a floating profit that has not been closed. The dip after the peak crosses it.', result: 'Breached on the dip' },
      eod: { name: 'End-of-day trailing', text: 'The floor moves up only at each daily close, so the intraday peak does not lift it. The same dip stays above the floor.', result: 'Floor moves at close' },
    },
    equity: 'Equity', floor: 'Loss floor', start: 'Start balance', peak: 'Intraday peak', breach: 'Breach', days: 'Trading days',
    note: 'Illustration of how each floor type behaves, not any firm’s numbers: check each product’s own formula, what it observes (balance or equity) and when it updates.',
  },
  ru: {
    title: 'Один счёт, три вида лимита убытка',
    ariaLabel: 'Схема: одна кривая эквити относительно статического, трейлинг в реальном времени и трейлинг по концу дня лимита убытка',
    panels: {
      static: { name: 'Статический', text: 'Линия не двигается. Она остаётся там, где её задал стартовый баланс, сколько бы счёт ни заработал.', result: 'Линия неподвижна' },
      realtime: { name: 'Трейлинг в реальном времени', text: 'Линия следует за каждым новым максимумом, включая плавающую прибыль по незакрытой сделке. Спад после пика пробивает её.', result: 'Пробой на спаде' },
      eod: { name: 'Трейлинг по концу дня', text: 'Линия поднимается только при дневном закрытии, поэтому внутридневной пик её не двигает. Тот же спад остаётся выше линии.', result: 'Линия двигается на закрытии' },
    },
    equity: 'Эквити', floor: 'Лимит убытка', start: 'Старт', peak: 'Пик внутри дня', breach: 'Пробой', days: 'Торговые дни',
    note: 'Иллюстрация поведения каждого типа линии, а не цифры какой-либо фирмы: проверьте формулу конкретного продукта, что именно она отслеживает (баланс или эквити) и когда обновляется.',
  },
} as const

function Panel({ kind, locale }: { kind: Kind; locale: Locale }) {
  const copy = COPY[locale]
  const panel = copy.panels[kind]
  const floor = kind === 'static' ? staticFloor : kind === 'realtime' ? realtimeFloor : eodFloor
  const breached = kind === 'realtime'
  return (
    <div className={`drawdown-types__panel drawdown-types__panel--${kind}`} data-drawdown-panel={kind}>
      <h3 className="drawdown-types__name">{panel.name}</h3>
      <div className="drawdown-types__chart">
      <svg className="drawdown-types__svg" viewBox="0 0 300 186" role="img" aria-label={`${panel.name}: ${panel.result}`} focusable="false">
        <line className="drawdown-types__axis" x1={X0} y1={Y_BOTTOM} x2={X1} y2={Y_BOTTOM} />
        <line className="drawdown-types__axis" x1={X0} y1={Y_TOP} x2={X0} y2={Y_BOTTOM} />
        <line className="drawdown-types__start" x1={X0} y1={py(100)} x2={X1} y2={py(100)} />
        {[1, 2, 3, 4].map(day => (
          <g key={day}>
            <line className="drawdown-types__tick" x1={px(day)} y1={Y_BOTTOM} x2={px(day)} y2={Y_BOTTOM + 4} />
            <text className="drawdown-types__label" x={px(day)} y={Y_BOTTOM + 16} textAnchor="middle">{day}</text>
          </g>
        ))}
        <text className="drawdown-types__label" x={X1} y={Y_BOTTOM + 30} textAnchor="end">{copy.days}</text>
        <text className="drawdown-types__label" x={X0 + 4} y={py(100) + 12}>{copy.start}</text>
        <polyline className="drawdown-types__floor" points={floor} fill="none" />
        <polyline className="drawdown-types__equity" points={equityPoints} fill="none" />
        <circle className="drawdown-types__peak" cx={px(1.7)} cy={py(109)} r="3.5" />
        <text className="drawdown-types__label" x={px(1.7)} y={py(109) - 7} textAnchor="middle">{copy.peak}</text>
        {breached && (
          <g>
            <circle className="drawdown-types__breach" cx={px(breachDay)} cy={py(99)} r="5" />
            <text className="drawdown-types__label drawdown-types__label--breach" x={px(breachDay) + 8} y={py(99) + 14}>{copy.breach}</text>
          </g>
        )}
      </svg>
      </div>
      <div className="drawdown-types__copy">
      <p className="drawdown-types__result"><strong>{panel.result}</strong></p>
      <p className="drawdown-types__text">{panel.text}</p>
      </div>
    </div>
  )
}

export default function DrawdownTypesDiagram({ locale, id }: { locale: Locale; id?: string }) {
  const copy = COPY[locale]
  return (
    <figure className={`drawdown-types drawdown-types--${locale}`} id={id} data-article-diagram-rendered="drawdown-types" role="group" aria-label={copy.ariaLabel}>
      <figcaption className="drawdown-types__title">{copy.title}</figcaption>
      <p className="drawdown-types__legend" aria-hidden="true">
        <span className="drawdown-types__key drawdown-types__key--equity">{copy.equity}</span>
        <span className="drawdown-types__key drawdown-types__key--floor">{copy.floor}</span>
      </p>
      <div className="drawdown-types__grid">
        <Panel kind="static" locale={locale} />
        <Panel kind="realtime" locale={locale} />
        <Panel kind="eod" locale={locale} />
      </div>
      <p className="drawdown-types__note">{copy.note}</p>
    </figure>
  )
}
