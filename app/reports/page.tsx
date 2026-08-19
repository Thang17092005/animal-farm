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

type AnimalStatus =
  | "HEALTHY"
  | "SICK"
  | "BREEDING"
  | "SOLD"
  | "DECEASED"
  | "OTHER";

type Sex = "MALE" | "FEMALE" | "UNKNOWN";

type Animal = {
  id: string;
  code: string;
  name: string;
  sex?: Sex;
  purchasePrice?: string | number | null;
  salePrice?: string | number | null;
  status?: AnimalStatus | string | null;
  species?: {
    id?: string;
    name?: string;
  } | null;
};

type Transaction = {
  id: string;
  type: TransactionType;
  animalId?: string | null;
  animal?: {
    id?: string;
    code?: string;
    name?: string;
  } | null;
  amount: string | number;
  date: string;
  description?: string | null;
  notes?: string | null;
};

type Breeding = {
  id: string;
  maleId?: string | null;
  femaleId?: string | null;
  status?: string | null;
  eggCount?: number | null;
  offspringTotal?: number | null;
  offspringFemale?: number | null;
  offspringMale?: number | null;
  offspringDead?: number | null;
  pairingDate?: string | null;
  layingDate?: string | null;
};

const transactionLabels: Record<TransactionType, string> = {
  PURCHASE: "Mua động vật",
  SALE: "Bán động vật",
  FEED: "Thức ăn",
  MEDICAL: "Thuốc / thú y",
  EQUIPMENT: "Thiết bị",
  SHIPPING: "Vận chuyển",
  OTHER: "Khác",
};

const statusLabels: Record<string, string> = {
  HEALTHY: "Đang khỏe",
  SICK: "Đang bệnh",
  BREEDING: "Đang sinh sản",
  SOLD: "Đã bán",
  DECEASED: "Đã mất",
  OTHER: "Khác",
};

