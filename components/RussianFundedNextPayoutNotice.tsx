import { fundedNextPayoutSource, isFundedNextPayoutSourceFresh } from '@/lib/fundedNextPayout'

export default function RussianFundedNextPayoutNotice() {
  return <p className="ru-source-line" data-russian-fundednext-payout-source={isFundedNextPayoutSourceFresh() ? 'fresh' : 'recapture-required'}>
    <a href={fundedNextPayoutSource.sourceUrl} target="_blank" rel="nofollow noopener">Сроки запроса FundedNext после оценки</a>
    {' '}проверены отдельно: {fundedNextPayoutSource.sourceCapturedAt}. Это не обновление цен и не гарантия зачисления денег.
    {' '}Для Stellar 1-Step источник использует рабочие дни; для Instant действуют другие условия.
    {!isFundedNextPayoutSourceFresh() && ' Эта проверка устарела либо недействительна — подтвердите срок у фирмы.'}
  </p>
}
