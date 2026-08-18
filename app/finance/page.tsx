"use client";

import { useEffect, useMemo, useState } from "react";

type TransactionType =
  | "PURCHASE"
  | "SALE"
  | "FEED"
  | "MEDICAL"
  | "EQUIPMENT"
  | "SHIPPING"
  | "OTHER";

type Animal = {
  id: string;
  code: string;
  name: string;
};

type Transaction = {
  id: string;
  type: TransactionType;
  animalId?: string | null;
  animal?: Animal | null;
  amount: string | number;
  date: string;
  description?: string | null;
  notes?: string | null;
};

const typeLabels: Record<TransactionType, string> = {
  PURCHASE: "Mua động vật",
  SALE: "Bán động vật",
  FEED: "Thức ăn",
  MEDICAL: "Thuốc / thú y",
  EQUIPMENT: "Thiết bị",
  SHIPPING: "Vận chuyển",
  OTHER: "Khác",
};

const incomeTypes: TransactionType[] = ["SALE"];

const expenseTypes: TransactionType[] = [
  "PURCHASE",
  "FEED",
  "MEDICAL",
  "EQUIPMENT",
  "SHIPPING",
  "OTHER",
];

function formatMoney(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(d);
}

function todayInput() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const emptyForm = {
  type: "PURCHASE" as TransactionType,
  animalId: "",
  amount: "",
  date: todayInput(),
  description: "",
  notes: "",
};

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");

  async function loadData() {
    try {
      setLoading(true);
      const [txRes, animalRes] = await Promise.all([
        fetch("/api/transactions", { cache: "no-store" }),
        fetch("/api/animals", { cache: "no-store" }),
      ]);

      if (!txRes.ok) throw new Error("Không thể tải dữ liệu tài chính.");

      const txData = await txRes.json();
      const animalData = animalRes.ok ? await animalRes.json() : [];

      setTransactions(Array.isArray(txData) ? txData : []);
      setAnimals(
        Array.isArray(animalData)
          ? animalData.map((a: any) => ({
              id: a.id,
              code: a.code,
              name: a.name,
            }))
          : []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;
      if (incomeTypes.includes(tx.type)) income += amount;
      else expense += amount;
    }

    return { income, expense, profit: income - expense };
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesFlow =
        filter === "ALL" ||
        (filter === "INCOME" && incomeTypes.includes(tx.type)) ||
        (filter === "EXPENSE" && expenseTypes.includes(tx.type));

      const matchesType =
        typeFilter === "ALL" || tx.type === typeFilter;

      return matchesFlow && matchesType;
    });
  }, [transactions, filter, typeFilter]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, date: todayInput() });
    setError("");
    setShowForm(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setForm({
      type: tx.type,
      animalId: tx.animalId || "",
      amount: String(tx.amount ?? ""),
      date: tx.date ? tx.date.slice(0, 10) : todayInput(),
      description: tx.description || "",
      notes: tx.notes || "",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
  }

  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Bạn cần nhập số tiền lớn hơn 0.");
      return;
    }

    if (!form.date) {
      setError("Bạn cần chọn ngày giao dịch.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        editing ? `/api/transactions/${editing.id}` : "/api/transactions",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: form.type,
            animalId: form.animalId || null,
            amount: form.amount,
            date: form.date,
            description: form.description.trim(),
            notes: form.notes.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Không thể lưu giao dịch.");
      }

      closeForm();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu giao dịch.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(tx: Transaction) {
    try {
      const response = await fetch(`/api/transactions/${tx.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || data?.error || "Không thể xóa.");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xóa giao dịch.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9f8] p-6 text-slate-900">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-slate-500">Quản lý trang trại</p>
            <h1 className="mt-1 text-3xl font-bold">💰 Tài chính</h1>
            <p className="mt-1 text-slate-500">
              Theo dõi tiền mua, bán và các chi phí của trang trại.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            + Thêm giao dịch
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <SummaryCard label="Tổng thu" value={formatMoney(totals.income)} icon="📈" />
          <SummaryCard label="Tổng chi" value={formatMoney(totals.expense)} icon="📉" />
          <SummaryCard
            label="Chênh lệch thu - chi"
            value={formatMoney(totals.profit)}
            icon={totals.profit >= 0 ? "💚" : "🔴"}
          />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["ALL", "INCOME", "EXPENSE"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    filter === item
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item === "ALL" ? "Tất cả" : item === "INCOME" ? "Khoản thu" : "Khoản chi"}
                </button>
              ))}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5"
            >
              <option value="ALL">Tất cả loại giao dịch</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-xl font-bold">Lịch sử giao dịch</h2>
              <p className="text-sm text-slate-500">{filtered.length} giao dịch</p>
            </div>
            <button onClick={loadData} className="text-sm font-semibold text-emerald-700 hover:underline">
              Làm mới →
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">Đang tải dữ liệu...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              Chưa có giao dịch phù hợp.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((tx) => {
                const income = incomeTypes.includes(tx.type);
                return (
                  <div key={tx.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${income ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {typeLabels[tx.type]}
                        </span>
                        <span className="text-sm text-slate-400">{formatDate(tx.date)}</span>
                      </div>
                      <h3 className="mt-2 font-semibold">{tx.description || "Không có mô tả"}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {tx.animal ? `${tx.animal.name} (${tx.animal.code})` : "Không gắn với cá thể"}
                      </p>
                      {tx.notes && <p className="mt-1 text-xs text-slate-400">{tx.notes}</p>}
                    </div>

                    <div className="flex items-center gap-4">
                      <strong className={`text-lg ${income ? "text-emerald-700" : "text-red-600"}`}>
                        {income ? "+" : "-"}{formatMoney(tx.amount)}
                      </strong>
                      <button onClick={() => openEdit(tx)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                        ✏️ Sửa
                      </button>
                      <button onClick={() => deleteTransaction(tx)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold">{editing ? "Sửa giao dịch" : "Thêm giao dịch"}</h2>
                <p className="mt-1 text-sm text-slate-500">Ghi nhận một khoản thu hoặc chi.</p>
              </div>
              <button onClick={closeForm} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl">×</button>
            </div>

            <form onSubmit={saveTransaction} className="space-y-5 p-6">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Loại giao dịch *</span>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
                    {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Cá thể liên quan</span>
                  <select value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <option value="">— Không chọn —</option>
                    {animals.map((animal) => (
                      <option key={animal.id} value={animal.id}>{animal.name} ({animal.code})</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Số tiền (đ) *</span>
                  <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Ví dụ: 1200000" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Ngày *</span>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Mô tả</span>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Ví dụ: Mua chuột đông lạnh tháng 8" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Ghi chú</span>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3" />
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold">Hủy</button>
                <button disabled={saving} className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white disabled:opacity-60">
                  {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm giao dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
