---
slug: fundingpips
lang: ru
firm: FundingPips
checkedAt: '2026-10-27'
dataAsOf: '2026-10-20'
author: Редакция Traders Fund Hub
sources:
  - title: Справка FundingPips — 2 Step Standard (перечитано 23.10.2026)
    url: 'https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard'
  - title: Справка FundingPips — 2 Step Pro (перечитано 23.10.2026)
    url: 'https://help.fundingpips.com/hc/en-us/articles/34502027344017-2-Step-Pro-Model'
  - title: Справка FundingPips — FundingPips Zero (перечитано 23.10.2026)
    url: 'https://help.fundingpips.com/hc/en-us/articles/34502157694865-FundingPips-Zero'
  - title: Справка FundingPips — News Trading & Weekend Holding (обновлена 08.10.2026, перечитано 23.10.2026)
    url: 'https://help.fundingpips.com/hc/en-us/articles/34504137479441-News-Trading-Weekend-Holding'
  - title: Справка FundingPips — Compare Account Models (перечитано 23.10.2026)
    url: 'https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'
  - title: Условия FundingPips (Terms and Conditions)
    url: 'https://fundingpips.com/terms-and-conditions'
fieldsUsed:
  - challenges.fundingpips.*.profitTargets / dailyLossPct / maxLossPct / drawdownType / minTradingDays
  - rules.newsTrading
  - rules.weekendHolding
  - rules.payoutFrequency
  - rules.profitSplitPct
  - firms.json FundingPips russiaStatus (unclear)
dataFiles:
  - content/data/challenges/fundingpips.json (1 Step Flex, 2 Step Flex, 2 Step Pro, 2 Step Standard captured 2026-10-20; Zero 2026-10-19)
  - content/data/firms.json (FundingPips rules block captured 2026-10-15; russiaStatus unclear)
  - content/data/russian-fundingpips-access-evidence.json
  - app/ru/fundingpips-pravila/page.tsx (rules re-read 23.10.2026)
---
У FundingPips не одна книга правил, а пять, и программы различаются не столько целями, сколько тем, что происходит на Master-счёте. Правила перечитаны по справке 23.10.2026, цифры программ — по данным на 19–20.10.2026.

- **2 Step Standard** — самый привычный вариант: цели 8% и 5%, дневной лимит 5%, общий 10% статический, минимум 3 торговых дня на первом этапе. Маршрут выплат (60% еженедельно, 80% раз в две недели или 100% по запросу) выбирают при покупке.
- **2 Step Pro** — низкие цели 6% и 6%, но узкие лимиты: 3% в день и 6% всего.
- **1 Step Flex и 2 Step Flex** — общий лимит 12% статический; у 2 Step Flex доля 80% или 95% на выбор при покупке.
- **Zero** — сразу Master, общий лимит 5% подвижный; позиция на выходных или сделка в окне ±10 минут вокруг важной новости закрывает счёт.

Две ловушки касаются четырёх программ с оценкой: на Master без опции Swing (+10% при покупке) позиции закрываются автоматически каждый день, а прибыль сделок в окне ±5 минут вокруг важной новости вычитается. Для всех пяти программ 30 дней без сделок — нарушение.

Там, где источники фирмы расходятся (возврат взноса на 2 Step Standard, цель второго этапа 2 Step Flex), опирайтесь только на письменный ответ поддержки. Статус доступа для резидентов РФ неясен: Россию фирма не называет ни в справке, ни в условиях.
