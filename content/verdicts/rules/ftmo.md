---
slug: ftmo
lang: en
firm: FTMO
checkedAt: '2026-10-26'
dataAsOf: '2026-10-15'
author: Tara Mohseni
sources:
  - title: FTMO Trading Objectives (last updated 20 October 2026; read 26 October 2026)
    url: 'https://ftmo.com/en/trading-objectives/'
  - title: >-
      How do I withdraw my profits? (FTMO FAQ; read 20 October 2026; last
      updated 13 October 2026)
    url: 'https://ftmo.com/en/faq/how-do-i-withdraw-my-profits/'
  - title: >-
      FTMO 2-Step Challenge (news, overnight and weekend restrictions by account
      type; read 15 October 2026)
    url: 'https://ftmo.com/en/2-step-challenge/'
fieldsUsed:
  - rules.drawdownType.byProduct
  - rules.dailyLossPct
  - rules.maxLossPct
  - rules.consistencyPct
  - rules.profitSplitPct
  - rules.payoutFrequency
  - rules.newsTrading
  - rules.weekendHolding
  - >-
    challenges.ftmo-challenge-2-step.profitTargets / minTradingDays /
    drawdownType
  - >-
    challenges.ftmo-challenge-1-step.drawdownType / consistencyRulePct /
    dailyLossPct
  - challenges.ftmo-instant-account.drawdownType / consistencyRulePct
dataFiles:
  - >-
    content/data/challenges/ftmo.json — Tracker data:
    content/data/challenges/ftmo.json (2-Step and 1-Step captured 2026-10-20,
    Instant Account 2026-10-21)
  - >-
    content/data/firms.json — Tracker data: content/data/firms.json FTMO rules
    block (captured 2026-10-14, evidence 2026-10-15/20)
---
FTMO's rules get treated as the industry template. Since 12 October 2026 the firm runs three different rulebooks, and only one of them behaves like the template.

That one is the 2-Step. Targets are 10% then 5%, with a 5% daily loss and a 10% maximum loss that never moves from the starting balance. Each phase needs 4 trading days, and FTMO's Trading Objectives page lists no consistency or Best Day rule for it. Treat it as the baseline.

The 1-Step swaps the static floor for an end-of-day trailing one and adds a consistency rule for orders placed from 12 October. Your best day may be at most 50% of total profit, both to pass and to be paid. FTMO's own example: a $6,000 best day inside $10,000 of profit is 60%, so you keep trading until total profit reaches $12,000. Missing it isn't a breach, only a delay.

The Instant Account hides the real trap. Its 10% trailing limit follows your closed balance and does not reset when you withdraw. Once the balance passes 110% of the starting capital, FTMO warns that taking a Reward would breach the limit. Consistency there is 30%.

Payouts are on demand from the 14th day after your first trade. News limits apply only to Standard-type funded accounts.

Pick the 2-Step unless one big day usually makes your month. Read the Instant withdrawal clause first.
