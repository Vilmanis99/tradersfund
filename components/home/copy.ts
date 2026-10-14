/** UI strings for the shared homepage components. Page copy stays in each page. */
export const HOME_COPY = {
  en: {
    chips: { all: 'All', open: '', cfd: 'CFD', futures: 'Futures', one: '1-step', two: '2-step', instant: 'No evaluation' },
    cols: { firm: 'Firm', programme: 'Programme', fee: 'Fee', target: 'Target', loss: 'Daily / max loss', split: 'Split', payout: 'Payout', checked: 'Checked' },
    visit: 'Visit', review: 'Review', score: 'Score', swipe: 'Swipe for more firms', empty: 'No source-checked programme matches this filter.',
    payout: { 'on-demand': 'On demand', weekly: 'Weekly', 'bi-weekly': 'Bi-weekly', monthly: 'Monthly' } as Record<string, string>,
    subscription: 'per month', copy: 'Copy', copied: 'Copied', copyFailed: 'Copy manually:', code: 'Code',
    sponsored: 'Sponsored', feeFrom: 'Fee from', split: 'Profit split', maxAlloc: 'Max allocation', filterLabel: 'Filter programmes',
    tableLabel: 'Programme comparison; scroll horizontally to see all columns', locale: 'en-US',
  },
  ru: {
    chips: { all: 'Все', open: 'Открыты для РФ', cfd: 'CFD', futures: 'Фьючерсы', one: '1 этап', two: '2 этапа', instant: 'Без оценки' },
    cols: { firm: 'Фирма', programme: 'Программа', fee: 'Взнос', target: 'Цель', loss: 'Дневной / макс. убыток', split: 'Доля', payout: 'Выплаты', checked: 'Проверено' },
    visit: 'Перейти', review: 'Обзор', score: 'Оценка', swipe: 'Листайте, чтобы увидеть другие фирмы', empty: 'Нет программ с проверенными источниками для этого фильтра.',
    payout: { 'on-demand': 'По запросу', weekly: 'Раз в неделю', 'bi-weekly': 'Раз в 2 недели', monthly: 'Раз в месяц' } as Record<string, string>,
    subscription: 'в месяц', copy: 'Копировать', copied: 'Скопировано', copyFailed: 'Скопируйте вручную:', code: 'Код',
    sponsored: 'Реклама', feeFrom: 'Взнос от', split: 'Доля прибыли', maxAlloc: 'Макс. капитал', filterLabel: 'Фильтр программ',
    tableLabel: 'Сравнение программ; прокрутите горизонтально, чтобы увидеть все столбцы', locale: 'ru-RU',
  },
} as const
export type HomeLocale = keyof typeof HOME_COPY
