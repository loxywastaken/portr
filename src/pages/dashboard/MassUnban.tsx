import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, ShieldOff, Trash2, Users } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast';
import { useBanList, useMassUnban } from '@/hooks/useMassUnban';
import { extractApiError } from '@/lib/api';
import type { BanEntry } from '@/types';

export default function MassUnban() {
  const { guildId = '' } = useParams();
  const banListQuery = useBanList(guildId);
  const massUnban = useMassUnban(guildId);
  const toast = useToast();

  const [mode, setMode] = useState<'list' | 'paste'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pastedIds, setPastedIds] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ unbanned: number; failed: number } | null>(null);

  const bans = banListQuery.data?.bans ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bans;
    return bans.filter(
      (b) =>
        b.userId.includes(q) ||
        (b.tag && b.tag.toLowerCase().includes(q)) ||
        (b.reason && b.reason.toLowerCase().includes(q)),
    );
  }, [bans, search]);

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((b) => b.userId)));
    }
  }

  function getUnbanIds(): string[] {
    if (mode === 'list') return [...selected];
    return pastedIds
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{16,20}$/.test(s));
  }

  async function submit() {
    const userIds = getUnbanIds();
    if (userIds.length === 0) {
      toast('No valid user IDs to unban.', 'error');
      return;
    }
    try {
      const res = await massUnban.mutateAsync({ userIds, reason: reason || undefined });
      setResult(res);
      toast(`Unbanned ${res.unbanned} user${res.unbanned !== 1 ? 's' : ''}${res.failed ? ` (${res.failed} failed)` : ''}.`);
      setSelected(new Set());
      setPastedIds('');
    } catch (err) {
      toast(extractApiError(err).message, 'error');
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Mass Unban"
        description="Bulk unban users from this server. Select from the ban list or paste user IDs."
        icon={ShieldOff}
      />

      <div className="mb-4 flex gap-2">
        <Button
          variant={mode === 'list' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('list')}
        >
          <Users className="h-4 w-4" /> Ban list
        </Button>
        <Button
          variant={mode === 'paste' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('paste')}
        >
          Paste IDs
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {mode === 'list' ? (
            <GlassCard className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Banned users</h3>
                  {banListQuery.data && (
                    <Badge variant="default">{banListQuery.data.total}</Badge>
                  )}
                </div>
                <div className="relative max-w-xs flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search bans..."
                    className="w-full pl-9"
                  />
                </div>
              </div>

              {banListQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                <>
                  <button
                    onClick={selectAll}
                    className="mb-3 text-xs text-ink-muted transition hover:text-ink"
                  >
                    {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
                    {selected.size > 0 && ` (${selected.size} selected)`}
                  </button>
                  <div className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
                    {filtered.map((ban: BanEntry) => (
                      <label
                        key={ban.userId}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:bg-white/[0.04]"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(ban.userId)}
                          onChange={() => toggleSelect(ban.userId)}
                          className="h-4 w-4 rounded border-white/20 bg-surface-raised accent-brand-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {ban.tag ?? ban.userId}
                            </span>
                            <code className="text-[11px] text-ink-faint">{ban.userId}</code>
                          </div>
                          {ban.reason && (
                            <p className="mt-0.5 truncate text-xs text-ink-faint">{ban.reason}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-ink-faint">
                  {bans.length === 0 ? 'No bans found in this server.' : `No bans match "${search}".`}
                </p>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-5">
              <h3 className="mb-3 font-semibold">Paste user IDs</h3>
              <p className="mb-3 text-xs text-ink-faint">
                Enter Discord user IDs separated by commas, spaces, or newlines.
              </p>
              <Textarea
                value={pastedIds}
                onChange={(e) => setPastedIds(e.target.value)}
                placeholder={"123456789012345678\n987654321098765432\n..."}
                className="min-h-[200px] font-mono text-xs"
              />
              {pastedIds && (
                <p className="mt-2 text-xs text-ink-muted">
                  {getUnbanIds().length} valid ID{getUnbanIds().length !== 1 ? 's' : ''} detected
                </p>
              )}
            </GlassCard>
          )}
        </div>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <h3 className="mb-3 font-semibold">Unban options</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm text-ink-muted">Reason</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mass unban (optional)"
                />
              </div>
              <Button
                className="w-full"
                variant="danger"
                onClick={submit}
                loading={massUnban.isPending}
                disabled={getUnbanIds().length === 0}
              >
                <Trash2 className="h-4 w-4" /> Unban {getUnbanIds().length} user{getUnbanIds().length !== 1 ? 's' : ''}
              </Button>
              <p className="text-xs text-ink-faint">
                This action cannot be undone. All selected users will be unbanned immediately.
              </p>
            </div>
          </GlassCard>

          {result && (
            <GlassCard className="p-5">
              <h3 className="mb-2 font-semibold">Result</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Unbanned</span>
                  <Badge variant="success">{result.unbanned}</Badge>
                </div>
                {result.failed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Failed</span>
                    <Badge variant="danger">{result.failed}</Badge>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
