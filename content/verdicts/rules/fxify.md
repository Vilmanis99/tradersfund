---
slug: fxify
lang: en
firm: FXIFY
checkedAt: '2026-10-27'
dataAsOf: '2026-10-20'
author: Tara Mohseni
sources:
  - title: The 2-Phase Standard Account (FXIFY help centre, dated 6 May 2026; read 2026-10-27)
    url: 'https://intercom.help/fxify/en/articles/14834571-the-2-phase-standard-account'
  - title: The 2-Phase Classic Account (FXIFY help centre, dated 6 May 2026; read 2026-10-27)
    url: 'https://intercom.help/fxify/en/articles/14834680-the-2-phase-classic-account'
  - title: FXIFY Two Phase program page (payouts, add-ons; read 2026-10-27)
    url: 'https://fxify.com/programs/two-phase/'
  - title: FXIFY Instant Funding program page (Tracker capture 2026-10-20)
    url: 'https://fxify.com/programs/instant-funding/'
  - title: FXIFY Lightning Challenge program page (Tracker capture 2026-10-20)
    url: 'https://fxify.com/programs/lightning-challenge/'
fieldsUsed:
  - rules.drawdownType.byProduct
  - rules.dailyLossPct.byProduct
  - rules.maxLossPct.byProduct
  - rules.consistencyPct.byProduct
  - rules.newsTrading.byProduct
  - rules.weekendHolding.byProduct
  - rules.profitSplitPct.byProduct
  - rules.payoutFrequency.byProduct
  - challenges.two-phase-standard / two-phase-classic.profitTargets / drawdownType / consistencyRules
  - challenges.instant-funding-* / lightning-challenge / crypto-*.maxLossPct / rules.ea / rules.news
dataFiles:
  - 'content/data/firms.json (FXIFY rules block, captured 2026-10-14; evidence 2026-10-15/20)'
  - 'content/data/challenges/fxify.json (10 products, captured 2026-10-14; recheck 2026-10-20)'
---
Two of FXIFY's Two Phase accounts share a 10% maximum loss and a 4% daily limit. They are not the same account.

On the Standard, the 10% trails your high-water mark. FXIFY's example: on $100,000, a balance of $110,000 lifts the breach level to $100,000. Your first payout locks the floor at the starting balance, so withdrawing $10,000 from $112,000 leaves a $2,000 buffer. On the Classic, the floor stays at $90,000 however far you grow.

The Classic pays for that floor with a 25% consistency rule once funded. FXIFY's example: a $160 best day means $640 of total profit before a withdrawal. The Standard has no consistency rule, and its targets run the other way: 10% then 5%, against the Classic's 5% then 10%.

EAs need prior approval and are banned on DXTrade. News and weekend holds are allowed on both.

Payouts are where FXIFY's own pages disagree. The program page says the first payout is on demand, then monthly, or every two weeks with a paid add-on, at 80% or 90% with the split upgrade. The Classic help article instead offers 80% every 14 days or 100% every 30. Ask support which applies before you pay.

The Instant, Lightning and crypto accounts are a different rulebook: maximum losses of 4% to 8%, a 5-minute news blackout and no EAs.

Choose the Classic if you take profits in steady pieces. Pick the Standard if one big day usually makes your month.
