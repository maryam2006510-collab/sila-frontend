// src/features/admin/AdminPages.tsx
// Platform administration (D43), one lazy chunk loaded only for admins: users (deactivate,
// KYC, temporary password), listings (suspend and re-activate), "forgot password" requests,
// the security audit log and the coming-soon waitlist. Admin accounts are not editable here:
// they are created on the server only.

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CopyIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Dialog } from '@/components/ui/Dialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Num } from '@/components/ui/Num';
import { Segmented } from '@/components/ui/Segmented';
import { toast } from '@/components/ui/toastStore';
import { api, errorMessage } from '@/lib/api';
import { isolateFigures } from '@/lib/bidi';
import { fmtDateTime, fmtGrams } from '@/lib/formatters';
import { useDebounced } from '@/lib/hooks';
import {
  queryKeys,
  useAdminAudit,
  useAdminInterest,
  useAdminListings,
  useAdminUsers,
  usePasswordRequests,
} from '@/lib/queries';
import type {
  AdminUser,
  AssetListing,
  AuditEntry,
  ListingStatus,
  ListingType,
  PasswordResetRequest,
  ResetRequestStatus,
  UserRole,
} from '@/lib/types';
import { sellerLabel } from '@/lib/status';
import { useT } from '@/i18n';

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const ALL = 'all' as const;
type Filter<T extends string> = T | typeof ALL;
const orUndefined = <T extends string>(v: Filter<T>): T | undefined => (v === ALL ? undefined : v);

const RowList: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <Card padding="normal" className="gap-0 py-1">
    <ul aria-label={label} className="m-0 p-0 list-none divide-y divide-line-subtle">
      {children}
    </ul>
  </Card>
);

const Empty: React.FC<{ message: string }> = ({ message }) => (
  <Card padding="normal" className="items-center text-center">
    <p className="m-0 text-body text-fg-subtle">{message}</p>
  </Card>
);

const Loading: React.FC = () => <div className="h-g3 rounded-md skeleton-loading" aria-hidden="true" />;

const LoadMore: React.FC<{ hasMore: boolean; loading: boolean; onClick: () => void }> = ({
  hasMore,
  loading,
  onClick,
}) => {
  const t = useT();
  if (!hasMore) return null;
  return (
    <Button variant="secondary" size="md" className="self-center" loading={loading} onClick={onClick}>
      {t.admin.loadMore}
    </Button>
  );
};

// Every admin change can move the overview figures too
const useInvalidateAdmin = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.admin });
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const TempPasswordDialog: React.FC<{ result: { name: string; password: string } | null; onClose: () => void }> = ({
  result,
  onClose,
}) => {
  const t = useT();
  const a = t.admin;
  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.password);
      toast.success(a.copied);
    } catch {
      // Clipboard blocked: the password stays on screen for manual copy
    }
  };

  // Not dismissible by a stray click: the password is shown once and never again
  return (
    <Dialog isOpen={Boolean(result)} onClose={onClose} size="sm" title={a.tempTitle} dismissible={false}>
      {result && (
        <div className="flex flex-col gap-5">
          <p className="m-0 text-body text-fg-muted">{a.tempBody(result.name)}</p>
          <div className="flex items-center justify-between gap-3 rounded-sm bg-muted border border-line-subtle px-4 py-3">
            <code dir="ltr" className="num text-h4 font-semibold text-fg select-all">
              {result.password}
            </code>
            <Button variant="secondary" size="md" icon={<CopyIcon size={16} aria-hidden="true" />} onClick={copy}>
              {a.copy}
            </Button>
          </div>
          <Button variant="primary" className="self-end" onClick={onClose}>
            {a.done}
          </Button>
        </div>
      )}
    </Dialog>
  );
};

