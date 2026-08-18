"use client";

import { useEffect, useState } from "react";

type Animal = {
  id: string;
  code: string;
  name: string;

  sex?: "MALE" | "FEMALE" | "UNKNOWN";

  weight?: number | string | null;

  purchasePrice?: number | string | null;

  salePrice?: number | string | null;

  status?:
    | "HEALTHY"
    | "SICK"
    | "BREEDING"
    | "SOLD"
    | "DECEASED"
    | "OTHER";

  species?: {
    id?: string;
    name?: string;
  } | null;

  morph?: {
    id?: string;
    name?: string;
  } | null;

  genetics?: string | null;

  images?: {
    id?: string;
    url: string;
    isPrimary?: boolean;
  }[];
};

function formatMoney(
  value: number | string | null | undefined
) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0 đ";
  }

  return (
    new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 0,
    }).format(number) + " đ"
  );
}

function getStatusLabel(
  status?: Animal["status"]
) {
  switch (status) {
    case "HEALTHY":
      return "Đang khỏe";

    case "SICK":
      return "Đang bệnh";

    case "BREEDING":
      return "Đang sinh sản";

    case "SOLD":
      return "Đã bán";

    case "DECEASED":
      return "Đã mất";

    default:
      return "Khác";
  }
}

function getStatusClass(
  status?: Animal["status"]
) {
  switch (status) {
    case "HEALTHY":
      return "bg-emerald-50 text-emerald-700";

    case "SICK":
      return "bg-red-50 text-red-700";

    case "BREEDING":
      return "bg-pink-50 text-pink-700";

    case "SOLD":
      return "bg-blue-50 text-blue-700";

    case "DECEASED":
      return "bg-gray-100 text-gray-600";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getAnimalImage(animal: Animal) {
  if (
    !animal.images ||
    animal.images.length === 0
  ) {
    return null;
  }

  const primary = animal.images.find(
    (image) => image.isPrimary
  );

  return (
    primary?.url ??
    animal.images[0]?.url ??
    null
  );
}

export default function DashboardPage() {
  const [animals, setAnimals] =
    useState<Animal[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [offspringCount, setOffspringCount] =
    useState(0);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/animals",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Không thể tải danh sách động vật."
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Dữ liệu động vật không hợp lệ."
        );
      }

      setAnimals(data);
    } catch (error) {
      console.error(
        "Lỗi tải dữ liệu tổng quan:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu."
      );

      setAnimals([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadBreedingStats() {
    try {
      const response = await fetch(
        "/api/breeding",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return;
      }

      let count = 0;

      for (const breeding of data) {
        if (
          Array.isArray(
            breeding.offspring
          )
        ) {
          count +=
            breeding.offspring.length;
        } else if (
          typeof breeding.offspringCount ===
          "number"
        ) {
          count +=
            breeding.offspringCount;
        }
      }

      setOffspringCount(count);
    } catch (error) {
      console.error(
        "Không thể tải thống kê con non:",
        error
      );

      setOffspringCount(0);
    }
  }

  useEffect(() => {
    loadData();
    loadBreedingStats();
  }, []);

  /*
   * THỐNG KÊ
   */

  const activeAnimals =
    animals.filter(
      (animal) =>
        animal.status !== "SOLD" &&
        animal.status !== "DECEASED"
    );

  const totalAnimals =
    activeAnimals.length;

  const totalValue =
    activeAnimals.reduce(
      (sum, animal) => {
        return (
          sum +
          Number(
            animal.purchasePrice ?? 0
          )
        );
      },
      0
    );

  const breedingCount =
    activeAnimals.filter(
      (animal) =>
        animal.status === "BREEDING"
    ).length;

  /*
   * MỞ TRANG SỬA
   */

  function editAnimal(
    animalId: string
  ) {
    window.location.href =
      `/animals?edit=${encodeURIComponent(
        animalId
      )}`;
  }

  /*
   * ĐI ĐẾN TRANG ĐỘNG VẬT
   */

  function goToAnimals() {
    window.location.href =
      "/animals";
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}

      <header className="border-b bg-white px-8 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm text-slate-500">
              Chào mừng trở lại 👋
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Tổng quan
            </h1>
          </div>

          <button
            type="button"
            onClick={goToAnimals}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            + Thêm động vật
          </button>

        </div>
      </header>

      {/* MAIN */}

      <main className="px-8 py-8">
        <div className="mx-auto max-w-7xl">

          {/* THỐNG KÊ */}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

            {/* TỔNG CÁ THỂ */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <div className="flex items-start justify-between">

                <div className="text-3xl">
                  🐾
                </div>

                <span className="text-sm font-medium text-slate-400">
                  TỔNG
                </span>

              </div>

              <div className="mt-6 text-3xl font-bold text-slate-900">
                {loading
                  ? "..."
                  : totalAnimals}
              </div>

              <p className="mt-1 text-slate-500">
                Tổng số cá thể
              </p>

            </div>

            {/* GIÁ TRỊ */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <div className="flex items-start justify-between">

                <div className="text-3xl">
                  💰
                </div>

                <span className="text-sm font-medium text-slate-400">
                  TỔNG
                </span>

              </div>

              <div className="mt-6 text-3xl font-bold text-slate-900">
                {loading
                  ? "..."
                  : formatMoney(
                      totalValue
                    )}
              </div>

              <p className="mt-1 text-slate-500">
                Tổng giá trị đàn
              </p>

            </div>

            {/* SINH SẢN */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <div className="flex items-start justify-between">

                <div className="text-3xl">
                  🥚
                </div>

                <span className="text-sm font-medium text-slate-400">
                  TỔNG
                </span>

              </div>

              <div className="mt-6 text-3xl font-bold text-slate-900">
                {loading
                  ? "..."
                  : breedingCount}
              </div>

              <p className="mt-1 text-slate-500">
                Đang sinh sản
              </p>

            </div>

            {/* CON NON */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <div className="flex items-start justify-between">

                <div className="text-3xl">
                  🐣
                </div>

                <span className="text-sm font-medium text-slate-400">
                  TỔNG
                </span>

              </div>

              <div className="mt-6 text-3xl font-bold text-slate-900">
                {loading
                  ? "..."
                  : offspringCount}
              </div>

              <p className="mt-1 text-slate-500">
                Con non
              </p>

            </div>

          </div>

          {/* GIỚI THIỆU */}

          <section className="mt-8 rounded-2xl bg-emerald-700 p-8 text-white shadow-sm">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-sm font-medium text-emerald-100">
                  QUẢN LÝ TRANG TRẠI
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Quản lý đàn động vật của bạn
                </h2>

                <p className="mt-2 text-emerald-50">
                  Theo dõi cá thể, giá mua,
                  sinh sản, con non và tài
                  chính ở một nơi duy nhất.
                </p>

              </div>

              <button
                type="button"
                onClick={goToAnimals}
                className="shrink-0 rounded-xl bg-white px-6 py-4 font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                + Thêm động vật
              </button>

            </div>

          </section>

          {/* CÁ THỂ GẦN ĐÂY */}

          <section className="mt-8">

            <div className="mb-5 flex items-end justify-between">

              <div>

                <h2 className="text-2xl font-bold text-slate-900">
                  Cá thể gần đây
                </h2>

                <p className="mt-1 text-slate-500">
                  Những cá thể được thêm hoặc
                  cập nhật gần đây
                </p>

              </div>

              <button
                type="button"
                onClick={loadData}
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Làm mới →
              </button>

            </div>

            {/* LỖI */}

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            {/* LOADING */}

            {loading ? (

              <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">
                Đang tải dữ liệu...
              </div>

            ) : animals.length === 0 ? (

              /* KHÔNG CÓ ĐỘNG VẬT */

              <div className="rounded-2xl border bg-white p-12 text-center">

                <div className="text-5xl">
                  🐾
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Chưa có cá thể nào
                </h3>

                <p className="mt-1 text-slate-500">
                  Hãy thêm động vật đầu tiên
                  vào trang trại.
                </p>

                <button
                  type="button"
                  onClick={goToAnimals}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                >
                  + Thêm động vật
                </button>

              </div>

            ) : (

              /* DANH SÁCH */

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                {animals
                  .slice(0, 6)
                  .map((animal) => {

                    const imageUrl =
                      getAnimalImage(
                        animal
                      );

                    return (

                      <div
                        key={animal.id}
                        className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >

                        {/* ẢNH */}

                        <div className="relative flex h-48 items-center justify-center bg-slate-100">

                          {imageUrl ? (

                            <img
                              src={imageUrl}
                              alt={
                                animal.name
                              }
                              className="h-full w-full object-cover"
                            />

                          ) : (

                            <div className="text-7xl">
                              🐍
                            </div>

                          )}

                        </div>

                        {/* THÔNG TIN */}

                        <div className="p-5">

                          <div className="flex items-start justify-between gap-3">

                            <div>

                              <p className="text-xs font-bold text-emerald-600">
                                {animal.code}
                              </p>

                              <h3 className="mt-1 text-xl font-bold text-slate-900">
                                {animal.name}
                              </h3>

                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                                animal.status
                              )}`}
                            >
                              {getStatusLabel(
                                animal.status
                              )}
                            </span>

                          </div>

                          {/* THÔNG TIN */}

                          <div className="mt-4 space-y-2 text-sm text-slate-600">

                            {animal.species?.name && (

                              <div>
                                🐾 Loài:{" "}

                                <span className="font-medium text-slate-800">
                                  {
                                    animal
                                      .species
                                      .name
                                  }
                                </span>
                              </div>

                            )}

                            {animal.morph?.name && (

                              <div>
                                🎨 Biến thể:{" "}

                                <span className="font-medium text-slate-800">
                                  {
                                    animal
                                      .morph
                                      .name
                                  }
                                </span>
                              </div>

                            )}

                            {animal.genetics && (

                              <div>
                                🧬 Gene:{" "}

                                <span className="font-medium text-slate-800">
                                  {
                                    animal.genetics
                                  }
                                </span>
                              </div>

                            )}

                            {animal.weight !==
                              null &&
                              animal.weight !==
                                undefined && (

                                <div>
                                  ⚖️ Cân nặng:{" "}

                                  <span className="font-medium text-slate-800">
                                    {
                                      animal.weight
                                    }{" "}
                                    g
                                  </span>
                                </div>

                              )}

                            {animal.purchasePrice !==
                              null &&
                              animal.purchasePrice !==
                                undefined && (

                                <div>
                                  💰 Giá mua:{" "}

                                  <span className="font-medium text-slate-800">
                                    {formatMoney(
                                      animal.purchasePrice
                                    )}
                                  </span>
                                </div>

                              )}

                          </div>

                          {/* NÚT SỬA */}

                          <div className="mt-5 border-t border-slate-100 pt-4">

                            <button
                              type="button"
                              onClick={() =>
                                editAnimal(
                                  animal.id
                                )
                              }
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              ✏️ Sửa thông tin
                            </button>

                          </div>

                        </div>

                      </div>

                    );
                  })}

              </div>

            )}

          </section>

        </div>
      </main>

    </div>
  );
}