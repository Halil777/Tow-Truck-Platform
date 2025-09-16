import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, suspendUser, unsuspendUser, type User } from "../api/client";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";

export default function Users() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const [search, setSearch] = React.useState("");
  const [onlySuspended, setOnlySuspended] = React.useState(false);

  const suspendMut = useMutation({
    mutationFn: (id: number) => suspendUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const unsuspendMut = useMutation({
    mutationFn: (id: number) => unsuspendUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const filtered = (data || []).filter((u) => {
    if (onlySuspended && !u.suspended) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase();
    return (
      name.includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.telegramId || "").toLowerCase().includes(q)
    );
  });

  const total = data?.length || 0;
  const suspendedCount = (data || []).filter((u) => u.suspended).length;
  const newThisWeek = (data || []).filter((u) => {
    if (!u.createdAt) return false;
    const d = new Date(u.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;

  const exportCsv = () => {
    const header = ["id", "telegramId", "firstName", "lastName", "username", "phone", "suspended", "createdAt"];
    const rows = filtered.map((u) => [u.id, u.telegramId || "", u.firstName || "", u.lastName || "", u.username || "", u.phone || "", u.suspended ? "1" : "0", u.createdAt || ""]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack">
      <h2>{t("users") || "Registered Users"}</h2>

      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <Card title="Total Users"><h2>{total}</h2></Card>
        <Card title="Suspended"><h2>{suspendedCount}</h2></Card>
        <Card title="New (7d)"><h2>{newThisWeek}</h2></Card>
      </div>

      <Card>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 8 }}>
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={onlySuspended} onChange={(e) => setOnlySuspended(e.target.checked)} />
              <span className="muted">Suspended only</span>
            </label>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading && <div className="muted">Loading...</div>}
        {isError && <div className="muted">Failed to load users</div>}
        {!isLoading && !isError && (
          <Table
            data={filtered as any}
            pageSize={12}
            columns={[
              { header: "ID", key: "id" },
              { header: "Name", key: "firstName", render: (u: any) => [u.firstName, u.lastName].filter(Boolean).join(" ") || "-" },
              { header: "Username", key: "username" },
              { header: "Phone", key: "phone" },
              { header: "Telegram", key: "telegramId" },
              { header: "Role", key: "role" },
              { header: "Status", key: "suspended", render: (u: any) => (u.suspended ? <Badge color="red">Suspended</Badge> : <Badge color="green">Active</Badge>) },
              { header: "Created", key: "createdAt", render: (u: any) => (u.createdAt ? new Date(u.createdAt).toLocaleString() : "-") },
              { header: "Actions", key: "actions", render: (u: any) => (u.suspended ? <button className="primary" onClick={() => unsuspendMut.mutate(u.id)} disabled={unsuspendMut.isPending}>Unsuspend</button> : <button onClick={() => suspendMut.mutate(u.id)} disabled={suspendMut.isPending}>Suspend</button>) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
