# Programme platform verification — September 8, 2026

This is internal research, not a new SEO page. The finder deliberately has no platform filter until its matrix can distinguish programme, account size and profile. These checks do not refresh challenge prices or their capture dates.

| Firm | First-party finding | Boundary before implementation |
| --- | --- | --- |
| FundedNext | Its [general platform article](https://help.fundednext.com/en/articles/8019808-which-platforms-can-i-use-for-trading-at-fundednext) lists MT4, MT5, cTrader and Match-Trader; TradingView is analysis-only. It restricts $100K/$200K purchases and changes on cTrader/Match-Trader, with a U.S. Match-Trader exception. | Do not project this firm list onto every Stellar product. A platform choice can also change the checkout fee. |
| FundedNext Instant | The [Instant-specific article](https://help.fundednext.com/en/articles/11641140-which-trading-platforms-are-available-for-the-stellar-instant-account) names MT4/MT5 and says U.S.-based traders only get Match-Trader. | Do not label Instant cTrader-compatible. These are CFD configurations, not Futures. |
| Bright Funded | Its [platform article](https://help.brightfunded.com/en/articles/10855521-what-trading-platform-does-brightfunded-offer) lists DXTrade, cTrader and MT5. It restricts MT5 for U.S./UAE citizenship, residency or location, and cTrader for the U.S. profile. | The captured page does not establish every programme/tier combination or a zero platform surcharge. The aggregate MT5/TradeLocker field in firms.json is not reliable platform evidence. |
| FTMO | Its [CFD FAQ](https://ftmo.com/en/faq/which-platforms-can-i-use-for-trading/) explicitly names both Challenge 1-Step and 2-Step with MT4, MT5, cTrader and TradingView. | Programme-level evidence exists, but this is not universal country/KYC eligibility or evidence for FTMO Futures. |
| FundingPips | The official [Account Workspace](https://help.fundingpips.com/hc/en-us/articles/43468639481105-Account-Workspace) search result lists MT5, cTrader and Match-Trader. The [Zero](https://help.fundingpips.com/hc/en-us/articles/34502157694865-FundingPips-Zero) result makes swap-free an MT5-only add-on. | Discovery only in this pass: read full product pages and checkout limitations before creating a filter matrix. Add-on compatibility must not be mistaken for base programme availability. |

Existing evidence files `russian-fundednext-mt5-evidence.json` and `russian-ctrader-evidence.json` contain separately dated fee, automation and U.S. exceptions. Preserve their dates until those exact sources are checked again.

Next implementation must keep platform evidence separately dated from price evidence; distinguish unknown from unavailable; never treat a language or a headquarters address as trader eligibility; and show any verified platform surcharge before presenting an all-in cost. U.S.-specific prices must not be inferred from global prices.
