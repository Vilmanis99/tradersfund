---
slug: topstep
lang: en
firm: Topstep
checkedAt: '2026-10-26'
dataAsOf: '2026-10-06'
author: Tara Mohseni
sources:
  - title: 'What is the Maximum Loss Limit? (help centre, dated September 18, 2026; read 2026-10-26)'
    url: 'https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit'
  - title: 'Consistency at Topstep (help centre, dated September 17, 2026; read 2026-10-26)'
    url: 'https://help.topstep.com/en/articles/8284208-consistency-at-topstep'
  - title: 'Topstep Payout Policy (help centre, "Updated over a week ago"; read 2026-10-26)'
    url: 'https://help.topstep.com/en/articles/8284233-topstep-payout-policy'
  - title: 'When and What Products Can I Trade? (help centre, dated July 13, 2026; read 2026-10-26)'
    url: 'https://help.topstep.com/en/articles/8284206-when-and-what-products-can-i-trade'
  - title: 'Prohibited Trading Strategies at Topstep (help centre, dated June 10, 2026; read 2026-10-26)'
    url: 'https://help.topstep.com/en/articles/10305426-prohibited-trading-strategies-at-topstep'
  - title: 'Trading Combine Parameters (help centre, dated September 24, 2026; read 2026-10-26)'
    url: 'https://help.topstep.com/en/articles/8284197-trading-combine-parameters'
fieldsUsed:
  - rules.maxLossUsd
  - rules.drawdownType
  - rules.dailyLossUsd
  - rules.consistencyPct
  - rules.payoutFrequency
  - rules.newsTrading
  - rules.weekendHolding
  - challenges.trading-combine-standard-path.consistencyRules / profitTargets
dataFiles:
  - 'content/data/firms.json (Topstep rules block, captured 2026-10-06; fresh reads 2026-10-15)'
  - 'content/data/challenges/topstep.json (2 products, captured 2026-10-20)'
---
Topstep sells the Trading Combine as "one rule and two objectives". The rule is the Maximum Loss Limit: $2,000, $3,000 or $4,500 by size, trailing your end-of-day balance but monitored in real time, open losses included.

The objective that catches people is the 55% Consistency Target. Going over it doesn't fail you. It raises the target. On a 50K, a $1,800 best day turns the $3,000 target into $3,273, and extra profit earned in that same session only lifts it further.

The real trap comes after you pass. The Express Funded Account starts at a $0 balance with the limit at −$2,000 on 50K, and your first payout resets the limit to $0 wherever it stood. After a $1,500 end-of-day high, the floor sits at −$500, so you have $2,000 of room. Request the 50% maximum, $750, and you're left with $750 of room.

To request at all, you need 5 winning days of $150 or more on the Standard path, or 3 trading days with a best day at or below 40% on the Consistency path. Every position must be flat by 3:10 PM CT, so nothing is held overnight or over the weekend. Scheduled news isn't banned outright. What's prohibited is trading your full maximum position size into it.

Pick Topstep if you day-trade and can keep a 50K best day under $1,650. Then follow Topstep's own advice and wait for the balance that puts the limit at $0 before your first payout.
