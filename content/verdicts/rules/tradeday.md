---
slug: tradeday
lang: en
firm: TradeDay
checkedAt: '2026-10-26'
dataAsOf: '2026-10-15'
author: Tara Mohseni
sources:
  - title: 'What is Quick Pay? (help centre, modified Wed 9 Sep; read 2026-10-26)'
    url: 'https://tradeday.freshdesk.com/en/support/solutions/articles/103000405228-what-is-quick-pay-'
  - title: 'Fast Pass Funded Sim Payout Policy (help centre; Tracker capture 2026-10-15)'
    url: 'https://tradeday.freshdesk.com/en/support/solutions/articles/103000404096-fast-pass-funded-sim-payout-policy'
  - title: 'Can I trade news or data releases? (help centre; Tracker capture 2026-10-15)'
    url: 'https://tradeday.freshdesk.com/en/support/solutions/articles/103000081072-can-i-trade-news-or-data-releases-'
  - title: 'What is the permitted trading times guideline? (help centre; Tracker capture 2026-10-15)'
    url: 'https://tradeday.freshdesk.com/en/support/solutions/articles/103000018874-what-is-the-permitted-trading-times-guideline-'
fieldsUsed:
  - rules.drawdownType.byProduct
  - rules.maxLossUsd
  - rules.consistencyPct.byProduct
  - rules.profitSplitPct.byProduct
  - rules.payoutFrequency
  - rules.newsTrading
  - rules.weekendHolding
  - challenges.*.fundedDrawdownType / minTradingDays / payoutFirstDays
  - challenges.fast-pass-end-of-day.consistencyRules / notes (payout days)
dataFiles:
  - 'content/data/firms.json (TradeDay rules block, captured 2026-10-14; fresh reads 2026-10-15)'
  - 'content/data/challenges/tradeday.json (3 products, captured 2026-10-14; price recheck 2026-10-20)'
---
TradeDay sells Quick Pay on speed: a payout request after one funded day, a $250 minimum and no buffer. What decides your take-home is the split. Below $4,000 of current profit, Quick Pay pays 50/50. TradeDay's own example: with $6,000 of profit on a 50K, a $3,000 request pays $2,100, because only the first $2,000 sits above the $4,000 line at 80/20.

The second trap is the drawdown. Choosing the End of Day evaluation doesn't carry over: every Quick Pay Funded Sim account trails intraday. TradeDay calculates that line on gross profit, payouts included, so it keeps trailing after you withdraw. At $10,000 of gross profit the account is paused for a Funded Live review, and profit above $10,000 is removed.

Fast Pass is the other route. It pays 80/20 and stays end-of-day trailing once funded. Each payout needs 5 profitable days, and accounts opened from 26 July 2026 must keep any single day at or below 45% of gross profit.

Every evaluation has one risk rule: the trailing maximum drawdown, $1,000 to $4,500 by size. Quick Pay adds 5 minimum days and a 30% consistency cap. TradeDay auto-liquidates open positions 2 minutes before its tier 1 data releases and wants you flat 10 minutes before the close.

Pick Fast Pass if you can bank 5 profitable days before the first payout. Choose Quick Pay only if an early, small withdrawal matters more than the split.
