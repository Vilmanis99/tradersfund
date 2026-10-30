---
slug: maven
lang: en
firm: Maven
checkedAt: '2026-10-27'
dataAsOf: '2026-10-19'
author: Tara Mohseni
sources:
  - title: Maven FAQ (drawdown, news, consistency, payout and EA rules by plan; read 2026-10-27)
    url: 'https://maventrading.com/faqs'
  - title: Maven pricing (plan rules table; read 19 October 2026)
    url: 'https://maventrading.com/pricing'
fieldsUsed:
  - rules.drawdownType.byProduct
  - rules.dailyLossPct.byProduct
  - rules.maxLossPct.byProduct
  - rules.consistencyPct.byProduct
  - rules.newsTrading.byProduct
  - rules.weekendHolding
  - rules.profitSplitPct.byProduct
  - rules.payoutFrequency.byProduct
  - challenges.standard-1-step / standard-2-step / standard-3-step / instant.profitTargets / dailyLossPct / maxLossPct / drawdownType
dataFiles:
  - 'content/data/firms.json (Maven rules block, captured 2026-10-14; evidence 2026-10-15)'
  - 'content/data/challenges/maven.json (9 products, captured 2026-10-19)'
---
Maven's three Standard challenges look like one product at three risk levels. They aren't, because the drawdown type flips between them.

The 1-Step pairs an 8% target with a 5% limit that trails your highest running equity, open profit included. Maven's example: a $10,000 account whose equity touches $11,000 now breaches at $10,450, even if that trade never closed. The 2-Step (8%, then 5%) keeps an 8% floor fixed at the starting balance. The 3-Step asks for 3% per phase inside a 3% static limit and a 2% daily loss.

The daily limit is equity-based on all three. It resets from the higher of balance or equity at 00:00 UTC, so a $300 winner left open overnight on a $10,000 2-Step moves your 4% line to $9,888.

News is the second trap. On the Standard plans you can't open or close a trade from 2 minutes before to 2 minutes after a Red Folder release, take-profits included. During a challenge that is a hard breach; once funded, the profit is removed. EAs are banned on every plan.

None of the Standard plans has a consistency score. Payouts come every 10 business days at an 80% split. Instant Funding trades that for a 3% trailing limit, a 20% consistency score and a 1% cap on floating loss: on $10,000, a $101 open loss breaches.

Pick the 2-Step if you hold winners overnight. Skip the 1-Step unless you close profits quickly.
