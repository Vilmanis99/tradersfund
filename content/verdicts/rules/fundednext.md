---
slug: fundednext
lang: en
firm: FundedNext
checkedAt: '2026-10-26'
dataAsOf: '2026-10-19'
author: Tara Mohseni
sources:
  - title: >-
      Is News Trading Allowed at FundedNext? (help centre, last updated
      8 September 2026; read 26 October 2026)
    url: >-
      https://help.fundednext.com/en/articles/10701447-is-news-trading-allowed-at-fundednext
  - title: >-
      What are the Risk Limits on a FundedNext Account? (help centre,
      last updated 6 July 2026; read 26 October 2026)
    url: >-
      https://help.fundednext.com/en/articles/14702245-what-are-the-risk-limits-on-a-fundednext-account
  - title: >-
      How often will I receive my Performance Reward? (help centre, last updated
      16 October 2026; read 26 October 2026)
    url: >-
      https://help.fundednext.com/en/articles/10701585-how-often-will-i-receive-my-performance-reward
  - title: >-
      Stellar 2-Step (rules table incl. 'Max Risk 3% At any time', 'News Trading
      Profit 40%'; read 2026-10-26)
    url: 'https://fundednext.com/cfds/stellar-2-step'
fieldsUsed:
  - rules.newsTrading
  - rules.drawdownType.byProduct
  - rules.payoutFrequency
  - rules.weekendHolding
  - >-
    challenges.stellar-2-step.dailyLossPct / maxLossPct / drawdownType /
    payoutFirstDays / refundable
  - challenges.stellar-1-step.dailyLossPct / maxLossPct / payoutFirstDays
  - challenges.stellar-lite.dailyLossPct / maxLossPct / payoutFirstDays
  - challenges.stellar-instant.maxLossPct / drawdownType
  - >-
    funded 3% open-risk cap: stated on the primary sources above (help article
    14702245 and the Stellar 2-Step rules table, both read 2026-10-26); not in
    this branch's data files (Tracker 085b2fb is unmerged)
dataFiles:
  - >-
    content/data/challenges/fundednext.json — Tracker data:
    content/data/challenges/fundednext.json (4 products, captured 2026-10-19,
    rechecked 2026-10-20)
  - >-
    content/data/firms.json — Tracker data: content/data/firms.json FundedNext
    rules block (captured 2026-10-15; news evidence 2026-10-22)
---
"News trading allowed," says the Stellar 2-Step page. It is, during the Challenge. On a funded Stellar 1-Step, 2-Step or Lite account, profitable trades executed within 5 minutes either side of a listed high-impact release count at 40%, and losses count in full. A $3,000 news win adds $1,200.

The rule that does more damage sits in one line of the rules table: "Max Risk 3% At any time". FundedNext's help centre defines it as stop-loss exposure plus realised and floating losses across all open trades, measured against the initial balance. On a $100,000 funded account that's $3,000 at risk in total, not per trade. A first breach forfeits the profit from those trades. A second permanently cuts the account to 1%.

Outside those two funded-stage rules, the evaluations are conventional. All three use a static floor: 5%/10% on the 2-Step, 3%/6% on the 1-Step and 4%/8% on Lite. Instant is the only product with a trailing 6% limit. The 2-Step refunds the fee with the first reward but makes you wait 21 days for it. The 1-Step pays every 5 business days and refunds with the third reward.

Skip FundedNext unless you already trade with a stop on every position and keep combined risk under 3%. If you do, the 1-Step's payout pace is the reason to choose it.
