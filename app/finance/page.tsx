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
  purchasePrice?: string | number | null;
  salePrice?: string | number | null;
  status?: string | null;
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

function formatMoney(
  value: number | string | null | undefined
) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  return (
    new Intl.NumberFormat("vi-VN").format(n) +
    " đ"
  );
}

function formatDate(value: string) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN"
  ).format(d);
}

function todayInput() {
  const d = new Date();

  const local = new Date(
    d.getTime() -
      d.getTimezoneOffset() * 60000
  );

  return local
    .toISOString()
    .slice(0, 10);
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
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [animals, setAnimals] =
    useState<Animal[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [editing, setEditing] =
    useState<Transaction | null>(null);

  const [form, setForm] =
    useState(emptyForm);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<
      "ALL" | "INCOME" | "EXPENSE"
    >("ALL");

  const [typeFilter, setTypeFilter] =
    useState<
      "ALL" | TransactionType
    >("ALL");

  async function loadData(
    showLoading = true
  ) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const [
        txRes,
        animalRes,
      ] = await Promise.all([
        fetch(
          "/api/transactions",
          {
            cache: "no-store",
          }
        ),

        fetch(
          "/api/animals",
          {
            cache: "no-store",
          }
        ),
      ]);

      if (!txRes.ok) {
        throw new Error(
          "Không thể tải dữ liệu tài chính."
        );
      }

      const txData =
        await txRes.json();

      const animalData =
        animalRes.ok
          ? await animalRes.json()
          : [];

      setTransactions(
        Array.isArray(txData)
          ? txData
          : []
      );

      setAnimals(
        Array.isArray(animalData)
          ? animalData.map(
              (a: any) => ({
                id: a.id,
                code: a.code,
                name: a.name,
                purchasePrice:
                  a.purchasePrice ??
                  null,
                salePrice:
                  a.salePrice ??
                  null,
                status:
                  a.status ??
                  null,
              })
            )
          : []
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể tải dữ liệu."
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function refreshDataSilently() {
    const scrollY =
      typeof window !==
      "undefined"
        ? window.scrollY
        : 0;

    await loadData(false);

    if (
      typeof window !==
      "undefined"
    ) {
      requestAnimationFrame(
        () => {
          window.scrollTo({
            top: scrollY,
            behavior: "auto",
          });
        }
      );
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
   * GIÁ TRỊ ĐÀN
   */

  const animalTotals =
    useMemo(() => {
      let purchaseValue = 0;
      let expectedSaleValue = 0;
      let expectedProfit = 0;
      let soldRevenue = 0;
      let realizedProfit = 0;

      let animalsWithPrices = 0;
      let soldAnimals = 0;

      for (const animal of animals) {
        const purchase =
          Number(
            animal.purchasePrice
          ) || 0;

        const sale =
          Number(
            animal.salePrice
          ) || 0;

        if (
          purchase > 0 ||
          sale > 0
        ) {
          animalsWithPrices += 1;
        }

        purchaseValue += purchase;

        if (
          animal.status ===
          "SOLD"
        ) {
          soldAnimals += 1;

          soldRevenue += sale;

          realizedProfit +=
            sale - purchase;
        } else {
          expectedSaleValue +=
            sale;

          expectedProfit +=
            sale - purchase;
        }
      }

      return {
        purchaseValue,
        expectedSaleValue,
        expectedProfit,
        soldRevenue,
        realizedProfit,
        animalsWithPrices,
        soldAnimals,
      };
    }, [animals]);

  /*
   * TỔNG THU CHI
   */

  const totals =
    useMemo(() => {
      let income = 0;
      let expense = 0;

      for (const tx of transactions) {
        const amount =
          Number(tx.amount) || 0;

        if (
          incomeTypes.includes(
            tx.type
          )
        ) {
          income += amount;
        } else {
          expense += amount;
        }
      }

      /*
       * Giá mua tự động tính vào tổng chi.
       */

      const transactionPurchaseAnimalIds =
        new Set(
          transactions
            .filter(
              (tx) =>
                tx.type ===
                  "PURCHASE" &&
                Boolean(
                  tx.animalId
                )
            )
            .map(
              (tx) =>
                tx.animalId as string
            )
        );

      for (const animal of animals) {
        if (
          !transactionPurchaseAnimalIds.has(
            animal.id
          )
        ) {
          expense +=
            Number(
              animal.purchasePrice
            ) || 0;
        }
      }

      /*
       * Giá bán tự động tính vào tổng thu
       * khi trạng thái = SOLD.
       */

      const transactionSaleAnimalIds =
        new Set(
          transactions
            .filter(
              (tx) =>
                tx.type ===
                  "SALE" &&
                Boolean(
                  tx.animalId
                )
            )
            .map(
              (tx) =>
                tx.animalId as string
            )
        );

      for (const animal of animals) {
        if (
          animal.status ===
            "SOLD" &&
          !transactionSaleAnimalIds.has(
            animal.id
          )
        ) {
          income +=
            Number(
              animal.salePrice
            ) || 0;
        }
      }

      return {
        income,
        expense,
        profit:
          income - expense,
      };
    }, [
      transactions,
      animals,
    ]);

  /*
   * LỌC GIAO DỊCH
   */

  const filtered =
    useMemo(() => {
      return transactions.filter(
        (tx) => {
          const matchesFlow =
            filter === "ALL" ||
            (filter ===
              "INCOME" &&
              incomeTypes.includes(
                tx.type
              )) ||
            (filter ===
              "EXPENSE" &&
              expenseTypes.includes(
                tx.type
              ));

          const matchesType =
            typeFilter ===
              "ALL" ||
            tx.type ===
              typeFilter;

          return (
            matchesFlow &&
            matchesType
          );
        }
      );
    }, [
      transactions,
      filter,
      typeFilter,
    ]);

  /*
   * FORM
   */

  function openAdd() {
    setEditing(null);

    setForm({
      ...emptyForm,
      date: todayInput(),
    });

    setError("");
    setShowForm(true);
  }

  function openEdit(
    tx: Transaction
  ) {
    setEditing(tx);

    setForm({
      type: tx.type,

      animalId:
        tx.animalId || "",

      amount: String(
        tx.amount ?? ""
      ),

      date: tx.date
        ? tx.date.slice(0, 10)
        : todayInput(),

      description:
        tx.description || "",

      notes:
        tx.notes || "",
    });

    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditing(null);

    setForm({
      ...emptyForm,
    });

    setError("");
  }

  /*
   * LƯU
   */

  async function saveTransaction(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError(
        "Bạn cần nhập số tiền lớn hơn 0."
      );

      return;
    }

    if (!form.date) {
      setError(
        "Bạn cần chọn ngày giao dịch."
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          editing
            ? `/api/transactions/${editing.id}`
            : "/api/transactions",
          {
            method:
              editing
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              type: form.type,

              animalId:
                form.animalId ||
                null,

              amount:
                form.amount,

              date:
                form.date,

              description:
                form.description.trim(),

              notes:
                form.notes.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            "Không thể lưu giao dịch."
        );
      }

      closeForm();

      await refreshDataSilently();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể lưu giao dịch."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * XÓA
   */

  async function deleteTransaction(
    tx: Transaction
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa giao dịch "${tx.description || typeLabels[tx.type]}" không?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response =
        await fetch(
          `/api/transactions/${tx.id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            "Không thể xóa."
        );
      }

      await refreshDataSilently();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể xóa giao dịch."
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-slate-900">

      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8">

        {/* ============================== */}
        {/* HEADER */}
        {/* ============================== */}

        <div className="mb-5 flex flex-col gap-4 sm:mb-6 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-xs text-slate-500 sm:text-sm">
              Quản lý trang trại
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              💰 Tài chính
            </h1>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Theo dõi tiền mua, bán và
              các chi phí của trang trại.
            </p>

          </div>

          <button
            type="button"
            onClick={openAdd}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto sm:px-5 sm:text-base"
          >
            + Thêm giao dịch
          </button>

        </div>

        {/* ============================== */}
        {/* TỔNG THU CHI */}
        {/* ============================== */}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">

          <SummaryCard
            label="Tổng thu"
            value={formatMoney(
              totals.income
            )}
            icon="📈"
            valueClass="text-emerald-700"
          />

          <SummaryCard
            label="Tổng chi gồm giá mua"
            value={formatMoney(
              totals.expense
            )}
            icon="📉"
            valueClass="text-red-600"
          />

          <SummaryCard
            label="Chênh lệch thu - chi"
            value={formatMoney(
              totals.profit
            )}
            icon={
              totals.profit >= 0
                ? "💚"
                : "🔴"
            }
            valueClass={
              totals.profit >= 0
                ? "text-emerald-700"
                : "text-red-600"
            }
          />

        </div>

        {/* ============================== */}
        {/* GIÁ TRỊ ĐÀN */}
        {/* ============================== */}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          <div className="mb-4">

            <h2 className="text-lg font-bold sm:text-xl">
              📊 Giá trị đàn
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Tự động tính từ giá mua và
              giá bán của các cá thể.
            </p>

          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">

            <SummaryCard
              label={`Tổng vốn mua (${animalTotals.animalsWithPrices} con có giá)`}
              value={formatMoney(
                animalTotals.purchaseValue
              )}
              icon="💰"
            />

            <SummaryCard
              label="Doanh thu đã bán"
              value={formatMoney(
                animalTotals.soldRevenue
              )}
              icon="💵"
            />

            <SummaryCard
              label={`Giá bán dự kiến (${Math.max(
                animalTotals.animalsWithPrices -
                  animalTotals.soldAnimals,
                0
              )} con chưa bán)`}
              value={formatMoney(
                animalTotals.expectedSaleValue
              )}
              icon="🏷️"
            />

            <SummaryCard
              label="Lãi dự kiến chưa bán"
              value={formatMoney(
                animalTotals.expectedProfit
              )}
              icon={
                animalTotals.expectedProfit >=
                0
                  ? "📈"
                  : "📉"
              }
              valueClass={
                animalTotals.expectedProfit >=
                0
                  ? "text-emerald-700"
                  : "text-red-600"
              }
            />

          </div>

          {/* LÃI ĐÃ THỰC HIỆN */}

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">

            <p className="text-xs leading-5 text-slate-600 sm:text-sm">

              <span className="font-semibold text-slate-700">
                Lãi đã thực hiện từ{" "}
                {animalTotals.soldAnimals}{" "}
                con đã bán:
              </span>{" "}

              <span
                className={
                  animalTotals.realizedProfit >=
                  0
                    ? "font-bold text-emerald-700"
                    : "font-bold text-red-600"
                }
              >
                {formatMoney(
                  animalTotals.realizedProfit
                )}
              </span>

            </p>

            <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
              Tự động cập nhật theo trạng thái
              "Đã bán".
            </p>

          </div>

        </section>

        {/* ============================== */}
        {/* BỘ LỌC */}
        {/* ============================== */}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          <div className="flex flex-col gap-4">

            <div>

              <h2 className="text-lg font-bold">
                🔎 Lọc giao dịch
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Chọn loại giao dịch muốn xem.
              </p>

            </div>

            <div className="flex flex-wrap gap-2">

              {(
                [
                  "ALL",
                  "INCOME",
                  "EXPENSE",
                ] as const
              ).map((item) => (

                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setFilter(item)
                  }
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                    filter === item
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item ===
                  "ALL"
                    ? "Tất cả"
                    : item ===
                      "INCOME"
                    ? "Khoản thu"
                    : "Khoản chi"}
                </button>

              ))}

            </div>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as
                    | "ALL"
                    | TransactionType
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 sm:w-auto"
            >

              <option value="ALL">
                Tất cả loại giao dịch
              </option>

              {Object.entries(
                typeLabels
              ).map(
                ([
                  value,
                  label,
                ]) => (

                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>

                )
              )}

            </select>

          </div>

        </section>

        {/* ============================== */}
        {/* LỊCH SỬ */}
        {/* ============================== */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">

            <div>

              <h2 className="text-lg font-bold sm:text-xl">
                Lịch sử giao dịch
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {filtered.length} giao dịch
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadData()
              }
              className="text-xs font-semibold text-emerald-700 hover:underline sm:text-sm"
            >
              Làm mới →
            </button>

          </div>

          {loading ? (

            <div className="p-10 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>

          ) : filtered.length ===
            0 ? (

            <div className="p-10 text-center">

              <div className="text-4xl">
                💸
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Chưa có giao dịch phù hợp.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {filtered.map(
                (tx) => {

                  const income =
                    incomeTypes.includes(
                      tx.type
                    );

                  return (

                    <div
                      key={tx.id}
                      className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
                    >

                      {/* THÔNG TIN */}

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${
                              income
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {
                              typeLabels[
                                tx.type
                              ]
                            }
                          </span>

                          <span className="text-[11px] text-slate-400 sm:text-sm">
                            {formatDate(
                              tx.date
                            )}
                          </span>

                        </div>

                        <h3 className="mt-2 truncate text-sm font-semibold text-slate-900 sm:text-base">
                          {tx.description ||
                            "Không có mô tả"}
                        </h3>

                        <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                          {tx.animal
                            ? `${tx.animal.name} (${tx.animal.code})`
                            : "Không gắn với cá thể"}
                        </p>

                        {tx.notes && (

                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-400 sm:text-xs">
                            {tx.notes}
                          </p>

                        )}

                      </div>

                      {/* SỐ TIỀN + NÚT */}

                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">

                        <strong
                          className={`text-base sm:text-lg ${
                            income
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {income
                            ? "+"
                            : "-"}
                          {
                            formatMoney(
                              tx.amount
                            )
                          }
                        </strong>

                        <div className="flex gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                tx
                              )
                            }
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 sm:text-sm"
                          >
                            ✏️ Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteTransaction(
                                tx
                              )
                            }
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 sm:text-sm"
                          >
                            🗑️
                          </button>

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

      </div>

      {/* ============================== */}
      {/* FORM */}
      {/* ============================== */}

      {showForm && (

        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeForm();
            }
          }}
        >

          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">

            {/* FORM HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">

              <div>

                <h2 className="text-xl font-bold sm:text-2xl">
                  {editing
                    ? "Sửa giao dịch"
                    : "Thêm giao dịch"}
                </h2>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Ghi nhận một khoản thu
                  hoặc chi.
                </p>

              </div>

              <button
                type="button"
                onClick={closeForm}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-600"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                saveTransaction
              }
              className="space-y-5 p-5 sm:p-6"
            >

              {error && (

                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>

              )}

              {/* LOẠI + CÁ THỂ */}

              <div className="grid gap-5 md:grid-cols-2">

                <label className="block">

                  <span className="mb-2 block text-sm font-semibold">
                    Loại giao dịch *
                  </span>

                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type:
                          e.target
                            .value as TransactionType,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >

                    {Object.entries(
                      typeLabels
                    ).map(
                      ([
                        value,
                        label,
                      ]) => (

                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>

                      )
                    )}

                  </select>

                </label>

                <label className="block">

                  <span className="mb-2 block text-sm font-semibold">
                    Cá thể liên quan
                  </span>

                  <select
                    value={
                      form.animalId
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        animalId:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >

                    <option value="">
                      — Không chọn —
                    </option>

                    {animals.map(
                      (animal) => (

                        <option
                          key={
                            animal.id
                          }
                          value={
                            animal.id
                          }
                        >
                          {
                            animal.name
                          }{" "}
                          (
                          {
                            animal.code
                          }
                          )
                        </option>

                      )
                    )}

                  </select>

                </label>

              </div>

              {/* SỐ TIỀN + NGÀY */}

              <div className="grid gap-5 md:grid-cols-2">

                <label className="block">

                  <span className="mb-2 block text-sm font-semibold">
                    Số tiền (đ) *
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.amount
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        amount:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    placeholder="Ví dụ: 1200000"
                  />

                </label>

                <label className="block">

                  <span className="mb-2 block text-sm font-semibold">
                    Ngày *
                  </span>

                  <input
                    type="date"
                    value={
                      form.date
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        date:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />

                </label>

              </div>

              {/* MÔ TẢ */}

              <label className="block">

                <span className="mb-2 block text-sm font-semibold">
                  Mô tả
                </span>

                <input
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description:
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  placeholder="Ví dụ: Mua chuột đông lạnh tháng 8"
                />

              </label>

              {/* GHI CHÚ */}

              <label className="block">

                <span className="mb-2 block text-sm font-semibold">
                  Ghi chú
                </span>

                <textarea
                  rows={3}
                  value={
                    form.notes
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes:
                        e.target
                          .value,
                    })
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />

              </label>

              {/* BUTTON */}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end sm:gap-3">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold sm:w-auto"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
                >
                  {saving
                    ? "Đang lưu..."
                    : editing
                    ? "Lưu thay đổi"
                    : "Thêm giao dịch"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

/*
 * CARD THỐNG KÊ
 */

function SummaryCard({
  label,
  value,
  icon,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  icon: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

      <div className="flex items-start justify-between gap-2">

        <div className="text-2xl sm:text-3xl">
          {icon}
        </div>

        <span className="text-[9px] font-semibold text-slate-400 sm:text-xs">
          TỔNG
        </span>

      </div>

      <p className="mt-3 break-words text-[11px] leading-4 text-slate-500 sm:mt-4 sm:text-sm">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-lg font-bold leading-tight sm:text-2xl ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}