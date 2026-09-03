import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, Search } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { PageHeader } from '@/components/common/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuditLog } from '@/hooks/useAuditLog';
import { formatRelativeTime } from '@/lib/utils';

function actionVariant(action: string) {
  if (['ban', 'kick', 'massunban'].includes(action)) return 'danger' as const;
  if (['timeout', 'warn', 'slowmode', 'lock'].includes(action)) return 'warning' as const;
  if (['unban', 'unlock'].includes(action)) return 'success' as const;
  return 'default' as const;
}

export default function AuditLog() {
  const { guildId = '' } = useParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 25;
  const { data, isLoading } = useAuditLog(guildId, page, limit);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filtered = search.trim()
    ? entries.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.action.toLowerCase().includes(q) ||
          e.performedByTag.toLowerCase().includes(q) ||
          (e.targetTag && e.targetTag.toLowerCase().includes(q)) ||
          e.details.toLowerCase().includes(q)
        );
      })
    : entries;

  return (
    <PageTransition>
      <PageHeader
        title="Audit Log"
        description="A full history of every action taken by the bot in this server."
        icon={ClipboardList}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions, users..."
            className="w-full pl-9"
          />
        </div>
        {total > 0 && (
          <span className="text-xs text-ink-faint">{total} entries</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <GlassCard
              key={entry._id}
              className="flex items-center gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                  <span className="text-sm font-medium">{entry.performedByTag}</span>
                  {entry.targetTag && (
                    <>
                      <span className="text-xs text-ink-faint">on</span>
                      <span className="text-sm">{entry.targetTag}</span>
                    </>
                  )}
                </div>
                {entry.details && (
                  <p className="mt-0.5 truncate text-xs text-ink-faint">{entry.details}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-ink-faint">
                {formatRelativeTime(entry.createdAt)}
              </span>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-8 text-center text-sm text-ink-faint">
          {entries.length === 0 ? 'No audit log entries yet.' : `No entries match "${search}".`}
        </GlassCard>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-ink-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </PageTransition>
  );
}
