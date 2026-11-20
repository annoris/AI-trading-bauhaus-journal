"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Check,
  Clock3,
  Copy,
  MailPlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtShortDate } from "@/lib/utils";

type Invitation = {
  id: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  consumedAt: number | null;
  revokedAt: number | null;
};

type UserAccount = {
  id: string;
  email: string;
  status: "active" | "suspended";
  role: "owner" | "user";
  createdAt: number;
  suspendedAt: number | null;
  activeSessions: number;
};

type IssuedInvitation = { token: string; email: string; expiresAt: number };
type InvitationStatus = "Pending" | "Accepted" | "Revoked" | "Expired";

function invitationStatus(invitation: Invitation, now: number): InvitationStatus {
  if (invitation.consumedAt) return "Accepted";
  if (invitation.revokedAt) return "Revoked";
  if (invitation.expiresAt <= now) return "Expired";
  return "Pending";
}

function StatusBadge({ status }: { status: "Active" | "Deactivated" | InvitationStatus }) {
  const styles: Record<typeof status, string> = {
    Active: "border-brand/25 bg-brand/10 text-brand",
    Deactivated: "border-loss/25 bg-loss/10 text-loss",
    Pending: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Accepted: "border-brand/25 bg-brand/10 text-brand",
    Revoked: "border-border bg-muted text-muted-foreground",
    Expired: "border-border bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={`gap-1.5 rounded-full px-2.5 py-1 ${styles[status]}`}>
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Active" || status === "Accepted"
            ? "bg-brand"
            : status === "Pending"
              ? "bg-amber-500"
              : status === "Deactivated"
                ? "bg-loss"
                : "bg-muted-foreground/60"
        }`}
      />
      {status}
    </Badge>
  );
}

export default function OwnerInvitationsPage() {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [issued, setIssued] = useState<IssuedInvitation | null>(null);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [invitationResponse, userResponse] = await Promise.all([
      fetch("/api/invitations", { cache: "no-store" }),
      fetch("/api/admin/users", { cache: "no-store" }),
    ]);
    const [invitationBody, userBody] = (await Promise.all([
      invitationResponse.json(),
      userResponse.json(),
    ])) as [
      { invitations?: Invitation[]; error?: string },
      { users?: UserAccount[]; error?: string },
    ];
    if (!invitationResponse.ok)
      throw new Error(invitationBody.error || "Could not load invitations.");
    if (!userResponse.ok) throw new Error(userBody.error || "Could not load user accounts.");
    setInvitations(invitationBody.invitations ?? []);
    setUsers(userBody.users ?? []);
  }, []);

  useEffect(() => {
    refresh()
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Access denied."),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const refreshNow = async () => {
    setRefreshing(true);
    setError("");
    try {
      await refresh();
      setMessage("Access records refreshed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh access records.");
    } finally {
      setRefreshing(false);
    }
  };

  const createInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    setMessage("");
    setIssued(null);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ttlHours: 168 }),
      });
      const body = (await response.json()) as IssuedInvitation & { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not create this invitation.");
      setIssued(body);
      setInvitationUrl(
        `${window.location.origin}/accept-invitation?token=${encodeURIComponent(body.token)}`,
      );
      setEmail("");
      setMessage("Invitation created. Share the one-time link only with its intended recipient.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create this invitation.");
    } finally {
      setWorking(false);
    }
  };

  const copyInvitation = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setMessage("Invitation link copied.");
    } catch {
      setError("Clipboard access is unavailable. Copy the link from the field.");
    }
  };

  const revoke = async (invitation: Invitation) => {
    if (!window.confirm(`Revoke the pending invitation for ${invitation.email}?`)) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/invitations?id=${encodeURIComponent(invitation.id)}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not revoke this invitation.");
      setMessage(`Invitation for ${invitation.email} revoked.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke this invitation.");
    } finally {
      setWorking(false);
    }
  };

  const updateUserAccess = async (user: UserAccount) => {
    const action = user.status === "active" ? "suspend" : "reactivate";
    if (
      action === "suspend" &&
      !window.confirm(
        `Deactivate ${user.email}? This will revoke ${user.activeSessions} active session${user.activeSessions === 1 ? "" : "s"} and block future sign-ins until the account is reactivated.`,
      )
    )
      return;

    setWorkingUserId(user.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, action }),
      });
      const body = (await response.json()) as {
        user?: UserAccount;
        revokedSessions?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Could not update account access.");
      setMessage(
        action === "suspend"
          ? `Access deactivated for ${user.email}. ${body.revokedSessions ?? 0} active session(s) revoked.`
          : `Access reactivated for ${user.email}. They can sign in again.`,
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update account access.");
    } finally {
      setWorkingUserId(null);
    }
  };

  const now = Date.now();
  const pendingInvitations = invitations.filter(
    (invitation) => invitationStatus(invitation, now) === "Pending",
  ).length;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const deactivatedUsers = users.filter((user) => user.status === "suspended").length;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredUsers = useMemo(
    () => users.filter((user) => user.email.toLocaleLowerCase().includes(normalizedSearch)),
    [normalizedSearch, users],
  );
  const filteredInvitations = useMemo(
    () =>
      invitations.filter((invitation) =>
        invitation.email.toLocaleLowerCase().includes(normalizedSearch),
      ),
    [invitations, normalizedSearch],
  );

  const metrics = [
    { label: "All accounts", value: users.length, hint: "Invited members", icon: UsersRound },
    { label: "Active", value: activeUsers, hint: "Can sign in", icon: ArrowUpRight },
    { label: "Deactivated", value: deactivatedUsers, hint: "Sign-in blocked", icon: Ban },
    {
      label: "Pending invites",
      value: pendingInvitations,
      hint: "Awaiting acceptance",
      icon: Clock3,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-7 sm:py-8">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            <ShieldCheck className="h-3.5 w-3.5" /> Owner console
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Workspace access</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Invite members and control who can enter the private trading journal. Each member has a
            separate account and journal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3.5 py-2.5 sm:flex">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <div>
              <p className="text-xs font-medium">Owner access</p>
              <p className="text-[11px] text-muted-foreground">Protected</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshNow()}
            disabled={loading || refreshing}
            className="h-10 rounded-xl px-3.5"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-loss/25 bg-loss/5 px-4 py-3 text-sm text-loss"
        >
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && !error && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <section aria-label="Access summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="overflow-hidden rounded-2xl border-border/80">
            <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/15 bg-brand/5 text-brand">
                <Icon className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        id="invite-member"
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]"
      >
        <Card className="overflow-hidden rounded-2xl border-border/80">
          <div className="flex items-start gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/5 text-brand">
              <MailPlus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Invite a member</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Create a private, one-time link that expires in seven days.
              </p>
            </div>
          </div>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <form onSubmit={createInvitation} className="flex flex-col gap-2.5 sm:flex-row">
              <Input
                ref={emailInputRef}
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                aria-label="Member email address"
                required
                className="h-11 rounded-xl"
              />
              <Button type="submit" disabled={working} className="h-11 shrink-0 rounded-xl px-4">
                <MailPlus className="mr-2 h-4 w-4" />
                {working ? "Creating link…" : "Create invitation"}
              </Button>
            </form>
            {issued && (
              <div className="space-y-3 rounded-xl border border-brand/25 bg-brand/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-brand">
                  <ShieldCheck className="h-4 w-4" /> Private invitation for {issued.email}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    readOnly
                    value={invitationUrl}
                    aria-label="Invitation link"
                    className="h-10 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyInvitation()}
                    className="h-10 shrink-0 rounded-lg"
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy link
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-gradient-to-br from-brand/[0.08] via-card to-card">
          <CardContent className="flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Private by design
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">
                Every trader has their own journal.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Member trades, notes, accounts, and settings stay in a separate workspace. You can
                suspend access at any time.
              </p>
            </div>
            <div className="flex items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-brand" />
              <span>Invitation links are shared directly; no email is sent.</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="user-accounts-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="user-accounts-title" className="text-lg font-semibold tracking-tight">
                User accounts
              </h2>
              <Badge variant="secondary" className="rounded-full px-2.5">
                {users.length} total
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Deactivation blocks new sign-ins and revokes active sessions. Reactivated members must
              sign in again.
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search email addresses"
              aria-label="Search accounts and invitations"
              className="h-10 rounded-xl pl-9"
            />
          </label>
        </div>

        <Card className="overflow-hidden rounded-2xl border-border/80">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(120px,0.7fr)_minmax(105px,0.6fr)_minmax(100px,0.7fr)_minmax(150px,auto)] gap-4 border-b border-border/70 bg-muted/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:grid">
            <span>Member</span>
            <span>Access</span>
            <span>Sessions</span>
            <span>Joined</span>
            <span className="text-right">Action</span>
          </div>
          {loading ? (
            <div className="space-y-3 p-5" aria-label="Loading accounts">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-64 animate-pulse rounded bg-muted" />
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center sm:px-8">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-brand/15 bg-brand/5 text-brand">
                <UsersRound className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">No member accounts yet</h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                Send an invitation to give someone access to their own private trading journal.
                Their records will stay separate from yours.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => emailInputRef.current?.focus()}
                className="mt-4 rounded-xl"
              >
                <MailPlus className="mr-2 h-4 w-4" /> Invite first member
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No accounts match “{search}”.
            </p>
          ) : (
            <ul className="divide-y divide-border" role="list">
              {filteredUsers.map((user) => {
                const active = user.status === "active";
                return (
                  <li
                    key={user.id}
                    className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.7fr)_minmax(105px,0.6fr)_minmax(100px,0.7fr)_minmax(150px,auto)] sm:items-center sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.email}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {user.role === "owner" ? "Workspace owner" : "Invited member"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <span className="text-xs text-muted-foreground sm:hidden">Access</span>
                      <StatusBadge status={active ? "Active" : "Deactivated"} />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <span className="text-xs text-muted-foreground sm:hidden">Sessions</span>
                      <p className="text-sm tabular-nums">
                        {user.activeSessions}{" "}
                        <span className="text-xs text-muted-foreground">active</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <span className="text-xs text-muted-foreground sm:hidden">Joined</span>
                      <p className="text-sm text-muted-foreground">
                        {fmtShortDate(user.createdAt)}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      {user.role === "owner" ? (
                        <span className="text-xs text-muted-foreground">Protected owner</span>
                      ) : (
                        <Button
                          variant={active ? "outline" : "default"}
                          size="sm"
                          disabled={workingUserId !== null}
                          onClick={() => void updateUserAccess(user)}
                          className="h-9 w-full rounded-lg sm:w-auto"
                        >
                          {workingUserId === user.id ? (
                            <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : active ? (
                            <ArrowDownRight className="mr-2 h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
                          )}
                          {workingUserId === user.id
                            ? "Saving…"
                            : active
                              ? "Deactivate"
                              : "Reactivate"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="invitation-history-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="invitation-history-title" className="text-lg font-semibold tracking-tight">
                Invitation history
              </h2>
              <Badge variant="secondary" className="rounded-full px-2.5">
                {invitations.length} total
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              One-time links expire after seven days. Revoke any link that should no longer be used.
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Shared by owner
          </span>
        </div>

        <Card className="overflow-hidden rounded-2xl border-border/80">
          {loading ? (
            <div className="space-y-3 p-5" aria-label="Loading invitations">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-64 animate-pulse rounded bg-muted" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="px-5 py-8 text-center sm:px-8">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">No invitations issued</h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                Invitations you create will appear here with their status and expiration date.
              </p>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No invitations match “{search}”.
            </p>
          ) : (
            <ul className="divide-y divide-border" role="list">
              {filteredInvitations.map((invitation) => {
                const status = invitationStatus(invitation, now);
                return (
                  <li
                    key={invitation.id}
                    className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(110px,0.6fr)_minmax(170px,1fr)_auto] sm:items-center sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                        <MailPlus className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{invitation.email}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Created {fmtShortDate(invitation.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <span className="text-xs text-muted-foreground sm:hidden">Status</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {status === "Pending" ? "Expires" : "Valid until"}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {fmtShortDate(invitation.expiresAt)}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      {status === "Pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={working}
                          onClick={() => void revoke(invitation)}
                          className="h-9 w-full rounded-lg text-loss hover:bg-loss/10 hover:text-loss sm:w-auto"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Revoke link
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Access changes take effect immediately.
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5" /> Account data refreshed on request.
        </p>
      </footer>
    </main>
  );
}
