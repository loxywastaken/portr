import { useParams } from 'react-router-dom';
import { Check, Crown, ExternalLink } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { usePremium, useSetPremium } from '@/hooks/useFeatures';
import { extractApiError } from '@/lib/api';
import { HOW_TO_BUY, PAYPAL_URL, PREMIUM_PERKS, PREMIUM_PRICE } from '@/lib/premium';
import { formatRelativeTime } from '@/lib/utils';

export default function Premium() {
  const { guildId = '' } = useParams();
  const { data, isLoading } = usePremium(guildId);
  const setPremium = useSetPremium(guildId);
  const toast = useToast();

  const toggle = async (on: boolean) => {
    if (!on && !window.confirm('Remove Premium from this server? Premium-only settings stop working until it is turned on again.')) return;
    try {
      await setPremium.mutateAsync(on);
      toast(on ? 'Premium is on for this server' : 'Premium removed from this server');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  };

  return (
    <PageTransition>
      <PageHeader title="Premium" description={`Unlock the best of Nexus for ${PREMIUM_PRICE}.`} icon={Crown} />

      {isLoading || !data ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <GlassCard className="mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-medium">
              <span className={`h-2 w-2 rounded-full ${data.serverPremium ? 'bg-amber-300' : 'bg-ink-faint'}`} />
              {data.serverPremium ? 'This server has Premium' : 'This server is on the free plan'}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {data.serverPremium
                ? `Turned on by ${data.activatedByYou ? 'you' : data.activatedByName ?? 'a premium member'}${
                    data.activatedAt ? ` ${formatRelativeTime(data.activatedAt)}` : ''
                  }.`
                : data.userPremium
                  ? `You have Premium. You're using ${data.slotsUsed} of ${data.slotsMax} Premium servers.`
                  : 'Get Premium, then turn it on here.'}
            </p>
          </div>
          <div className="flex gap-2">
            {data.serverPremium && data.activatedByYou && (
              <Button variant="ghost" onClick={() => toggle(false)} loading={setPremium.isPending}>
                Remove from this server
              </Button>
            )}
            {!data.serverPremium && data.userPremium && (
              <Button onClick={() => toggle(true)} loading={setPremium.isPending} disabled={data.slotsUsed >= data.slotsMax}>
                <Crown className="h-4 w-4" /> Turn on Premium here
              </Button>
            )}
            {!data.serverPremium && !data.userPremium && (
              <a href={PAYPAL_URL} target="_blank" rel="noreferrer">
                <Button>
                  Get Premium · {PREMIUM_PRICE} <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
          </div>
        </GlassCard>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <GlassCard className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-ink-faint">
                <th className="px-5 py-3 font-medium">Feature</th>
                <th className="px-5 py-3 font-medium">Free</th>
                <th className="px-5 py-3 font-medium text-amber-300">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PREMIUM_PERKS.map((p) => (
                <tr key={p.title}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <p.icon className="h-4 w-4 text-ink-muted" /> {p.title}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-faint">{p.description}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{p.free}</td>
                  <td className="whitespace-nowrap px-5 py-3">{p.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>

        <section>
          <h2 className="mb-3 text-sm font-semibold">How to get it</h2>
          <GlassCard className="p-5">
            <ol className="space-y-3 text-sm">
              {HOW_TO_BUY.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[11px]">{i + 1}</span>
                  <span className="text-ink-muted">{step}</span>
                </li>
              ))}
            </ol>
            <a href={PAYPAL_URL} target="_blank" rel="noreferrer" className="mt-5 block">
              <Button className="w-full">
                Pay {PREMIUM_PRICE} with PayPal <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
              <Check className="h-3.5 w-3.5" /> One payment, works on 2 servers.
            </p>
          </GlassCard>
        </section>
      </div>
    </PageTransition>
  );
}