// Issues a temporary password; shared by the users page and the requests page
const useResetPassword = (onIssued: (r: { name: string; password: string }) => void) => {
  const t = useT();
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (userId: string) => api.admin.resetPassword(userId),
    onSuccess: (out) => {
      invalidate();
      onIssued({ name: out.user.full_name, password: out.temporary_password });
    },
    onError: (err) => toast.danger(t.admin.updateFailed, errorMessage(err, '')),
  });
};

const UserRow: React.FC<{
  user: AdminUser;
  onDeactivate: (u: AdminUser) => void;
  onReset: (u: AdminUser) => void;
  resetting: boolean;
}> = ({ user, onDeactivate, onReset, resetting }) => {
  const t = useT();
  const a = t.admin;
  const invalidate = useInvalidateAdmin();
  const update = useMutation({
    mutationFn: (patch: { is_active?: boolean; kyc_verified?: boolean }) => api.admin.updateUser(user.id, patch),
    onSuccess: () => {
      toast.success(a.updated);
      invalidate();
    },
    onError: (err) => toast.danger(a.updateFailed, errorMessage(err, '')),
  });
  const editable = user.role !== 'admin';

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="m-0 text-body font-semibold text-fg truncate">{user.full_name}</p>
        <p dir="ltr" className="m-0 text-sm text-fg-subtle truncate text-start">
          {user.email}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral" icon={false}>
            {a.roles[user.role]}
          </Badge>
          {!user.is_active && <Badge variant="danger">{a.inactiveBadge}</Badge>}
          {user.role !== 'admin' && (
            <Badge variant={user.kyc_verified ? 'success' : 'warning'}>
              {user.kyc_verified ? a.verified : a.unverified}
            </Badge>
          )}
          {user.is_premium_active && <Badge variant="promoted">Premium</Badge>}
          {user.must_change_password && <Badge variant="info">{a.mustChange}</Badge>}
        </div>
      </div>
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="md"
            loading={update.isPending && update.variables?.kyc_verified !== undefined}
            onClick={() => update.mutate({ kyc_verified: !user.kyc_verified })}
          >
            {user.kyc_verified ? a.unverify : a.verify}
          </Button>
          <Button variant="secondary" size="md" loading={resetting} onClick={() => onReset(user)}>
            {a.resetPassword}
          </Button>
          {user.is_active ? (
            <Button variant="ghost" size="md" onClick={() => onDeactivate(user)}>
              {a.deactivate}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="md"
              loading={update.isPending && update.variables?.is_active !== undefined}
              onClick={() => update.mutate({ is_active: true })}
            >
              {a.activate}
            </Button>
          )}
        </div>
      )}
    </li>
  );
};

