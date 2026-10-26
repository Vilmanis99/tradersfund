/**
 * Russia-access data for firms that are not in content/data/firms.json (RU access tables only).
 *
 * Upscale, re-read 2026-10-26 (Prop Firm Tracker; evidence: tradersfundhub/evidence/upscale-russia-2026-10-26/):
 * russiaStatus 'unclear' (was basis 'not-on-restricted-list', FAQ read 2026-10-14). The Terms of Use
 * ("Last updated: 15 May 2026") exclude residents and nationals of any country the US, UK or EU "embargoes goods or
 * imposes similar sanctions" on, and make withdrawals depend on passport KYC that is unavailable to citizens or
 * residents of a jurisdiction ineligible under Section 1. The Terms do not name Russia or Belarus. Russia and Belarus
 * are under broad US/UK/EU sanctions programmes, so the clause may cover them; that is our reasoning, not a quote.
 * The FAQ (same day) still says there are no geographic restrictions and no KYC, which contradicts the Terms.
 * No russiaBasis: 'not-on-restricted-list' requires russiaStatus 'available' (scripts/test-ru-access-basis.mjs).
 *
 * `capturedAt` is deliberately left at 2026-10-14, the date of the superseded FAQ basis that the RU pages still
 * render («Ограничений по странам не заявлено (на …)»); the new evidence date is russiaSourceCapturedAt. Those page
 * strings must be rewritten in the same bundle as this change (see the Upscale handoff, 2026-10-26).
 */
export const RU_EXTRA_RUSSIA_BASIS = {
  upscale: {
    russiaStatus: 'unclear',
    basis: null,
    capturedAt: '2026-10-14',
    sourceUrl: 'https://app.upscale.trade/terms-of-use-upscale.pdf',
    russiaSourceUrl: 'https://app.upscale.trade/terms-of-use-upscale.pdf',
    russiaSourceQuote: 'As a condition to accessing or using the Platform, you represent and warrant that: ... you are not a resident, national, or agent of any country to which the United States, the United Kingdom or the European Union embargoes goods or imposes similar sanctions;',
    russiaSourceCapturedAt: '2026-10-26',
    russiaSourcePageUpdated: '2026-05-15',
    russiaEligibilityClauses: [
      {
        clauseRef: 'Terms of Use section 1 "ELIGIBILITY" (unnumbered bullets), bullet "you are not a resident, national, or agent ..."',
        quote: 'you are not a resident, national, or agent of any country to which the United States, the United Kingdom or the European Union embargoes goods or imposes similar sanctions;',
      },
      {
        clauseRef: 'Terms of Use section 1 "ELIGIBILITY" (unnumbered bullets), bullet "you are not a member of any sanctions list ..."',
        quote: 'you are not a member of any sanctions list or equivalent maintained by the United States government, the United Kingdom government, the European Union, or the United Nations, including without limitation the US Office of Foreign Asset Control Specifically Designated Nationals and Blocked Persons List',
      },
      {
        clauseRef: 'Terms of Use section 1 "ELIGIBILITY" (unnumbered bullets), last bullet (VPN)',
        quote: 'you do not and will not use VPN software, any privacy- or anonymization-enhancing tools or techniques, or any other means to circumvent, or attempt to circumvent, any restrictions that apply to the Platform.',
      },
      {
        clauseRef: 'Terms of Use section 6 "IDENTITY VERIFICATION (KYC) FOR WITHDRAWALS"',
        quote: 'Before a withdrawal can be executed, the User must complete a standard Know Your Customer (“KYC”) identity-verification procedure administered by an accredited third-party provider engaged by the Platform. This procedure requires the submission of a clear copy of the photo page of a valid passport together with a live selfie captured during the verification session. ... The KYC process is unavailable to, and withdrawals will not be processed for, any individual who is a citizen or resident of a jurisdiction designated as ineligible under Section 1 (“ELIGIBILITY”) of these Terms.',
      },
    ],
    russiaSourceNote: "Terms of Use PDF ('Last updated: 15 May 2026'; HTTP Last-Modified 2026-10-01), linked from the upscale.trade footer, read 2026-10-26 08:06 Riga. 'Russia', 'Belarus' and 'Россия' do not occur in the Terms. Status 'unclear', not 'restricted': the Terms exclude US/UK/EU-sanctioned countries in general terms without naming Russia; Russia and Belarus are under broad US/UK/EU sanctions programmes, so they may be covered (our reasoning, not a quote). Conflict: https://upscale.trade/faq (FAQ CMS updatedAt 2026-10-02) says 'No. Upscale requires no KYC, documents or verification of any kind.' and 'There are no geographic restrictions — the platform is available to traders worldwide'; /ru/faq says 'Нет. Upscale не требует KYC, документов и какой-либо верификации.' and 'Географических ограничений нет — платформа доступна трейдерам по всему миру'. The Terms (passport KYC before withdrawal; sanctioned-country exclusion) contradict both. Checkout, KYC and payouts from Russia not tested. Read from the box's egress (Cloudflare, geolocated Riga LV), not a US IP.",
  },
} as const
