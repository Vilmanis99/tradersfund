---
slug: bright-funded
lang: en
firm: BrightFunded
checkedAt: '2026-10-26'
dataAsOf: '2026-10-14'
author: Tara Mohseni
sources:
  - title: 'BrightFunded 1-Step (help centre, dated May 20, 2026; read 2026-10-26)'
    url: 'https://help.brightfunded.com/en/articles/14284743-brightfunded-1-step'
  - title: 'Can I trade news? (help centre, dated July 2, 2026; read 2026-10-26)'
    url: 'https://help.brightfunded.com/en/articles/9241694-can-i-trade-news'
  - title: >-
      How does my Reward Split work on my Funded Account? (help centre, dated
      March 18, 2026; read 2026-10-26; 14-day cadence stated as both default
      and add-on)
    url: >-
      https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account
  - title: >-
      Does BrightFunded have a consistency rule? (help centre; read 15 October
      2026)
    url: >-
      https://help.brightfunded.com/en/articles/12577176-does-brightfunded-have-a-consistency-rule
  - title: >-
      Dataset norms: prop-firm-statistics (96 products, captured 14–23 October
      2026)
    url: /blog/prop-firm-statistics
fieldsUsed:
  - rules.consistencyPct
  - rules.drawdownType.byProduct
  - rules.maxLossPct
  - rules.newsTrading
  - rules.weekendHolding
  - rules.payoutFrequency
  - >-
    challenges.bright-funded-1-step.maxLossPct / drawdownType / profitTargets /
    dailyLossPct
  - challenges.bright-funded-2-step-bright.maxLossPct / drawdownType
  - >-
    challenges.bright-funded-2-step-classic.maxLossPct / drawdownType /
    dailyLossPct
  - challenges.*.minTradingDays
  - challenges.*.payoutFirstDays
dataFiles:
  - >-
    content/data/challenges/bright-funded.json — Tracker data:
    content/data/challenges/bright-funded.json (3 products, captured 2026-10-20)
  - >-
    content/data/firms.json — Tracker data: content/data/firms.json BrightFunded
    rules block (captured 2026-10-14)
---
BrightFunded's help centre says it does "not currently enforce" a consistency rule. That puts it with the majority. Only 18 of the 57 CFD products in our dataset publish a consistency percentage. The rules that matter here are the drawdown and the clock.

Both 2-Step plans use a static floor, 8% on Bright and 10% on Classic. The 1-Step is the one to read twice. Its 6% maximum drawdown trails your highest equity in real time, floating profit included, and only locks at the starting balance once equity is 6% up. On a $100,000 account, a trade showing +$4,000 lifts the floor to $98,000. If that trade reverses and closes at −$3,500, the account is breached, although you never lost 6% from the start.

Once funded, trades executed within 5 minutes either side of a listed high-impact release lose their profit. That's a soft breach, not a closed account, and take-profits on trades opened at least 48 hours earlier are exempt. Evaluations carry no news limit. The first reward unlocks 30 days after your first funded trade. After that, the same help article says both that you can request "bi-weekly (14 days)" and that 14-day payouts are a paid add-on. Confirm with support before paying for it.

Pick the 2-Step Classic if you hold over weekends (allowed on all three plans) and can wait a month for the first payout. Skip the 1-Step if you let open winners run before banking them.
