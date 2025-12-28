"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { UserProfile } from "../../types";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100";
const buttonBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-60";
const primaryButton = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`;
const ghostButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

export default function AdminUserRequestsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .catch(() => setSession(null));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      setError(null);
      if (!session) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }

      setProfileLoading(false);
    };

    void loadProfile();
  }, [session]);

  const loadUsers = async () => {
    if (!profile || profile.role !== "admin" || profile.status !== "approved") return;
    setRequestsLoading(true);
    setError(null);
    const { data, error: usersError } = await supabase
      .from("user_profiles")
      .select("id, email, display_name, role, status, created_at")
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: true });

    if (usersError) {
      setError(usersError.message);
      setRequestsLoading(false);
      return;
    }

    const rows = data ?? [];
    setPendingUsers(rows.filter((user) => user.status === "pending"));
    setApprovedUsers(rows.filter((user) => user.status === "approved"));
    setRequestsLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, [profile]);

  const handleApprove = async (user: UserProfile) => {
    setActionLoadingId(user.id);
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ status: "approved" })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setActionLoadingId(null);
      return;
    }

    setPendingUsers((prev) => prev.filter((item) => item.id !== user.id));
    setApprovedUsers((prev) => [{ ...user, status: "approved" }, ...prev]);
    setMessage("User approved");
    setActionLoadingId(null);
  };

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className={`${cardClass} text-center`}>
          <p className="text-sm text-slate-600">Checking your permissions...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className={`${cardClass} space-y-3 text-center`}>
          <h1 className="text-xl font-semibold text-slate-900">Sign in required</h1>
          <p className="text-sm text-slate-600">
            Please sign in to access the admin approvals panel.
          </p>
        </div>
      </div>
    );
  }

  if (!profile || profile.status !== "approved" || profile.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className={`${cardClass} space-y-3 text-center`}>
          <h1 className="text-xl font-semibold text-slate-900">Admins only</h1>
          <p className="text-sm text-slate-600">
            You need an approved admin account to manage user requests.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">User signup requests</h1>
          <p className="text-sm text-slate-600">
            Review and approve new user accounts before they can access the system.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={ghostButton} onClick={loadUsers} disabled={requestsLoading}>
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className={cardClass}>
        {requestsLoading ? (
          <p className="text-sm text-slate-600">Loading pending requests...</p>
        ) : pendingUsers.length === 0 ? (
          <div className="text-sm text-slate-600">No pending signup requests right now.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.display_name}</p>
                  <p className="text-xs text-slate-600">{user.email}</p>
                  <p className="text-xs text-slate-500">
                    Requested: {user.created_at ? formatDate(user.created_at) : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Pending approval
                  </span>
                  <button
                    className={primaryButton}
                    onClick={() => handleApprove(user)}
                    disabled={actionLoadingId === user.id}
                  >
                    {actionLoadingId === user.id ? "Approving..." : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Approved users</h2>
            <p className="text-sm text-slate-600">
              Active accounts that can sign in and use the system.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {approvedUsers.length} total
          </span>
        </div>

        {requestsLoading ? (
          <p className="text-sm text-slate-600">Loading users...</p>
        ) : approvedUsers.length === 0 ? (
          <div className="text-sm text-slate-600">No approved users yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {approvedUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.display_name}</p>
                  <p className="text-xs text-slate-600">{user.email}</p>
                  <p className="text-xs text-slate-500">
                    Joined: {user.created_at ? formatDate(user.created_at) : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Approved
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {user.role === "admin" ? "Admin" : "User"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

