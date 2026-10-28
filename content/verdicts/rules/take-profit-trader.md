---
slug: take-profit-trader
lang: en
firm: Take Profit Trader
checkedAt: '2026-10-26'
dataAsOf: '2026-10-19'
author: Tara Mohseni
sources:
  - title: 'PRO Account Rules (help centre, updated September 22, 2026; read 2026-10-26)'
    url: 'https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171769361053-PRO-Account-Rules'
  - title: 'Take Profit Trader homepage (PRO "One Time $130 Fee" and "no withdrawal restrictions on your profits above the buffer" read 26 October 2026; daily loss rule "None" for Test/PRO/PRO+ and 50K "Daily Loss Limit $1100 Removed" read 26 October 2026; prices captured 2026-10-19/20)'
    url: 'https://takeprofittrader.com/'
  - title: 'Rule 3: Do Not Hit End Of Day (EOD) Maximum Trailing Drawdown (help centre; read 15 October 2026)'
    url: 'https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170265979165-Rule-3-Do-Not-Hit-End-Of-Day-EOD-Maximum-Trailing-Drawdown'
  - title: 'Rule 5: Be Consistent (help centre; read 15 October 2026)'
    url: 'https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170316538013-Rule-5-Be-Consistent'
fieldsUsed:
  - rules.drawdownType
  - rules.maxLossUsd
  - rules.dailyLossUsd
  - rules.consistencyPct
  - rules.profitSplitPct
  - rules.newsTrading
  - challenges.the-test.accountSizes / profitTargets / minTradingDays / activationFeeUsd / rules.ea
  - challenges.the-test.notes (buffer zone, PRO intraday drawdown, Updated Profit Goal)
dataFiles:
  - 'content/data/firms.json (Take Profit Trader rules block, captured 2026-10-14; fresh reads 2026-10-15)'
  - 'content/data/challenges/take-profit-trader.json (1 product, captured 2026-10-19; key-facts recheck 2026-10-20)'
---
Take Profit Trader's Test is gentle. The 50K costs $170 a month, needs $3,000 in at least 3 trading days, and uses a $2,000 trailing drawdown that only moves on your end-of-day balance. Its 50% consistency rule applies to the Test alone. Breaking it doesn't fail you; TPT raises the goal instead ("Updated Profit Goal = Net P/L x 2").

The rulebook changes when you pass. On a PRO account, the drawdown trails intraday, unrealised profit included. On a 50K PRO, an open trade that reaches +$1,500 lifts your floor to $49,500 at once. Close it at +$500 and you have $1,000 of room, not $2,000. The floor stops at your starting balance, and payouts begin at that same point: TPT pays 80% of profit above a buffer equal to the drawdown, so nothing is withdrawable until a 50K passes $52,000.

PRO also bans bots and automated trading of any kind, requires at least one traded day each calendar week, and makes you flat from one minute before to one minute after FOMC, NFP and CPI. The PRO activation is a one-time $130 fee.

There is no daily loss limit. On 26 October TPT's homepage listed the daily loss rule as "None" for the Test, PRO and PRO+, and the 50K card marked the old $1,100 limit "Removed".

Pick TPT if you trade by hand and can build $2,000 before you need a withdrawal. Skip it if your edge relies on letting open winners run.
