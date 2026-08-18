"use client";

import { useEffect, useMemo, useState } from "react";

type Animal = {
  id: string;
  code: string;
  name: string;
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  status: string;
  species?: {
    name?: string;
  } | null;
  createdAt?: string;
};

type Transaction = {
  id: string;
  type: string;
  amount: string | number;
  date: string;
  description?: string | null;
  animal?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

type Breeding = {
  id: string;
  status: string;
  startDate?: string | null;
  pairingDate?: string | null;
  eggCount?: number | null;
  offspringTotal?: number | null;
  offspringFemale?: number | null;
  offspringMale?: number | null;
  offspringDead?: number | null;
};

type Period =
  | "ALL"
  | "TODAY"
  | "7D"
  | "MONTH"
  | "YEAR"
  | "CUSTOM";

const transactionLabels: Record<string, string> = {
  PURCHASE: "Mua động vật",
  SALE: "Bán động vật",
  FEED: "Thức ăn",
  MEDICAL: "Thú y",
  EQUIPMENT: "Thiết bị",
  SHIPPING: "Vận chuyển",
  OTHER: "Khác",
};

const breedingLabels: Record<string, string> = {
  PLANNED: "Đã lên kế hoạch",
  PAIRING: "Đã phối",
  PREGNANT: "Đang mang thai",
  LAID_EGGS: "Đã đẻ trứng",
  COMPLETED: "Hoàn thành",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

function money(value: number) {
  const amount = Math.abs(value);

  return (
    new Intl.NumberFormat("vi-VN").format(
      amount
    ) + " đ"
  );
}

function signedMoney(value: number) {
  if (value === 0) {
    return "0 đ";
  }

  return `${value > 0 ? "+" : "-"}${money(
    value
  )}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN").format(
    date
  );
}

function isDateInRange(
  value: string | null | undefined,
  period: Period,
  customFrom: string,
  customTo: string
) {
  if (period === "ALL") {
    return true;
  }

  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  if (period === "TODAY") {
    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (period === "7D") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    return date >= start && date <= now;
  }

  if (period === "MONTH") {
    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  if (period === "YEAR") {
    return (
      date.getFullYear() ===
      now.getFullYear()
    );
  }

  if (period === "CUSTOM") {
    const from = customFrom
      ? new Date(`${customFrom}T00:00:00`)
      : null;

    const to = customTo
      ? new Date(`${customTo}T23:59:59`)
      : null;

    if (from && date < from) {
      return false;
    }

    if (to && date > to) {
      return false;
    }

    return true;
  }

  return true;
}

export default function ReportsPage() {
  const [animals, setAnimals] =
    useState<Animal[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [breedings, setBreedings] =
    useState<Breeding[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [period, setPeriod] =
    useState<Period>("ALL");

  const [customFrom, setCustomFrom] =
    useState("");

  const [customTo, setCustomTo] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [
        animalsResponse,
        transactionsResponse,
        breedingResponse,
      ] = await Promise.all([
        fetch("/api/animals", {
          cache: "no-store",
        }),

        fetch("/api/transactions", {
          cache: "no-store",
        }),

        fetch("/api/breeding", {
          cache: "no-store",
        }),
      ]);

      if (!animalsResponse.ok) {
        throw new Error(
          "Không thể lấy dữ liệu động vật."
        );
      }

      if (!transactionsResponse.ok) {
        throw new Error(
          "Không thể lấy dữ liệu tài chính."
        );
      }

      if (!breedingResponse.ok) {
        throw new Error(
          "Không thể lấy dữ liệu sinh sản."
        );
      }

      const animalsData =
        await animalsResponse.json();

      const transactionsData =
        await transactionsResponse.json();

      const breedingData =
        await breedingResponse.json();

      setAnimals(
        Array.isArray(animalsData)
          ? animalsData
          : []
      );

      setTransactions(
        Array.isArray(transactionsData)
          ? transactionsData
          : []
      );

      setBreedings(
        Array.isArray(breedingData)
          ? breedingData
          : []
      );
    } catch (err) {
      console.error(
        "Reports load error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu báo cáo."
      );

      setAnimals([]);
      setTransactions([]);
      setBreedings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ==================================================
  // LỌC GIAO DỊCH
  // ==================================================

  const filteredTransactions =
    useMemo(() => {
      return transactions.filter(
        (transaction) =>
          isDateInRange(
            transaction.date,
            period,
            customFrom,
            customTo
          )
      );
    }, [
      transactions,
      period,
      customFrom,
      customTo,
    ]);

  // ==================================================
  // LỌC SINH SẢN
  // ==================================================

  const filteredBreedings =
    useMemo(() => {
      return breedings.filter((breeding) => {
        const date =
          breeding.pairingDate ||
          breeding.startDate;

        return isDateInRange(
          date,
          period,
          customFrom,
          customTo
        );
      });
    }, [
      breedings,
      period,
      customFrom,
      customTo,
    ]);

  // ==================================================
  // THỐNG KÊ
  // ==================================================

  const stats = useMemo(() => {
    const totalAnimals =
      animals.length;

    const healthy =
      animals.filter(
        (animal) =>
          animal.status === "HEALTHY"
      ).length;

    const sick =
      animals.filter(
        (animal) =>
          animal.status === "SICK"
      ).length;

    const breedingAnimals =
      animals.filter(
        (animal) =>
          animal.status === "BREEDING"
      ).length;

    const sold =
      animals.filter(
        (animal) =>
          animal.status === "SOLD"
      ).length;

    const deceased =
      animals.filter(
        (animal) =>
          animal.status === "DECEASED"
      ).length;

    const maleAnimals =
      animals.filter(
        (animal) =>
          animal.sex === "MALE"
      ).length;

    const femaleAnimals =
      animals.filter(
        (animal) =>
          animal.sex === "FEMALE"
      ).length;

    const unknownSex =
      animals.filter(
        (animal) =>
          animal.sex === "UNKNOWN"
      ).length;

    let totalIncome = 0;
    let totalExpense = 0;

    let purchases = 0;
    let feed = 0;
    let medical = 0;
    let equipment = 0;
    let shipping = 0;
    let otherExpenses = 0;

    for (const transaction of filteredTransactions) {
      const amount =
        Number(transaction.amount) || 0;

      if (transaction.type === "SALE") {
        totalIncome += amount;
        continue;
      }

      totalExpense += amount;

      switch (transaction.type) {
        case "PURCHASE":
          purchases += amount;
          break;

        case "FEED":
          feed += amount;
          break;

        case "MEDICAL":
          medical += amount;
          break;

        case "EQUIPMENT":
          equipment += amount;
          break;

        case "SHIPPING":
          shipping += amount;
          break;

        default:
          otherExpenses += amount;
          break;
      }
    }

    const eggs =
      filteredBreedings.reduce(
        (sum, breeding) =>
          sum +
          (Number(
            breeding.eggCount
          ) || 0),
        0
      );

    const offspring =
      filteredBreedings.reduce(
        (sum, breeding) =>
          sum +
          (Number(
            breeding.offspringTotal
          ) || 0),
        0
      );

    const femaleOffspring =
      filteredBreedings.reduce(
        (sum, breeding) =>
          sum +
          (Number(
            breeding.offspringFemale
          ) || 0),
        0
      );

    const maleOffspring =
      filteredBreedings.reduce(
        (sum, breeding) =>
          sum +
          (Number(
            breeding.offspringMale
          ) || 0),
        0
      );

    const deadOffspring =
      filteredBreedings.reduce(
        (sum, breeding) =>
          sum +
          (Number(
            breeding.offspringDead
          ) || 0),
        0
      );

    const net =
      totalIncome -
      totalExpense;

    return {
      totalAnimals,
      healthy,
      sick,
      breedingAnimals,
      sold,
      deceased,

      maleAnimals,
      femaleAnimals,
      unknownSex,

      breedingTotal:
        filteredBreedings.length,

      eggs,
      offspring,
      femaleOffspring,
      maleOffspring,
      deadOffspring,

      totalIncome,
      totalExpense,

      purchases,
      feed,
      medical,
      equipment,
      shipping,
      otherExpenses,

      net,
    };
  }, [
    animals,
    filteredTransactions,
    filteredBreedings,
  ]);

  // ==================================================
  // PHÂN BỐ THEO LOÀI
  // ==================================================

  const speciesRows = useMemo(() => {
    const map =
      new Map<string, number>();

    for (const animal of animals) {
      const species =
        animal.species?.name ||
        "Chưa xác định";

      map.set(
        species,
        (map.get(species) || 0) + 1
      );
    }

    return [...map.entries()].sort(
      (a, b) => b[1] - a[1]
    );
  }, [animals]);

  // ==================================================
  // TRẠNG THÁI SINH SẢN
  // ==================================================

  const breedingRows =
    useMemo(() => {
      const map =
        new Map<string, number>();

      for (const breeding of filteredBreedings) {
        map.set(
          breeding.status,
          (map.get(
            breeding.status
          ) || 0) + 1
        );
      }

      return [
        "PLANNED",
        "PAIRING",
        "PREGNANT",
        "LAID_EGGS",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ].map((status) => ({
        status,
        count:
          map.get(status) || 0,
      }));
    }, [filteredBreedings]);

  // ==================================================
  // GIAO DỊCH GẦN ĐÂY
  // ==================================================

  const recentTransactions =
    useMemo(() => {
      return [...filteredTransactions]
        .sort(
          (a, b) =>
            new Date(
              b.date
            ).getTime() -
            new Date(
              a.date
            ).getTime()
        )
        .slice(0, 8);
    }, [filteredTransactions]);

  const maxFinance =
    Math.max(
      stats.totalIncome,
      stats.totalExpense,
      1
    );

  const maxSpecies =
    Math.max(
      ...speciesRows.map(
        ([, count]) => count
      ),
      1
    );

  const periodLabel =
    period === "ALL"
      ? "Tất cả thời gian"
      : period === "TODAY"
      ? "Hôm nay"
      : period === "7D"
      ? "7 ngày gần nhất"
      : period === "MONTH"
      ? "Tháng này"
      : period === "YEAR"
      ? "Năm nay"
      : "Khoảng thời gian tùy chọn";

  return (
    <div className="min-h-screen bg-[#f7f9f8] p-6 text-slate-900">
      <div className="mx-auto max-w-[1500px]">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>
            <p className="text-sm text-slate-500">
              Quản lý trang trại
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              📊 Báo cáo
            </h1>

            <p className="mt-1 text-slate-500">
              Tổng hợp tình hình đàn,
              sinh sản và tài chính.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading
                ? "Đang tải..."
                : "↻ Làm mới"}
            </button>

          </div>
        </div>

        {/* ==================================================
            BỘ LỌC THỜI GIAN
        ================================================== */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <p className="font-bold">
                📅 Khoảng thời gian
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Đang xem: {periodLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              {[
                ["ALL", "Tất cả"],
                ["TODAY", "Hôm nay"],
                ["7D", "7 ngày"],
                ["MONTH", "Tháng này"],
                ["YEAR", "Năm nay"],
                ["CUSTOM", "Tùy chọn"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPeriod(
                      value as Period
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    period === value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}

            </div>
          </div>

          {period === "CUSTOM" && (
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Từ ngày
                </label>

                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) =>
                    setCustomFrom(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Đến ngày
                </label>

                <input
                  type="date"
                  value={customTo}
                  onChange={(e) =>
                    setCustomTo(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>

            </div>
          )}
        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Đang tổng hợp dữ liệu...
          </div>
        ) : (
          <>
            {/* ==================================================
                KPI
            ================================================== */}

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              <ReportCard
                icon="🐾"
                label="Tổng số cá thể"
                value={String(
                  stats.totalAnimals
                )}
              />

              <ReportCard
                icon="🥚"
                label="Tổng lần phối"
                value={String(
                  stats.breedingTotal
                )}
              />

              <ReportCard
                icon="🐣"
                label="Tổng con non"
                value={String(
                  stats.offspring
                )}
              />

              <ReportCard
                icon={
                  stats.net >= 0
                    ? "💰"
                    : "🔴"
                }
                label="Lãi / lỗ"
                value={signedMoney(
                  stats.net
                )}
                valueClass={
                  stats.net >= 0
                    ? "text-emerald-700"
                    : "text-red-600"
                }
              />

            </div>

            {/* ==================================================
                TÀI CHÍNH
            ================================================== */}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-start justify-between">

                  <div>
                    <h2 className="text-xl font-bold">
                      💰 Tình hình tài chính
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Theo {periodLabel.toLowerCase()}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      stats.net >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {stats.net >= 0
                      ? "Có lãi"
                      : "Đang lỗ"}
                  </div>

                </div>

                <div className="mt-6 space-y-5">

                  <FinanceBar
                    label="Tổng thu"
                    value={
                      stats.totalIncome
                    }
                    max={maxFinance}
                    positive
                  />

                  <FinanceBar
                    label="Tổng chi"
                    value={
                      stats.totalExpense
                    }
                    max={maxFinance}
                  />

                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">

                  <MoneyBox
                    label="Tổng thu"
                    value={
                      stats.totalIncome
                    }
                    positive
                  />

                  <MoneyBox
                    label="Tổng chi"
                    value={
                      stats.totalExpense
                    }
                  />

                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center justify-between">

                    <span className="font-semibold">
                      Lãi / lỗ
                    </span>

                    <strong
                      className={`text-xl ${
                        stats.net >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {signedMoney(
                        stats.net
                      )}
                    </strong>

                  </div>

                </div>

              </section>

              {/* CHI PHÍ */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="text-xl font-bold">
                  💳 Cơ cấu chi phí
                </h2>

                <div className="mt-5 space-y-4">

                  <ExpenseLine
                    label="Mua động vật"
                    value={
                      stats.purchases
                    }
                    total={
                      stats.totalExpense
                    }
                  />

                  <ExpenseLine
                    label="Thức ăn"
                    value={stats.feed}
                    total={
                      stats.totalExpense
                    }
                  />

                  <ExpenseLine
                    label="Thú y"
                    value={
                      stats.medical
                    }
                    total={
                      stats.totalExpense
                    }
                  />

                  <ExpenseLine
                    label="Thiết bị"
                    value={
                      stats.equipment
                    }
                    total={
                      stats.totalExpense
                    }
                  />

                  <ExpenseLine
                    label="Vận chuyển"
                    value={
                      stats.shipping
                    }
                    total={
                      stats.totalExpense
                    }
                  />

                  <ExpenseLine
                    label="Khác"
                    value={
                      stats.otherExpenses
                    }
                    total={
                      stats.totalExpense
                    }
                  />

                </div>

              </section>

            </div>

            {/* ==================================================
                ĐÀN
            ================================================== */}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="text-xl font-bold">
                  🐾 Tình trạng đàn
                </h2>

                <div className="mt-5 grid grid-cols-2 gap-4">

                  <MiniStat
                    label="Khỏe mạnh"
                    value={
                      stats.healthy
                    }
                  />

                  <MiniStat
                    label="Bị bệnh"
                    value={
                      stats.sick
                    }
                  />

                  <MiniStat
                    label="Đang sinh sản"
                    value={
                      stats.breedingAnimals
                    }
                  />

                  <MiniStat
                    label="Đã bán"
                    value={stats.sold}
                  />

                  <MiniStat
                    label="Đã mất"
                    value={
                      stats.deceased
                    }
                  />

                  <MiniStat
                    label="Chưa xác định"
                    value={
                      stats.unknownSex
                    }
                  />

                </div>

                <div className="mt-5 border-t border-slate-100 pt-5">

                  <div className="flex items-center justify-between">

                    <span className="font-semibold">
                      Giới tính
                    </span>

                    <span className="text-sm text-slate-500">
                      {stats.maleAnimals} đực ·{" "}
                      {stats.femaleAnimals} cái
                    </span>

                  </div>

                  <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="bg-slate-700"
                      style={{
                        width: `${
                          (stats.maleAnimals /
                            Math.max(
                              stats.totalAnimals,
                              1
                            )) *
                          100
                        }%`,
                      }}
                    />

                    <div
                      className="bg-pink-400"
                      style={{
                        width: `${
                          (stats.femaleAnimals /
                            Math.max(
                              stats.totalAnimals,
                              1
                            )) *
                          100
                        }%`,
                      }}
                    />

                  </div>

                </div>

              </section>

              {/* LOÀI */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="text-xl font-bold">
                  🐍 Phân bố theo loài
                </h2>

                <div className="mt-5 space-y-5">

                  {speciesRows.length ===
                  0 ? (
                    <p className="text-slate-500">
                      Chưa có dữ liệu.
                    </p>
                  ) : (
                    speciesRows.map(
                      ([name, count]) => (
                        <div key={name}>

                          <div className="mb-2 flex justify-between text-sm">

                            <span className="font-medium">
                              {name}
                            </span>

                            <span className="text-slate-500">
                              {count} cá thể
                            </span>

                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{
                                width: `${
                                  (count /
                                    maxSpecies) *
                                  100
                                }%`,
                              }}
                            />

                          </div>

                        </div>
                      )
                    )
                  )}

                </div>

              </section>

            </div>

            {/* ==================================================
                SINH SẢN
            ================================================== */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                <div>
                  <h2 className="text-xl font-bold">
                    🥚 Báo cáo sinh sản
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Theo {periodLabel.toLowerCase()}
                  </p>
                </div>

              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <MiniStat
                  label="Tổng lần phối"
                  value={
                    stats.breedingTotal
                  }
                />

                <MiniStat
                  label="Tổng trứng"
                  value={stats.eggs}
                />

                <MiniStat
                  label="Tổng con non"
                  value={
                    stats.offspring
                  }
                />

                <MiniStat
                  label="Con chết"
                  value={
                    stats.deadOffspring
                  }
                />

              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                {breedingRows.map(
                  (row) => (
                    <div
                      key={
                        row.status
                      }
                      className="rounded-xl bg-slate-50 p-4"
                    >

                      <p className="text-sm text-slate-500">
                        {breedingLabels[
                          row.status
                        ] ||
                          row.status}
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {row.count}
                      </p>

                    </div>
                  )
                )}

              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">

                <MiniStat
                  label="Con cái sinh ra"
                  value={
                    stats.femaleOffspring
                  }
                />

                <MiniStat
                  label="Con đực sinh ra"
                  value={
                    stats.maleOffspring
                  }
                />

                <MiniStat
                  label="Con chết"
                  value={
                    stats.deadOffspring
                  }
                />

              </div>

            </section>

            {/* ==================================================
                GIAO DỊCH
            ================================================== */}

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <h2 className="text-xl font-bold">
                  💳 Giao dịch gần đây
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Các giao dịch trong khoảng thời gian đang chọn
                </p>

              </div>

              {recentTransactions.length ===
              0 ? (
                <p className="p-6 text-slate-500">
                  Chưa có giao dịch trong khoảng thời gian này.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">

                  {recentTransactions.map(
                    (transaction) => {
                      const isIncome =
                        transaction.type ===
                        "SALE";

                      const amount =
                        Number(
                          transaction.amount
                        ) || 0;

                      return (
                        <div
                          key={
                            transaction.id
                          }
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div>

                            <p className="font-semibold">
                              {transaction.description ||
                                transactionLabels[
                                  transaction
                                    .type
                                ] ||
                                transaction.type}
                            </p>

                            <p className="text-sm text-slate-500">

                              {transactionLabels[
                                transaction.type
                              ] ||
                                transaction.type}

                              {" · "}

                              {formatDate(
                                transaction.date
                              )}

                              {transaction.animal
                                ? ` · ${transaction.animal.name}`
                                : ""}

                            </p>

                          </div>

                          <strong
                            className={
                              isIncome
                                ? "text-emerald-700"
                                : "text-red-600"
                            }
                          >
                            {signedMoney(
                              isIncome
                                ? amount
                                : -amount
                            )}
                          </strong>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </section>

          </>
        )}

      </div>
    </div>
  );
}

/* ======================================================
   COMPONENTS
====================================================== */

function ReportCard({
  icon,
  label,
  value,
  valueClass = "text-slate-900",
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="text-3xl">
        {icon}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}

function MoneyBox({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
          positive
            ? "text-emerald-700"
            : "text-red-600"
        }`}
      >
        {positive ? "+" : "-"}
        {money(value)}
      </p>

    </div>
  );
}

function FinanceBar({
  label,
  value,
  max,
  positive = false,
}: {
  label: string;
  value: number;
  max: number;
  positive?: boolean;
}) {
  const width =
    Math.min(
      100,
      Math.max(
        0,
        (value / max) * 100
      )
    );

  return (
    <div>

      <div className="mb-2 flex justify-between text-sm">

        <span className="font-semibold">
          {label}
        </span>

        <span
          className={
            positive
              ? "font-semibold text-emerald-700"
              : "font-semibold text-red-600"
          }
        >
          {money(value)}
        </span>

      </div>

      <div className="h-4 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full transition-all ${
            positive
              ? "bg-emerald-500"
              : "bg-red-400"
          }`}
          style={{
            width: `${width}%`,
          }}
        />

      </div>

    </div>
  );
}

function ExpenseLine({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? (value / total) * 100
      : 0;

  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <span className="text-sm text-slate-600">
          {label}
        </span>

        <span className="text-sm font-semibold">
          {money(value)}
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

        <div
          className="h-full rounded-full bg-slate-700 transition-all"
          style={{
            width: `${Math.min(
              100,
              percentage
            )}%`,
          }}
        />

      </div>

      <p className="mt-1 text-right text-xs text-slate-400">
        {percentage.toFixed(1)}%
      </p>

    </div>
  );
}