function money(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function dateText(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(d);
}

export default function ReportsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [breedings, setBreedings] = useState<Breeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const [animalsRes, transactionsRes, breedingRes] =
        await Promise.all([
          fetch("/api/animals", { cache: "no-store" }),
          fetch("/api/transactions", { cache: "no-store" }),
          fetch("/api/breeding", { cache: "no-store" }),
        ]);

      if (!animalsRes.ok) {
        throw new Error("Không thể lấy dữ liệu động vật.");
      }

      const [animalsData, transactionsData, breedingData] =
        await Promise.all([
          animalsRes.json(),
          transactionsRes.ok ? transactionsRes.json() : [],
          breedingRes.ok ? breedingRes.json() : [],
        ]);

      setAnimals(Array.isArray(animalsData) ? animalsData : []);
      setTransactions(
        Array.isArray(transactionsData) ? transactionsData : []
      );
      setBreedings(Array.isArray(breedingData) ? breedingData : []);
    } catch (err) {
      console.error("Reports load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu báo cáo."
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function refreshSilently() {
    await load(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const totalAnimals = animals.length;

    const healthy = animals.filter(
      (a) => a.status === "HEALTHY"
    ).length;

    const sick = animals.filter(
      (a) => a.status === "SICK"
    ).length;

    const breedingAnimals = animals.filter(
      (a) => a.status === "BREEDING"
    ).length;

    const sold = animals.filter(
      (a) => a.status === "SOLD"
    ).length;

    const deceased = animals.filter(
      (a) => a.status === "DECEASED"
    ).length;

    const male = animals.filter(
      (a) => a.sex === "MALE"
    ).length;

    const female = animals.filter(
      (a) => a.sex === "FEMALE"
    ).length;

    /*
     * TÀI CHÍNH — GIỐNG LOGIC TRANG TÀI CHÍNH
     *
     * - Giao dịch PURCHASE/SALE được tính trực tiếp.
     * - Nếu cá thể có giá mua nhưng chưa có giao dịch PURCHASE
     *   gắn với cá thể đó thì giá mua được cộng vào chi.
     * - Nếu cá thể đã SOLD, có salePrice nhưng chưa có giao dịch SALE
     *   gắn với cá thể đó thì salePrice được cộng vào thu.
     * - Nhờ kiểm tra animalId nên không bị cộng 2 lần.
     */
    let transactionIncome = 0;
    let transactionExpense = 0;

    const purchaseTransactionAnimalIds = new Set<string>();
    const saleTransactionAnimalIds = new Set<string>();

    let purchaseTransactions = 0;
    let saleTransactions = 0;
    let feed = 0;
    let medical = 0;
    let equipment = 0;
    let shipping = 0;
    let other = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;

      if (tx.type === "SALE") {
        transactionIncome += amount;
        saleTransactions += amount;

        if (tx.animalId) {
          saleTransactionAnimalIds.add(tx.animalId);
        }

        continue;
      }

      transactionExpense += amount;

      if (tx.type === "PURCHASE") {
        purchaseTransactions += amount;

        if (tx.animalId) {
          purchaseTransactionAnimalIds.add(tx.animalId);
        }
      } else if (tx.type === "FEED") {
        feed += amount;
      } else if (tx.type === "MEDICAL") {
        medical += amount;
      } else if (tx.type === "EQUIPMENT") {
        equipment += amount;
      } else if (tx.type === "SHIPPING") {
        shipping += amount;
      } else {
        other += amount;
      }
    }

    let automaticPurchaseExpense = 0;
    let automaticSoldIncome = 0;
    let inventoryPurchaseValue = 0;
    let expectedUnsoldSaleValue = 0;
    let expectedUnsoldProfit = 0;
    let realizedProfit = 0;

    let animalsWithPurchasePrice = 0;
    let animalsWithSalePrice = 0;

    for (const animal of animals) {
      const purchase = Number(animal.purchasePrice) || 0;
      const sale = Number(animal.salePrice) || 0;

      if (purchase > 0) {
        animalsWithPurchasePrice += 1;
        inventoryPurchaseValue += purchase;
      }

      if (sale > 0) {
        animalsWithSalePrice += 1;
      }

      if (
        purchase > 0 &&
        !purchaseTransactionAnimalIds.has(animal.id)
      ) {
        automaticPurchaseExpense += purchase;
      }

      if (animal.status === "SOLD") {
        if (
          sale > 0 &&
          !saleTransactionAnimalIds.has(animal.id)
        ) {
          automaticSoldIncome += sale;
        }

        if (sale > 0 || purchase > 0) {
          realizedProfit += sale - purchase;
        }
      } else {
        if (sale > 0) {
          expectedUnsoldSaleValue += sale;
          expectedUnsoldProfit += sale - purchase;
        }
      }
    }

    const totalIncome =
      transactionIncome + automaticSoldIncome;

    const totalExpense =
      transactionExpense + automaticPurchaseExpense;

    const net =
      totalIncome - totalExpense;

    const expectedTotalSaleValue =
      expectedUnsoldSaleValue;

    const expectedTotalProfit =
      expectedUnsoldProfit;

    const totalEggs = breedings.reduce(
      (sum, breeding) =>
        sum + (breeding.eggCount || 0),
      0
    );

    const totalOffspring = breedings.reduce(
      (sum, breeding) =>
        sum + (breeding.offspringTotal || 0),
      0
    );

    const femaleOffspring = breedings.reduce(
      (sum, breeding) =>
        sum + (breeding.offspringFemale || 0),
      0
    );

    const maleOffspring = breedings.reduce(
      (sum, breeding) =>
        sum + (breeding.offspringMale || 0),
      0
    );

    const deadOffspring = breedings.reduce(
      (sum, breeding) =>
        sum + (breeding.offspringDead || 0),
      0
    );

    return {
      totalAnimals,
      healthy,
      sick,
      breedingAnimals,
      sold,
      deceased,
      male,
      female,

      totalIncome,
      totalExpense,
      net,

      purchaseTransactions,
      automaticPurchaseExpense,
      saleTransactions,
      automaticSoldIncome,

      feed,
      medical,
      equipment,
      shipping,
      other,

      inventoryPurchaseValue,
      expectedTotalSaleValue,
      expectedTotalProfit,
      realizedProfit,

      animalsWithPurchasePrice,
      animalsWithSalePrice,

      breedingTotal: breedings.length,
      totalEggs,
      totalOffspring,
      femaleOffspring,
      maleOffspring,
      deadOffspring,
    };
  }, [animals, transactions, breedings]);

  const speciesRows = useMemo(() => {
    const map = new Map<string, number>();

    for (const animal of animals) {
      const species =
        animal.species?.name || "Chưa xác định";

      map.set(
        species,
        (map.get(species) || 0) + 1
      );
    }

    return [...map.entries()].sort(
      (a, b) => b[1] - a[1]
    );
  }, [animals]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )
      .slice(0, 8);
  }, [transactions]);

  return (
    <div className="min-h-screen bg-[#f7f9f8] px-3 py-4 text-slate-900 sm:px-5 sm:py-6 md:p-6">
      <div className="mx-auto max-w-[1500px]">

        <div className="mb-5 flex flex-col justify-between gap-3 sm:mb-6 sm:gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs text-slate-500 sm:text-sm">
              Quản lý trang trại
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              📊 Báo cáo
            </h1>

            <p className="mt-1 text-slate-500">
              Tổng hợp tình hình đàn, sinh sản và tài chính.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshSilently}
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:px-5 sm:text-base"
          >
            {loading ? "Đang tải..." : "Làm mới →"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Đang tổng hợp dữ liệu...
          </div>
        ) : (
          <>
            {/* TỔNG QUAN */}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <ReportCard
                icon="🐾"
                label="Tổng số cá thể"
                value={String(stats.totalAnimals)}
              />

              <ReportCard
                icon="🥚"
                label="Tổng lần phối"
                value={String(stats.breedingTotal)}
              />

              <ReportCard
                icon="🐣"
                label="Tổng con non"
                value={String(stats.totalOffspring)}
              />

              <ReportCard
                icon="💰"
                label="Chênh lệch thu - chi"
                value={money(stats.net)}
                valueClass={
                  stats.net >= 0
                    ? "text-emerald-700"
                    : "text-red-600"
                }
              />
            </div>

            {/* TÌNH HÌNH ĐÀN */}

            <div className="mt-5 grid gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-6">

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-xl font-bold">
                  🐾 Tình trạng đàn
                </h2>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
                  <MiniStat
                    label="Đang khỏe"
                    value={stats.healthy}
                  />

                  <MiniStat
                    label="Đang bệnh"
                    value={stats.sick}
                  />

                  <MiniStat
                    label="Đang sinh sản"
                    value={stats.breedingAnimals}
                  />

                  <MiniStat
                    label="Đã bán"
                    value={stats.sold}
                  />

                  <MiniStat
                    label="Đã mất"
                    value={stats.deceased}
                  />

                  <MiniStat
                    label="Con đực"
                    value={stats.male}
                  />

                  <MiniStat
                    label="Con cái"
                    value={stats.female}
                  />
                </div>
              </section>

              {/* SINH SẢN */}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-xl font-bold">
                  🥚 Sinh sản
                </h2>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
                  <MiniStat
                    label="Lần phối"
                    value={stats.breedingTotal}
                  />

                  <MiniStat
                    label="Trứng"
                    value={stats.totalEggs}
                  />

                  <MiniStat
                    label="Con non"
                    value={stats.totalOffspring}
                  />

                  <MiniStat
                    label="Con cái"
                    value={stats.femaleOffspring}
                  />

                  <MiniStat
                    label="Con đực"
                    value={stats.maleOffspring}
                  />

                  <MiniStat
                    label="Con chết"
                    value={stats.deadOffspring}
                  />
                </div>
              </section>
            </div>

            {/* TÀI CHÍNH */}

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5">
              <div>
                <h2 className="text-xl font-bold">
                  💰 Tổng hợp tài chính
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Số liệu được tính cùng nguyên tắc với trang Tài chính.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-5 xl:grid-cols-4">
                <ReportCard
                  icon="📈"
                  label="Tổng thu"
                  value={money(stats.totalIncome)}
                  valueClass="text-emerald-700"
                />

                <ReportCard
                  icon="📉"
                  label="Tổng chi"
                  value={money(stats.totalExpense)}
                  valueClass="text-red-600"
                />

                <ReportCard
                  icon="💵"
                  label="Đã thu từ giao dịch + cá thể đã bán"
                  value={money(stats.totalIncome)}
                  valueClass="text-emerald-700"
                />

                <ReportCard
                  icon="🧾"
                  label="Đã chi + giá mua cá thể"
                  value={money(stats.totalExpense)}
                  valueClass="text-red-600"
                />
              </div>

              <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 sm:p-5">
                  <h3 className="font-bold">
                    Chi phí
                  </h3>

                  <div className="mt-4 space-y-3">
                    <FinanceLine
                      label="Mua động vật từ giao dịch"
                      value={stats.purchaseTransactions}
                    />

                    <FinanceLine
                      label="Giá mua tự động từ cá thể"
                      value={stats.automaticPurchaseExpense}
                    />

                    <FinanceLine
                      label="Thức ăn"
                      value={stats.feed}
                    />

                    <FinanceLine
                      label="Thuốc / thú y"
                      value={stats.medical}
                    />

                    <FinanceLine
                      label="Thiết bị"
                      value={stats.equipment}
                    />

                    <FinanceLine
                      label="Vận chuyển"
                      value={stats.shipping}
                    />

                    <FinanceLine
                      label="Khác"
                      value={stats.other}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 sm:p-5">
                  <h3 className="font-bold">
                    Giá trị đàn
                  </h3>

                  <div className="mt-4 space-y-3">
                    <InfoLine
                      label={`Vốn mua của đàn (${stats.animalsWithPurchasePrice} con có giá)`}
                      value={money(stats.inventoryPurchaseValue)}
                    />

                    <InfoLine
                      label={`Giá bán dự kiến chưa bán (${stats.animalsWithSalePrice} con có giá)`}
                      value={money(stats.expectedTotalSaleValue)}
                    />

                    <InfoLine
                      label="Lãi dự kiến chưa bán"
                      value={money(stats.expectedTotalProfit)}
                      valueClass={
                        stats.expectedTotalProfit >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }
                    />

                    <InfoLine
                      label="Lãi đã thực hiện từ cá thể đã bán"
                      value={money(stats.realizedProfit)}
                      valueClass={
                        stats.realizedProfit >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* LOÀI */}

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5">
              <h2 className="text-xl font-bold">
                🐍 Phân bố theo loài
              </h2>

              {speciesRows.length === 0 ? (
                <p className="mt-4 text-slate-500">
                  Chưa có dữ liệu.
                </p>
              ) : (
                <div className="mt-4 space-y-3 sm:mt-5">
                  {speciesRows.map(([species, count]) => {
                    const percent =
                      stats.totalAnimals > 0
                        ? (count / stats.totalAnimals) * 100
                        : 0;

                    return (
                      <div key={species}>
                        <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <span className="font-semibold">
                            {species}
                          </span>

                          <span className="text-xs text-slate-500 sm:text-sm">
                            {count} con · {percent.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${percent}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* GIAO DỊCH GẦN ĐÂY */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                <h2 className="text-xl font-bold">
                  🧾 Giao dịch gần đây
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  8 giao dịch mới nhất.
                </p>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Chưa có giao dịch.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentTransactions.map((transaction) => {
                    const income =
                      transaction.type === "SALE";

                    return (
                      <div
                        key={transaction.id}
                        className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div>
                          <p className="font-semibold">
                            {transaction.description ||
                              transactionLabels[transaction.type]}
                          </p>

                          <p className="text-xs text-slate-500 sm:text-sm">
                            {transactionLabels[transaction.type]}
                            {" · "}
                            {dateText(transaction.date)}

                            {transaction.animal
                              ? ` · ${transaction.animal.name}`
                              : ""}
                          </p>
                        </div>

                        <strong
                          className={
                            income
                              ? "text-emerald-700"
                              : "text-red-600"
                          }
                        >
                          {income ? "+" : "-"}
                          {money(transaction.amount)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="text-2xl sm:text-3xl">
        {icon}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {label}
      </p>

      <p className={`mt-1 break-words text-lg font-bold leading-tight sm:text-2xl ${valueClass}`}>
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
    <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
      <p className="text-xs text-slate-500 sm:text-sm">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function FinanceLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs text-slate-600 sm:text-sm">
        {label}
      </span>

      <strong className="text-sm text-red-600">
        {money(value)}
      </strong>
    </div>
  );
}

function InfoLine({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs text-slate-600 sm:text-sm">
        {label}
      </span>

      <strong className={`text-sm ${valueClass}`}>
        {value}
      </strong>
    </div>
  );
}
