"use client";

import { useEffect, useMemo, useState } from "react";

type Animal = {
  id: string;
  code: string;
  name: string;
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  genetics?: string | null;

  species?: {
    id?: string;
    name: string;
  } | null;

  morph?: {
    id?: string;
    name: string;
  } | null;
};

type FeedingRecord = {
  id: string;
  animalId: string;
  date: string;
  time: string;
  food: string;
  amount: string;
  note: string;
  completed: boolean;
};

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("vi-VN");
}

function normalizeDate(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAnimal(
  animals: Animal[],
  animalId: string
) {
  return animals.find(
    (animal) =>
      animal.id === animalId
  );
}

function getAnimalName(
  animals: Animal[],
  animalId: string
) {
  return (
    getAnimal(
      animals,
      animalId
    )?.name || "Không xác định"
  );
}

function getAnimalCode(
  animals: Animal[],
  animalId: string
) {
  return (
    getAnimal(
      animals,
      animalId
    )?.code || "—"
  );
}

function getAnimalInfo(
  animals: Animal[],
  animalId: string
) {
  const animal = getAnimal(
    animals,
    animalId
  );

  if (!animal) {
    return "";
  }

  const parts: string[] = [];

  if (animal.species?.name) {
    parts.push(
      animal.species.name
    );
  }

  if (animal.morph?.name) {
    parts.push(
      animal.morph.name
    );
  }

  if (animal.genetics) {
    parts.push(
      `Gene: ${animal.genetics}`
    );
  }

  return parts.join(" • ");
}

export default function FeedingPage() {
  const [animals, setAnimals] =
    useState<Animal[]>([]);

  const [records, setRecords] =
    useState<FeedingRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==================================================
  // FORM
  // ==================================================

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [speciesId, setSpeciesId] =
    useState("");

  const [animalId, setAnimalId] =
    useState("");

  const [date, setDate] =
    useState(getToday());

  const [time, setTime] =
    useState("18:00");

  const [food, setFood] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [note, setNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // ==================================================
  // LỊCH
  // ==================================================

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  // ==================================================
  // LỊCH SỬ
  // ==================================================

  const [historySpeciesId, setHistorySpeciesId] =
    useState("");

  const [historyAnimalId, setHistoryAnimalId] =
    useState("");

  const [historyFrom, setHistoryFrom] =
    useState("");

  const [historyTo, setHistoryTo] =
    useState("");

  // ==================================================
  // DANH SÁCH LOÀI
  // ==================================================

  const speciesList = useMemo(() => {
    const names = new Set<string>();

    animals.forEach((animal) => {
      const name =
        animal.species?.name;

      if (name) {
        names.add(name);
      }
    });

    return Array.from(names).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "vi"
        )
    );
  }, [animals]);

  // ==================================================
  // CON VẬT THEO LOÀI
  // ==================================================

  const filteredAnimals = useMemo(() => {
    if (!speciesId) {
      return animals;
    }

    return animals.filter(
      (animal) =>
        animal.species?.name ===
        speciesId
    );
  }, [
    animals,
    speciesId,
  ]);

  // ==================================================
  // CON VẬT TRONG LỊCH SỬ
  // ==================================================

  const filteredHistoryAnimals =
    useMemo(() => {
      if (!historySpeciesId) {
        return animals;
      }

      return animals.filter(
        (animal) =>
          animal.species?.name ===
          historySpeciesId
      );
    }, [
      animals,
      historySpeciesId,
    ]);

  // ==================================================
  // LOAD ANIMALS
  // ==================================================

  async function loadAnimals() {
    try {
      const response =
        await fetch(
          "/api/animals",
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể tải danh sách động vật."
        );
      }

      setAnimals(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách động vật."
      );
    }
  }

  // ==================================================
  // LOAD FEEDINGS
  // ==================================================

  async function loadFeedings() {
    try {
      const response =
        await fetch(
          "/api/feedings",
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể tải lịch cho ăn."
        );
      }

      const normalized: FeedingRecord[] =
        Array.isArray(data)
          ? data.map(
              (item: any) => ({
                id: item.id,
                animalId:
                  item.animalId,
                date:
                  normalizeDate(
                    item.date
                  ),
                time:
                  item.time ||
                  "00:00",
                food:
                  item.food ||
                  "",
                amount:
                  item.amount ||
                  "",
                note:
                  item.note ||
                  "",
                completed:
                  Boolean(
                    item.completed
                  ),
              })
            )
          : [];

      setRecords(normalized);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải lịch cho ăn."
      );
    }
  }

  // ==================================================
  // LOAD BAN ĐẦU
  // ==================================================

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      await Promise.all([
        loadAnimals(),
        loadFeedings(),
      ]);

      setLoading(false);
    }

    loadData();
  }, []);

  // ==================================================
  // RESET FORM
  // ==================================================

  function resetForm() {
    setEditingId(null);
    setSpeciesId("");
    setAnimalId("");

    setDate(
      selectedDate ||
        getToday()
    );

    setTime("18:00");
    setFood("");
    setAmount("");
    setNote("");
    setError("");
  }

  // ==================================================
  // THÊM
  // ==================================================

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  // ==================================================
  // SỬA
  // ==================================================

  function openEditForm(
    record: FeedingRecord
  ) {
    const animal =
      getAnimal(
        animals,
        record.animalId
      );

    setEditingId(record.id);

    setAnimalId(
      record.animalId
    );

    setSpeciesId(
      animal?.species?.name ||
        ""
    );

    setDate(record.date);
    setTime(record.time);
    setFood(record.food);
    setAmount(record.amount);
    setNote(record.note);
    setError("");

    setShowForm(true);
  }

  // ==================================================
  // ĐÓNG FORM
  // ==================================================

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
  }

  // ==================================================
  // LƯU
  // ==================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!speciesId) {
      setError(
        "Bạn cần chọn loài."
      );
      return;
    }

    if (!animalId) {
      setError(
        "Bạn cần chọn con vật."
      );
      return;
    }

    const selectedAnimal =
      getAnimal(
        animals,
        animalId
      );

    if (
      !selectedAnimal
    ) {
      setError(
        "Không tìm thấy con vật."
      );
      return;
    }

    if (
      selectedAnimal.species
        ?.name !== speciesId
    ) {
      setError(
        "Con vật không thuộc loài đang chọn."
      );
      return;
    }

    if (!date) {
      setError(
        "Bạn cần chọn ngày cho ăn."
      );
      return;
    }

    if (!time) {
      setError(
        "Bạn cần chọn giờ cho ăn."
      );
      return;
    }

    if (!food.trim()) {
      setError(
        "Bạn cần nhập loại thức ăn."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        animalId,
        date,
        time,
        food: food.trim(),
        amount:
          amount.trim() ||
          null,
        note:
          note.trim() ||
          null,
        completed:
          editingId
            ? records.find(
                (record) =>
                  record.id ===
                  editingId
              )?.completed ||
              false
            : false,
      };

      const response =
        await fetch(
          editingId
            ? `/api/feedings/${editingId}`
            : "/api/feedings",
          {
            method:
              editingId
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể lưu lịch cho ăn."
        );
      }

      await loadFeedings();

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu lịch cho ăn."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==================================================
  // ĐÁNH DẤU ĐÃ CHO ĂN
  // ==================================================

  async function toggleCompleted(
    id: string
  ) {
    const record =
      records.find(
        (item) =>
          item.id === id
      );

    if (!record) {
      return;
    }

    try {
      setError("");

      const response =
        await fetch(
          `/api/feedings/${id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              animalId:
                record.animalId,
              date:
                record.date,
              time:
                record.time,
              food:
                record.food,
              amount:
                record.amount ||
                null,
              note:
                record.note ||
                null,
              completed:
                !record.completed,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể cập nhật trạng thái."
        );
      }

      await loadFeedings();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái."
      );
    }
  }

  // ==================================================
  // XÓA
  // ==================================================

  async function deleteRecord(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Bạn có chắc muốn xóa lịch cho ăn này không?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response =
        await fetch(
          `/api/feedings/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể xóa lịch cho ăn."
        );
      }

      if (
        editingId === id
      ) {
        setShowForm(false);
        resetForm();
      }

      await loadFeedings();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể xóa lịch cho ăn."
      );
    }
  }

  // ==================================================
  // LỊCH HÔM NAY
  // ==================================================

  const today =
    getToday();

  const todayRecords =
    useMemo(() => {
      return records
        .filter(
          (record) =>
            record.date ===
            today
        )
        .sort((a, b) =>
          a.time.localeCompare(
            b.time
          )
        );
    }, [
      records,
      today,
    ]);

  // ==================================================
  // NGÀY ĐANG CHỌN
  // ==================================================

  const selectedRecords =
    useMemo(() => {
      return records
        .filter(
          (record) =>
            record.date ===
            selectedDate
        )
        .sort((a, b) =>
          a.time.localeCompare(
            b.time
          )
        );
    }, [
      records,
      selectedDate,
    ]);

  // ==================================================
  // LỊCH SẮP TỚI
  // ==================================================

  const upcomingRecords =
    useMemo(() => {
      return records
        .filter(
          (record) =>
            `${record.date} ${record.time}` >=
              `${today} 00:00` &&
            !record.completed
        )
        .sort((a, b) => {
          const first =
            `${a.date} ${a.time}`;

          const second =
            `${b.date} ${b.time}`;

          return first.localeCompare(
            second
          );
        })
        .slice(0, 8);
    }, [
      records,
      today,
    ]);

  // ==================================================
  // LỊCH SỬ
  // ==================================================

  const historyRecords =
    useMemo(() => {
      return records
        .filter(
          (record) =>
            record.completed
        )
        .filter(
          (record) => {
            if (
              historyAnimalId &&
              record.animalId !==
                historyAnimalId
            ) {
              return false;
            }

            if (
              historyFrom &&
              record.date <
                historyFrom
            ) {
              return false;
            }

            if (
              historyTo &&
              record.date >
                historyTo
            ) {
              return false;
            }

            if (
              historySpeciesId
            ) {
              const animal =
                getAnimal(
                  animals,
                  record.animalId
                );

              if (
                animal?.species
                  ?.name !==
                historySpeciesId
              ) {
                return false;
              }
            }

            return true;
          }
        )
        .sort((a, b) => {
          const first =
            `${a.date} ${a.time}`;

          const second =
            `${b.date} ${b.time}`;

          return second.localeCompare(
            first
          );
        });
    }, [
      records,
      animals,
      historySpeciesId,
      historyAnimalId,
      historyFrom,
      historyTo,
    ]);

  // ==================================================
  // THỐNG KÊ
  // ==================================================

  const completedToday =
    todayRecords.filter(
      (record) =>
        record.completed
    ).length;

  const pendingToday =
    todayRecords.filter(
      (record) =>
        !record.completed
    ).length;

  const totalHistory =
    records.filter(
      (record) =>
        record.completed
    ).length;

  const thisMonthHistory =
    records.filter(
      (record) =>
        record.completed &&
        record.date.startsWith(
          today.slice(0, 7)
        )
    ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <p className="text-sm font-medium text-emerald-600">
            QUẢN LÝ TRANG TRẠI
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Lịch cho ăn
          </h1>

          <p className="mt-1 text-slate-500">
            Quản lý lịch cho ăn và theo dõi lịch sử của từng cá thể.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openAddForm
          }
          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          + Thêm lịch cho ăn
        </button>

      </div>

      {/* ================================================== */}
      {/* ERROR */}
      {/* ================================================== */}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ================================================== */}
      {/* STATS */}
      {/* ================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

        <StatCard
          icon="🍖"
          value={
            todayRecords.length
          }
          label="Lịch hôm nay"
        />

        <StatCard
          icon="⏰"
          value={
            pendingToday
          }
          label="Chưa cho ăn"
        />

        <StatCard
          icon="✅"
          value={
            completedToday
          }
          label="Đã cho ăn hôm nay"
        />

        <StatCard
          icon="📋"
          value={
            totalHistory
          }
          label="Tổng lần đã ăn"
        />

        <StatCard
          icon="📅"
          value={
            thisMonthHistory
          }
          label="Lần ăn trong tháng"
        />

      </div>

      {/* ================================================== */}
      {/* LỊCH HÔM NAY */}
      {/* ================================================== */}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              🍖 Lịch cho ăn hôm nay
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatDate(today)}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedDate(
                today
              )
            }
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Xem hôm nay
          </button>

        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Đang tải dữ liệu...
          </div>
        ) : todayRecords.length ===
          0 ? (
          <EmptyState
            icon="🍽️"
            title="Hôm nay chưa có lịch cho ăn"
            description="Bạn có thể thêm lịch cho ăn bằng nút phía trên."
          />
        ) : (
          <div className="divide-y divide-slate-100">

            {todayRecords.map(
              (record) => (
                <FeedingItem
                  key={
                    record.id
                  }
                  record={
                    record
                  }
                  animals={
                    animals
                  }
                  onToggle={
                    toggleCompleted
                  }
                  onEdit={
                    openEditForm
                  }
                  onDelete={
                    deleteRecord
                  }
                />
              )
            )}

          </div>
        )}

      </section>

      {/* ================================================== */}
      {/* LỊCH SẮP TỚI */}
      {/* ================================================== */}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5">

          <h2 className="text-xl font-bold text-slate-900">
            ⏰ Lịch sắp tới
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Các lần cho ăn chưa hoàn thành.
          </p>

        </div>

        {upcomingRecords.length ===
        0 ? (
          <EmptyState
            icon="📅"
            title="Chưa có lịch sắp tới"
            description="Bạn chưa có lịch cho ăn nào chưa hoàn thành."
          />
        ) : (
          <div className="divide-y divide-slate-100">

            {upcomingRecords.map(
              (record) => (
                <FeedingItem
                  key={
                    record.id
                  }
                  record={
                    record
                  }
                  animals={
                    animals
                  }
                  onToggle={
                    toggleCompleted
                  }
                  onEdit={
                    openEditForm
                  }
                  onDelete={
                    deleteRecord
                  }
                />
              )
            )}

          </div>
        )}

      </section>

      {/* ================================================== */}
      {/* XEM THEO NGÀY */}
      {/* ================================================== */}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <h2 className="text-xl font-bold text-slate-900">
          📅 Xem lịch theo ngày
        </h2>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">

          <div className="flex-1">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Chọn ngày
            </label>

            <input
              type="date"
              value={
                selectedDate
              }
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

          </div>

          <div className="text-sm text-slate-500">
            Có{" "}
            <strong className="text-slate-900">
              {
                selectedRecords.length
              }
            </strong>{" "}
            lịch trong ngày này.
          </div>

        </div>

        <div className="mt-5">

          {selectedRecords.length ===
          0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              Không có lịch cho ăn trong ngày này.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">

              {selectedRecords.map(
                (record) => (
                  <FeedingItem
                    key={
                      record.id
                    }
                    record={
                      record
                    }
                    animals={
                      animals
                    }
                    onToggle={
                      toggleCompleted
                    }
                    onEdit={
                      openEditForm
                    }
                    onDelete={
                      deleteRecord
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </section>

      {/* ================================================== */}
      {/* LỊCH SỬ */}
      {/* ================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                📋 Lịch sử cho ăn
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Những lần đã được đánh dấu là đã cho ăn.
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              {historyRecords.length} kết quả
            </div>

          </div>

          {/* BỘ LỌC */}

          <div className="mt-5 grid gap-4 md:grid-cols-4">

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Loài
              </label>

              <select
                value={
                  historySpeciesId
                }
                onChange={(event) => {
                  setHistorySpeciesId(
                    event.target.value
                  );

                  setHistoryAnimalId(
                    ""
                  );
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >

                <option value="">
                  Tất cả loài
                </option>

                {speciesList.map(
                  (species) => (
                    <option
                      key={
                        species
                      }
                      value={
                        species
                      }
                    >
                      {species}
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Con vật
              </label>

              <select
                value={
                  historyAnimalId
                }
                onChange={(event) =>
                  setHistoryAnimalId(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >

                <option value="">
                  Tất cả con vật
                </option>

                {filteredHistoryAnimals.map(
                  (animal) => (
                    <option
                      key={
                        animal.id
                      }
                      value={
                        animal.id
                      }
                    >
                      {animal.name} —{" "}
                      {
                        animal.code
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Từ ngày
              </label>

              <input
                type="date"
                value={
                  historyFrom
                }
                onChange={(event) =>
                  setHistoryFrom(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Đến ngày
              </label>

              <input
                type="date"
                value={
                  historyTo
                }
                onChange={(event) =>
                  setHistoryTo(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

            </div>

          </div>

          {(historySpeciesId ||
            historyAnimalId ||
            historyFrom ||
            historyTo) && (
            <button
              type="button"
              onClick={() => {
                setHistorySpeciesId(
                  ""
                );
                setHistoryAnimalId(
                  ""
                );
                setHistoryFrom(
                  ""
                );
                setHistoryTo(
                  ""
                );
              }}
              className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              ✕ Xóa bộ lọc
            </button>
          )}

        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Đang tải dữ liệu...
          </div>
        ) : historyRecords.length ===
          0 ? (
          <EmptyState
            icon="📋"
            title="Chưa có lịch sử cho ăn"
            description="Khi bạn đánh dấu một lịch là Đã cho ăn, lịch đó sẽ xuất hiện ở đây."
          />
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px]">

              <thead>

                <tr className="border-b border-slate-100 bg-slate-50 text-left text-sm text-slate-500">

                  <th className="px-5 py-4 font-semibold">
                    Ngày
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Con vật
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Thức ăn
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Khối lượng
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Ghi chú
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Thao tác
                  </th>

                </tr>

              </thead>

              <tbody>

                {historyRecords.map(
                  (record) => (
                    <tr
                      key={
                        record.id
                      }
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >

                      <td className="px-5 py-4">

                        <div className="font-semibold text-slate-900">
                          {formatDate(
                            record.date
                          )}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                          ⏰{" "}
                          {
                            record.time
                          }
                        </div>

                      </td>

                      <td className="px-5 py-4">

                        <div className="font-semibold text-slate-900">
                          {getAnimalName(
                            animals,
                            record.animalId
                          )}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                          {getAnimalCode(
                            animals,
                            record.animalId
                          )}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {getAnimalInfo(
                            animals,
                            record.animalId
                          )}
                        </div>

                      </td>

                      <td className="px-5 py-4">

                        <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700">
                          🍗{" "}
                          {
                            record.food
                          }
                        </span>

                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {record.amount ||
                          "—"}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm text-slate-500">
                        {record.note ||
                          "—"}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                record
                              )
                            }
                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteRecord(
                                record.id
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            🗑️
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* ================================================== */}
      {/* MODAL */}
      {/* ================================================== */}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >

          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div>

                <h2 className="text-2xl font-bold text-slate-900">
                  {editingId
                    ? "Sửa lịch cho ăn"
                    : "Thêm lịch cho ăn"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Nhập thông tin lần cho ăn.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >

              {/* ================================================== */}
              {/* LOÀI */}
              {/* ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Loài *
                </label>

                <select
                  required
                  value={
                    speciesId
                  }
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setSpeciesId(
                      value
                    );

                    setAnimalId(
                      ""
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >

                  <option value="">
                    — Chọn loài —
                  </option>

                  {speciesList.map(
                    (species) => (
                      <option
                        key={
                          species
                        }
                        value={
                          species
                        }
                      >
                        {species}
                      </option>
                    )
                  )}

                </select>

                <p className="mt-2 text-xs text-slate-400">
                  Chọn loài trước, sau đó chọn cá thể thuộc loài đó.
                </p>

              </div>

              {/* ================================================== */}
              {/* CON VẬT */}
              {/* ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Con vật *
                </label>

                <select
                  required
                  value={
                    animalId
                  }
                  disabled={
                    !speciesId
                  }
                  onChange={(event) =>
                    setAnimalId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >

                  <option value="">
                    {!speciesId
                      ? "— Hãy chọn loài trước —"
                      : "— Chọn con vật —"}
                  </option>

                  {filteredAnimals.map(
                    (animal) => (
                      <option
                        key={
                          animal.id
                        }
                        value={
                          animal.id
                        }
                      >
                        {animal.name} —{" "}
                        {
                          animal.code
                        }
                        {animal.genetics
                          ? ` — ${animal.genetics}`
                          : ""}
                      </option>
                    )
                  )}

                </select>

                {animalId && (
                  <p className="mt-2 text-xs text-slate-400">
                    {getAnimalInfo(
                      animals,
                      animalId
                    )}
                  </p>
                )}

              </div>

              {/* ================================================== */}
              {/* NGÀY + GIỜ */}
              {/* ================================================== */}

              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Ngày cho ăn *
                  </label>

                  <input
                    required
                    type="date"
                    value={
                      date
                    }
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Giờ cho ăn *
                  </label>

                  <input
                    required
                    type="time"
                    value={
                      time
                    }
                    onChange={(event) =>
                      setTime(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

              </div>

              {/* ================================================== */}
              {/* THỨC ĂN */}
              {/* ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Loại thức ăn *
                </label>

                <input
                  required
                  type="text"
                  value={
                    food
                  }
                  onChange={(event) =>
                    setFood(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Chuột đông lạnh, dế, sâu..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              {/* ================================================== */}
              {/* KHỐI LƯỢNG */}
              {/* ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Khối lượng / số lượng
                </label>

                <input
                  type="text"
                  value={
                    amount
                  }
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: 20g, 1 con, 3 con..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              {/* ================================================== */}
              {/* GHI CHÚ */}
              {/* ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Ghi chú
                </label>

                <textarea
                  rows={4}
                  value={
                    note
                  }
                  onChange={(event) =>
                    setNote(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Ăn tốt, bỏ ăn, cần theo dõi..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              {/* ================================================== */}
              {/* FOOTER */}
              {/* ================================================== */}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  {editingId && (
                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() => {
                        deleteRecord(
                          editingId
                        );
                      }}
                      className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      🗑️ Xóa
                    </button>
                  )}

                </div>

                <div className="flex gap-3">

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      closeForm
                    }
                    className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="rounded-xl bg-emerald-600 px-7 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingId
                      ? "Lưu thay đổi"
                      : "Thêm lịch"}
                  </button>

                </div>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

// ==================================================
// STAT CARD
// ==================================================

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="text-3xl">
        {icon}
      </div>

      <div className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-sm text-slate-500">
        {label}
      </div>

    </div>
  );
}

// ==================================================
// EMPTY STATE
// ==================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-10 text-center">

      <div className="text-5xl">
        {icon}
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>

    </div>
  );
}

// ==================================================
// FEEDING ITEM
// ==================================================

function FeedingItem({
  record,
  animals,
  onToggle,
  onEdit,
  onDelete,
}: {
  record: FeedingRecord;
  animals: Animal[];
  onToggle: (
    id: string
  ) => void;
  onEdit: (
    record: FeedingRecord
  ) => void;
  onDelete: (
    id: string
  ) => void;
}) {
  return (
    <div
      className={`p-5 transition ${
        record.completed
          ? "bg-slate-50"
          : "bg-white hover:bg-slate-50"
      }`}
    >

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-start gap-4">

          <button
            type="button"
            onClick={() =>
              onToggle(
                record.id
              )
            }
            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-bold transition ${
              record.completed
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-300 bg-white hover:border-emerald-500"
            }`}
          >
            {record.completed
              ? "✓"
              : ""}
          </button>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-3">

              <h3
                className={`text-lg font-bold ${
                  record.completed
                    ? "text-slate-400 line-through"
                    : "text-slate-900"
                }`}
              >
                {getAnimalName(
                  animals,
                  record.animalId
                )}
              </h3>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {getAnimalCode(
                  animals,
                  record.animalId
                )}
              </span>

              {record.completed && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Đã cho ăn
                </span>
              )}

            </div>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">

              <span>
                📅{" "}
                {formatDate(
                  record.date
                )}
              </span>

              <span>
                ⏰{" "}
                {record.time}
              </span>

              <span>
                🍗{" "}
                {record.food}
              </span>

              {record.amount && (
                <span>
                  ⚖️{" "}
                  {
                    record.amount
                  }
                </span>
              )}

            </div>

            {record.note && (
              <div className="mt-2 text-sm text-slate-500">
                📝{" "}
                {record.note}
              </div>
            )}

          </div>

        </div>

        <div className="flex shrink-0 gap-2">

          <button
            type="button"
            onClick={() =>
              onEdit(record)
            }
            className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            ✏️ Sửa
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(
                record.id
              )
            }
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            🗑️ Xóa
          </button>

        </div>

      </div>

    </div>
  );
}