export const AdminUsersPage: React.FC = () => {
  const t = useT();
  const a = t.admin;
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Filter<UserRole>>(ALL);
  const q = useDebounced(search.trim());
  const users = useAdminUsers(q, orUndefined(role));
  const invalidate = useInvalidateAdmin();
  const [toDeactivate, setToDeactivate] = useState<AdminUser | null>(null);
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
  const reset = useResetPassword(setIssued);

  const deactivate = useMutation({
    mutationFn: (id: string) => api.admin.updateUser(id, { is_active: false }),
    onSuccess: () => {
      toast.success(a.updated);
      setToDeactivate(null);
      invalidate();
    },
  });

  const rows = users.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1 max-w-g5">
          <Input
            label={a.search}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<MagnifyingGlassIcon size={20} aria-hidden="true" />}
          />
        </div>
        <Segmented
          name="admin-users-role"
          ariaLabel={a.roles.investor}
          options={[
            { value: ALL, label: a.all },
            { value: 'investor' as const, label: a.roles.investor },
            { value: 'seller' as const, label: a.roles.seller },
            { value: 'admin' as const, label: a.roles.admin },
          ]}
          value={role}
          onChange={setRole}
        />
      </div>

      {users.isPending ? (
        <Loading />
      ) : users.isError ? (
        <ErrorState message={a.loadFailed} onRetry={() => users.refetch()} />
      ) : rows.length === 0 ? (
        <Empty message={a.noUsers} />
      ) : (
        <RowList label={t.shell.nav.adminUsers}>
          {rows.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              onDeactivate={setToDeactivate}
              onReset={(target) => reset.mutate(target.id)}
              resetting={reset.isPending && reset.variables === u.id}
            />
          ))}
        </RowList>
      )}
      <LoadMore
        hasMore={Boolean(users.hasNextPage)}
        loading={users.isFetchingNextPage}
        onClick={() => users.fetchNextPage()}
      />

      <Dialog isOpen={Boolean(toDeactivate)} onClose={() => setToDeactivate(null)} size="sm" title={a.deactivateTitle}>
        <div className="flex flex-col gap-5">
          <p className="m-0 text-body text-fg-muted">
            <span className="font-semibold text-fg">{toDeactivate?.full_name}</span>: {a.deactivateBody}
          </p>
          {deactivate.isError && (
            <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
              {isolateFigures(errorMessage(deactivate.error, a.updateFailed))}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setToDeactivate(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              loading={deactivate.isPending}
              onClick={() => toDeactivate && deactivate.mutate(toDeactivate.id)}
            >
              {a.deactivate}
            </Button>
          </div>
        </div>
      </Dialog>

      <TempPasswordDialog result={issued} onClose={() => setIssued(null)} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

const LISTING_BADGE: Record<ListingStatus, BadgeVariant> = {
  active: 'success',
  suspended: 'suspended',
  sold_out: 'soldOut',
  withdrawn: 'neutral',
};

const ListingRow: React.FC<{ listing: AssetListing }> = ({ listing }) => {
  const t = useT();
  const a = t.admin;
  const invalidate = useInvalidateAdmin();
  const queryClient = useQueryClient();
  const moderate = useMutation({
    mutationFn: (status: 'active' | 'suspended') => api.admin.moderateListing(listing.id, status),
    onSuccess: () => {
      toast.success(a.moderated);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (err) => toast.danger(a.updateFailed, errorMessage(err, '')),
  });
  const open = listing.status === 'active' || listing.status === 'suspended';

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <Chip karat={listing.karat} />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="m-0 text-body font-semibold text-fg truncate">{sellerLabel(listing, t.resale.sellerLabel)}</p>
          <p className="m-0 text-sm text-fg-subtle">
            {a.remaining(fmtGrams(listing.available_weight_grams), fmtGrams(listing.total_weight_grams))}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={LISTING_BADGE[listing.status]} icon={false}>
              {a.listingStatus[listing.status]}
            </Badge>
            {listing.listing_type === 'investor_resale' && (
              <Badge variant="info" icon={false}>
                {a.listingTypes.investor_resale}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {open && (
        <Button
          variant="secondary"
          size="md"
          loading={moderate.isPending}
          onClick={() => moderate.mutate(listing.status === 'active' ? 'suspended' : 'active')}
        >
          {listing.status === 'active' ? a.suspend : a.reactivate}
        </Button>
      )}
    </li>
  );
};

export const AdminListingsPage: React.FC = () => {
  const t = useT();
  const a = t.admin;
  const [status, setStatus] = useState<Filter<ListingStatus>>('active');
  const [type, setType] = useState<Filter<ListingType>>(ALL);
  const listings = useAdminListings(orUndefined(status), orUndefined(type));
  const rows = listings.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <Segmented
          name="admin-listings-status"
          ariaLabel={a.listingStatus.active}
          options={[
            { value: ALL, label: a.all },
            ...(['active', 'suspended', 'sold_out', 'withdrawn'] as const).map((s) => ({
              value: s,
              label: a.listingStatus[s],
            })),
          ]}
          value={status}
          onChange={setStatus}
        />
        <Segmented
          name="admin-listings-type"
          ariaLabel={a.listingTypes.seller_listing}
          options={[
            { value: ALL, label: a.all },
            { value: 'seller_listing' as const, label: a.listingTypes.seller_listing },
            { value: 'investor_resale' as const, label: a.listingTypes.investor_resale },
          ]}
          value={type}
          onChange={setType}
        />
      </div>

      {listings.isPending ? (
        <Loading />
      ) : listings.isError ? (
        <ErrorState message={a.loadFailed} onRetry={() => listings.refetch()} />
      ) : rows.length === 0 ? (
        <Empty message={a.noListings} />
      ) : (
        <RowList label={t.shell.nav.adminListings}>
          {rows.map((l) => (
            <ListingRow key={l.id} listing={l} />
          ))}
        </RowList>
      )}
      <LoadMore
        hasMore={Boolean(listings.hasNextPage)}
        loading={listings.isFetchingNextPage}
        onClick={() => listings.fetchNextPage()}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// "Forgot password" requests
// ---------------------------------------------------------------------------

const RequestRow: React.FC<{
  request: PasswordResetRequest;
  onReset: (userId: string) => void;
  resetting: boolean;
}> = ({ request, onReset, resetting }) => {
  const t = useT();
  const a = t.admin;
  const invalidate = useInvalidateAdmin();
  const dismiss = useMutation({
    mutationFn: () => api.admin.dismissPasswordRequest(request.id),
    onSuccess: () => {
      toast.success(a.dismissed);
      invalidate();
    },
    onError: (err) => toast.danger(a.updateFailed, errorMessage(err, '')),
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="m-0 text-body font-semibold text-fg truncate">{request.user_name ?? a.unknownEmail}</p>
        <p dir="ltr" className="m-0 text-sm text-fg-subtle truncate text-start">
          {request.email}
        </p>
        <p className="m-0 text-xs text-fg-subtle">{fmtDateTime(request.created_at)}</p>
      </div>
      {request.status === 'pending' ? (
        <div className="flex flex-wrap gap-2">
          {request.user_id && (
            <Button variant="primary" size="md" loading={resetting} onClick={() => onReset(request.user_id!)}>
              {a.resetPassword}
            </Button>
          )}
          <Button variant="ghost" size="md" loading={dismiss.isPending} onClick={() => dismiss.mutate()}>
            {a.dismiss}
          </Button>
        </div>
      ) : (
        <Badge variant={request.status === 'resolved' ? 'success' : 'neutral'} icon={false}>
          {a.requestStatus[request.status]}
        </Badge>
      )}
    </li>
  );
};

export const AdminPasswordRequestsPage: React.FC = () => {
  const t = useT();
  const a = t.admin;
  const [status, setStatus] = useState<ResetRequestStatus>('pending');
  const requests = usePasswordRequests(status);
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
  const reset = useResetPassword(setIssued);

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        name="admin-requests-status"
        ariaLabel={t.shell.nav.adminRequests}
        options={(['pending', 'resolved', 'dismissed'] as const).map((s) => ({ value: s, label: a.requestStatus[s] }))}
        value={status}
        onChange={setStatus}
      />

      {requests.isPending ? (
        <Loading />
      ) : requests.isError ? (
        <ErrorState message={a.loadFailed} onRetry={() => requests.refetch()} />
      ) : requests.data.length === 0 ? (
        <Empty message={a.noRequests} />
      ) : (
        <RowList label={t.shell.nav.adminRequests}>
          {requests.data.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onReset={(id) => reset.mutate(id)}
              resetting={reset.isPending && reset.variables === r.user_id}
            />
          ))}
        </RowList>
      )}

      <TempPasswordDialog result={issued} onClose={() => setIssued(null)} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Security audit log
// ---------------------------------------------------------------------------

// Event data is shown as plain key: value pairs; nested values as JSON text
const formatValue = (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

const AuditRow: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const t = useT();
  const a = t.admin;
  const details = Object.entries(entry.data);
  const failed = entry.event_type === 'integrity_check_failed';

  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {failed ? (
            <Badge variant="danger">{a.events[entry.event_type] ?? entry.event_type}</Badge>
          ) : (
            <p className="m-0 text-body font-semibold text-fg">{a.events[entry.event_type] ?? entry.event_type}</p>
          )}
        </div>
        <span className="text-sm text-fg-subtle">{fmtDateTime(entry.created_at)}</span>
      </div>
      <dl className="m-0 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-2 min-w-0">
          <dt className="text-fg-subtle">{a.actor}</dt>
          <dd dir="ltr" className="m-0 text-fg-muted truncate">
            {entry.actor_id ?? a.system}
          </dd>
        </div>
        {details.map(([key, value]) => (
          <div key={key} className="flex gap-2 min-w-0">
            <dt dir="ltr" className="text-fg-subtle">
              {key}
            </dt>
            <dd dir="ltr" className="m-0 text-fg-muted truncate">
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
};

export const AdminAuditPage: React.FC = () => {
  const t = useT();
  const a = t.admin;
  const [eventType, setEventType] = useState('');
  const audit = useAdminAudit(eventType);
  const rows = audit.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* One scrolling row on phones, wrapped from tablets */}
      <div
        role="group"
        aria-label={a.eventFilter}
        className="flex md:flex-wrap gap-2 overflow-x-auto md:overflow-visible -mx-5 px-5 md:mx-0 md:px-0"
      >
        <Chip className="shrink-0" selected={eventType === ''} onClick={() => setEventType('')}>
          {a.all}
        </Chip>
        {Object.entries(a.events).map(([type, label]) => (
          <Chip key={type} className="shrink-0" selected={eventType === type} onClick={() => setEventType(type)}>
            {label}
          </Chip>
        ))}
      </div>

      {audit.isPending ? (
        <Loading />
      ) : audit.isError ? (
        <ErrorState message={a.loadFailed} onRetry={() => audit.refetch()} />
      ) : rows.length === 0 ? (
        <Empty message={a.noEvents} />
      ) : (
        <RowList label={t.shell.nav.adminAudit}>
          {rows.map((e) => (
            <AuditRow key={e.id} entry={e} />
          ))}
        </RowList>
      )}
      <LoadMore
        hasMore={Boolean(audit.hasNextPage)}
        loading={audit.isFetchingNextPage}
        onClick={() => audit.fetchNextPage()}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Coming-soon waitlist
// ---------------------------------------------------------------------------

export const AdminInterestPage: React.FC = () => {
  const t = useT();
  const a = t.admin;
  const interest = useAdminInterest();

  if (interest.isPending) return <Loading />;
  if (interest.isError) return <ErrorState message={a.loadFailed} onRetry={() => interest.refetch()} />;
  if (interest.data.length === 0) return <Empty message={a.noInterest} />;

  const count = (cls: 'real_estate' | 'oil') => interest.data.filter((s) => s.asset_class === cls).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        {(['real_estate', 'oil'] as const).map((cls) => (
          <Card key={cls} padding="compact" className="flex-row items-center gap-3">
            <span className="text-body text-fg-muted">{a.assetClass[cls]}</span>
            <span className="text-h4 font-semibold text-fg">
              <Num value={count(cls)} format="plain" />
            </span>
          </Card>
        ))}
      </div>
      <RowList label={a.interestTitle}>
        {interest.data.map((s) => (
          <li key={`${s.asset_class}-${s.email}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span dir="ltr" className="text-body text-fg truncate min-w-0">
              {s.email}
            </span>
            <span className="flex items-center gap-3">
              <Badge variant="neutral" icon={false}>
                {a.assetClass[s.asset_class]}
              </Badge>
              <span className="text-sm text-fg-subtle">{fmtDateTime(s.created_at)}</span>
            </span>
          </li>
        ))}
      </RowList>
    </div>
  );
};
