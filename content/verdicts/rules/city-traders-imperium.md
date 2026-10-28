---
slug: city-traders-imperium
lang: en
firm: City Traders Imperium
checkedAt: '2026-10-27'
dataAsOf: '2026-10-20'
author: Tara Mohseni
sources:
  - title: CTI 1-Step Challenge (rules, trailing drawdown FAQ, VIP payouts; read 2026-10-27)
    url: 'https://citytradersimperium.com/1-step-challenge/'
  - title: CTI 2-Step Challenge (static and daily drawdown, EA and Martingale rules; read 2026-10-27)
    url: 'https://citytradersimperium.com/2-step-challenge/'
  - title: CTI Instant Funding (50% starting balance, 6% static drawdown; read 2026-10-27)
    url: 'https://citytradersimperium.com/instant-funding/'
  - title: CTI Direct Funding (70% split, on-demand payouts from day 5, no consistency rule; read 2026-10-27)
    url: 'https://citytradersimperium.com/direct-funding/'
fieldsUsed:
  - rules.drawdownType.byProduct
  - rules.dailyLossPct.byProduct
  - rules.maxLossPct.byProduct
  - rules.consistencyPct
  - rules.newsTrading
  - rules.weekendHolding
  - rules.profitSplitPct.byProduct
  - rules.payoutFrequency.byProduct
  - challenges.*.profitTargets / minTradingDays / payoutFirstDays / rules.ea
dataFiles:
  - 'content/data/firms.json (City Traders Imperium rules block, captured 2026-10-14; evidence 2026-10-15/20)'
  - 'content/data/challenges/city-traders-imperium.json (4 products, captured 2026-10-14; recheck 2026-10-20)'
---
The CTI 1-Step markets "no daily drawdown", an 8% target and only 3 profitable days to pass. All true. The rule that decides it is the 5% trailing drawdown.

CTI sets that floor at your highest balance minus a fixed 5% of the starting balance. On a $100,000 account, close at $104,000 and the floor moves from $95,000 to $99,000. Withdrawals don't change the calculation, and CTI measures it on balance, not equity.

The 2-Step is the static option: 10% then 5%, a 10% floor fixed at the initial balance and a 5% daily limit. It allows personal EAs only and bans Martingale. The 1-Step is the only CTI plan that allows both, third-party EAs included.

Instant Funding needs the slowest read. You start on half the account size at a 50% split, and the 6% static drawdown sits on that starting balance: CTI's $80,000 plan lists $2,400 of maximum drawdown. Direct Funding gives you the full balance, a 70% split and on-demand payouts from day 5.

News and weekend holds are allowed on all four. The challenges pay a first payout after 7 days but publish no baseline frequency after that; weekly payouts arrive with the Bronze VIP tier.

Pick the 2-Step if you bank winners as they come and don't need EAs. Choose the 1-Step if you run third-party EAs or Martingale, and size every trade off the moving floor.
