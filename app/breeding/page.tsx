"use client";

import { useEffect, useMemo, useState } from "react";

type Sex =
  | "MALE"
  | "FEMALE"
  | "UNKNOWN";

type BreedingType =
  | "SAME_SPECIES"
  | "CROSSBREED";

type Animal = {
  id: string;
  code: string;
  name: string;
  sex: Sex;

  weight?: string | number | null;
  genetics?: string | null;

  species?: {
    id: string;
    name: string;
  } | null;

  morph?: {
    id: string;
    name: string;
  } | null;
};

type Breeding = {
  id: string;

  maleId?: string | null;
  femaleId: string;

  male?: Animal | null;
  female?: Animal | null;

  breedingType?:
    | BreedingType
    | null;

  startDate?: string | null;
  pairingDate?: string | null;
  expectedDate?: string | null;
  layingDate?: string | null;

  status:
    | "PLANNED"
    | "PAIRING"
    | "PREGNANT"
    | "LAID_EGGS"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";

  eggCount?: number | null;

  offspringTotal?: number | null;
  offspringFemale?: number | null;
  offspringMale?: number | null;
  offspringDead?: number | null;

  notes?: string | null;
};

const statusOptions = [
  {
    value: "PLANNED",
    label: "Đã lên kế hoạch",
  },
  {
    value: "PAIRING",
    label: "Đã phối",
  },
  {
    value: "PREGNANT",
    label: "Đang mang thai",
  },
  {
    value: "LAID_EGGS",
    label: "Đã đẻ trứng",
  },
  {
    value: "COMPLETED",
    label: "Hoàn thành",
  },
  {
    value: "FAILED",
    label: "Thất bại",
  },
  {
    value: "CANCELLED",
    label: "Đã hủy",
  },
];

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "vi-VN"
  );
}

function formatDateInput(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStatusLabel(
  status: string
) {
  return (
    statusOptions.find(
      (item) =>
        item.value === status
    )?.label || status
  );
}

function getStatusClass(
  status: string
) {
  switch (status) {
    case "PLANNED":
      return "bg-slate-100 text-slate-700";

    case "PAIRING":
      return "bg-blue-100 text-blue-700";

    case "PREGNANT":
      return "bg-pink-100 text-pink-700";

    case "LAID_EGGS":
      return "bg-yellow-100 text-yellow-700";

    case "COMPLETED":
      return "bg-green-100 text-green-700";

    case "FAILED":
      return "bg-red-100 text-red-700";

    case "CANCELLED":
      return "bg-gray-200 text-gray-600";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getBreedingTypeLabel(
  type?: BreedingType | null
) {
  if (
    type === "CROSSBREED"
  ) {
    return "🧬 Lai khác loài";
  }

  return "🐍 Cùng loài";
}

function getBreedingTypeClass(
  type?: BreedingType | null
) {
  if (
    type === "CROSSBREED"
  ) {
    return "bg-purple-100 text-purple-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

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
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="text-2xl sm:text-3xl">
        {icon}
      </div>

      <div className="mt-2 text-2xl font-bold text-slate-900 sm:mt-3 sm:text-3xl">
        {value}
      </div>

      <div className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm">
        {label}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}

function ResultBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-lg font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {label}
      </div>
    </div>
  );
}

export default function BreedingPage() {
  const [breedings, setBreedings] =
    useState<Breeding[]>([]);

  const [animals, setAnimals] =
    useState<Animal[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  // ==================================================
  // FORM
  // ==================================================

  const [
    breedingType,
    setBreedingType,
  ] =
    useState<BreedingType>(
      "SAME_SPECIES"
    );

  const [
    selectedSpeciesId,
    setSelectedSpeciesId,
  ] = useState("");

  const [maleId, setMaleId] =
    useState("");

  const [femaleId, setFemaleId] =
    useState("");

  const [pairingDate, setPairingDate] =
    useState("");

  const [expectedDate, setExpectedDate] =
    useState("");

  const [layingDate, setLayingDate] =
    useState("");

  const [status, setStatus] =
    useState("PLANNED");

  const [eggCount, setEggCount] =
    useState("");

  const [offspringTotal, setOffspringTotal] =
    useState("");

  const [offspringFemale, setOffspringFemale] =
    useState("");

  const [offspringMale, setOffspringMale] =
    useState("");

  const [offspringDead, setOffspringDead] =
    useState("");

  const [notes, setNotes] =
    useState("");

  // ==================================================
  // LOAD DATA
  // ==================================================

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        breedingResponse,
        animalsResponse,
      ] = await Promise.all([
        fetch(
          "/api/breeding",
          {
            cache:
              "no-store",
          }
        ),

        fetch(
          "/api/animals",
          {
            cache:
              "no-store",
          }
        ),
      ]);

      if (
        !breedingResponse.ok
      ) {
        throw new Error(
          "Không thể tải danh sách sinh sản."
        );
      }

      if (
        !animalsResponse.ok
      ) {
        throw new Error(
          "Không thể tải danh sách động vật."
        );
      }

      const breedingData =
        await breedingResponse.json();

      const animalsData =
        await animalsResponse.json();

      setBreedings(
        Array.isArray(
          breedingData
        )
          ? breedingData
          : []
      );

      setAnimals(
        Array.isArray(
          animalsData
        )
          ? animalsData
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ==================================================
  // DANH SÁCH LOÀI
  // ==================================================

  const speciesList =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      animals.forEach(
        (animal) => {
          if (
            animal.species?.id &&
            animal.species.name
          ) {
            map.set(
              animal.species.id,
              animal.species.name
            );
          }
        }
      );

      return Array.from(
        map.entries()
      )
        .map(
          ([
            id,
            name,
          ]) => ({
            id,
            name,
          })
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "vi"
            )
        );
    }, [animals]);

  // ==================================================
  // ĐỰC / CÁI
  // ==================================================

  const maleAnimals =
    useMemo(
      () =>
        animals.filter(
          (animal) =>
            animal.sex ===
            "MALE"
        ),
      [animals]
    );

  const femaleAnimals =
    useMemo(
      () =>
        animals.filter(
          (animal) =>
            animal.sex ===
            "FEMALE"
        ),
      [animals]
    );

  // ==================================================
  // CON CÁI ĐANG BẬN SINH SẢN
  // PLANNED / PAIRING / PREGNANT không được phối thêm.
  // Khi sửa chính lần phối hiện tại thì vẫn cho phép con cái đó.
  // ==================================================

  const activeFemaleBreedingIds =
    useMemo(() => {
      const ids = new Set<string>();

      breedings.forEach((breeding) => {
        if (
          breeding.femaleId &&
          ["PLANNED", "PAIRING", "PREGNANT"].includes(
            breeding.status
          ) &&
          breeding.id !== editingId
        ) {
          ids.add(breeding.femaleId);
        }
      });

      return ids;
    }, [breedings, editingId]);

  // ==================================================
  // LỌC ĐỰC
  // ==================================================

  const filteredMales =
    useMemo(() => {
      let result =
        maleAnimals;

      if (
        breedingType ===
        "SAME_SPECIES"
      ) {
        if (
          !selectedSpeciesId
        ) {
          return [];
        }

        result =
          result.filter(
            (animal) =>
              animal.species
                ?.id ===
              selectedSpeciesId
          );
      }

      return result.filter(
        (animal) =>
          animal.id !==
          femaleId
      );
    }, [
      maleAnimals,
      breedingType,
      selectedSpeciesId,
      femaleId,
    ]);

  // ==================================================
  // LỌC CÁI
  // ==================================================

  const filteredFemales =
    useMemo(() => {
      let result =
        femaleAnimals;

      if (
        breedingType ===
        "SAME_SPECIES"
      ) {
        if (
          !selectedSpeciesId
        ) {
          return [];
        }

        result =
          result.filter(
            (animal) =>
              animal.species
                ?.id ===
              selectedSpeciesId
          );
      }

      return result.filter(
        (animal) =>
          animal.id !== maleId &&
          !activeFemaleBreedingIds.has(
            animal.id
          )
      );
    }, [
      femaleAnimals,
      breedingType,
      selectedSpeciesId,
      maleId,
      activeFemaleBreedingIds,
    ]);

  // ==================================================
  // CÁ THỂ ĐANG CHỌN
  // ==================================================

  const selectedMale =
    animals.find(
      (animal) =>
        animal.id ===
        maleId
    );

  const selectedFemale =
    animals.find(
      (animal) =>
        animal.id ===
        femaleId
    );

  // ==================================================
  // RESET FORM
  // ==================================================

  function resetForm() {
    setEditingId(null);

    setBreedingType(
      "SAME_SPECIES"
    );

    setSelectedSpeciesId("");

    setMaleId("");
    setFemaleId("");

    setPairingDate("");
    setExpectedDate("");
    setLayingDate("");

    setStatus(
      "PLANNED"
    );

    setEggCount("");

    setOffspringTotal("");
    setOffspringFemale("");
    setOffspringMale("");
    setOffspringDead("");

    setNotes("");

    setError("");
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  // ==================================================
  // EDIT
  // ==================================================

  function openEditForm(
    breeding: Breeding
  ) {
    setEditingId(
      breeding.id
    );

    setBreedingType(
      breeding.breedingType ===
        "CROSSBREED"
        ? "CROSSBREED"
        : "SAME_SPECIES"
    );

    setSelectedSpeciesId(
      breeding.male?.species
        ?.id ||
        breeding.female
          ?.species?.id ||
        ""
    );

    setMaleId(
      breeding.maleId || ""
    );

    setFemaleId(
      breeding.femaleId || ""
    );

    setPairingDate(
      formatDateInput(
        breeding.pairingDate ||
          breeding.startDate
      )
    );

    setExpectedDate(
      formatDateInput(
        breeding.expectedDate
      )
    );

    setLayingDate(
      formatDateInput(
        breeding.layingDate
      )
    );

    setStatus(
      breeding.status
    );

    setEggCount(
      breeding.eggCount ==
        null
        ? ""
        : String(
            breeding.eggCount
          )
    );

    setOffspringTotal(
      breeding.offspringTotal ==
        null
        ? ""
        : String(
            breeding.offspringTotal
          )
    );

    setOffspringFemale(
      breeding.offspringFemale ==
        null
        ? ""
        : String(
            breeding.offspringFemale
          )
    );

    setOffspringMale(
      breeding.offspringMale ==
        null
        ? ""
        : String(
            breeding.offspringMale
          )
    );

    setOffspringDead(
      breeding.offspringDead ==
        null
        ? ""
        : String(
            breeding.offspringDead
          )
    );

    setNotes(
      breeding.notes || ""
    );

    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
  }

  // ==================================================
  // ĐỔI KIỂU
  // ==================================================

  function changeBreedingType(
    type: BreedingType
  ) {
    setBreedingType(type);

    setMaleId("");
    setFemaleId("");

    if (
      type ===
      "CROSSBREED"
    ) {
      setSelectedSpeciesId("");
    }
  }

  // ==================================================
  // CHỌN LOÀI
  // ==================================================

  function changeSpecies(
    speciesId: string
  ) {
    setSelectedSpeciesId(
      speciesId
    );

    setMaleId("");
    setFemaleId("");
  }

  // ==================================================
  // SAVE
  // ==================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!maleId) {
      setError(
        "Bạn chưa chọn con đực."
      );
      return;
    }

    if (!femaleId) {
      setError(
        "Bạn chưa chọn con cái."
      );
      return;
    }

    if (
      maleId ===
      femaleId
    ) {
      setError(
        "Con đực và con cái không thể là cùng một cá thể."
      );
      return;
    }

    if (
      breedingType ===
        "SAME_SPECIES" &&
      !selectedSpeciesId
    ) {
      setError(
        "Bạn chưa chọn loài."
      );
      return;
    }

    if (
      breedingType ===
      "SAME_SPECIES"
    ) {
      if (
        selectedMale?.species
          ?.id !==
          selectedSpeciesId ||
        selectedFemale?.species
          ?.id !==
          selectedSpeciesId
      ) {
        setError(
          "Con đực và con cái phải cùng loài."
        );
        return;
      }
    }

    if (
      breedingType ===
      "CROSSBREED"
    ) {
      if (
        selectedMale?.species
          ?.id ===
          selectedFemale
            ?.species?.id
      ) {
        setError(
          "Hai cá thể đang cùng loài. Hãy chọn chế độ Sinh sản cùng loài."
        );
        return;
      }
    }

    // Chặn con cái đang thuộc một lần phối PLANNED / PAIRING / PREGNANT.
    if (
      activeFemaleBreedingIds.has(
        femaleId
      )
    ) {
      setError(
        "Con cái này đang ở một lần phối khác (đã lên kế hoạch, đã phối hoặc đang mang thai), không thể thêm lần phối mới."
      );
      return;
    }

    if (
      status ===
      "COMPLETED"
    ) {
      const total =
        Number(
          offspringTotal || 0
        );

      const female =
        Number(
          offspringFemale || 0
        );

      const male =
        Number(
          offspringMale || 0
        );

      const dead =
        Number(
          offspringDead || 0
        );

      if (
        female + male >
        total
      ) {
        setError(
          "Số con đực + số con cái không thể lớn hơn tổng số con."
        );
        return;
      }

      if (dead > total) {
        setError(
          "Số con chết không thể lớn hơn tổng số con."
        );
        return;
      }
    }

    try {
      setSaving(true);

      const isEditing =
        editingId !== null;

      const response =
        await fetch(
          "/api/breeding",
          {
            method: isEditing
              ? "PATCH"
              : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id:
                editingId ||
                undefined,

              breedingType,

              maleId,

              femaleId,

              startDate:
                pairingDate ||
                null,

              pairingDate:
                pairingDate ||
                null,

              expectedDate:
                expectedDate ||
                null,

              layingDate:
                layingDate ||
                null,

              status,

              eggCount:
                status ===
                "LAID_EGGS"
                  ? eggCount ||
                    null
                  : null,

              offspringTotal:
                status ===
                "COMPLETED"
                  ? offspringTotal ||
                    null
                  : null,

              offspringFemale:
                status ===
                "COMPLETED"
                  ? offspringFemale ||
                    null
                  : null,

              offspringMale:
                status ===
                "COMPLETED"
                  ? offspringMale ||
                    null
                  : null,

              offspringDead:
                status ===
                "COMPLETED"
                  ? offspringDead ||
                    null
                  : null,

              notes:
                notes.trim() ||
                null,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.detail ||
            "Không thể lưu lần phối."
        );
      }

      setShowForm(false);

      resetForm();

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu lần phối."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==================================================
  // DELETE
  // ==================================================

  async function handleDelete(
    id: string
  ) {
    try {
      setSaving(true);

      const response =
        await fetch(
          `/api/breeding?id=${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.detail ||
            "Không thể xóa lần phối."
        );
      }

      setShowForm(false);

      resetForm();

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể xóa lần phối."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==================================================
  // THỐNG KÊ
  // ==================================================

  const totalBreedings =
    breedings.length;

  const pregnantCount =
    breedings.filter(
      (item) =>
        item.status ===
        "PREGNANT"
    ).length;

  const laidEggsCount =
    breedings.filter(
      (item) =>
        item.status ===
        "LAID_EGGS"
    ).length;

  const completedCount =
    breedings.filter(
      (item) =>
        item.status ===
        "COMPLETED"
    ).length;

  const totalEggs =
    breedings.reduce(
      (sum, item) =>
        sum +
        Number(
          item.eggCount || 0
        ),
      0
    );

  const totalOffspring =
    breedings.reduce(
      (sum, item) =>
        sum +
        Number(
          item.offspringTotal ||
            0
        ),
      0
    );

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-[#f7f9f8] px-3 py-4 text-slate-900 sm:px-5 sm:py-6 md:p-6">

      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}

        <div className="mb-5 flex flex-col justify-between gap-3 sm:mb-6 sm:gap-4 md:flex-row md:items-center">

          <div>
            <p className="text-sm text-slate-500">
              Quản lý trang trại
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              🥚 Sinh sản
            </h1>

            <p className="mt-1 text-slate-500">
              Quản lý các lần phối, sinh sản và lai.
            </p>
          </div>

          <button
            type="button"
            onClick={
              openAddForm
            }
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 sm:w-auto sm:px-5 sm:text-base"
          >
            + Thêm lần phối
          </button>

        </div>

        {/* STATS */}

        <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">

          <StatCard
            icon="🥚"
            value={
              totalBreedings
            }
            label="Tổng lần phối"
          />

          <StatCard
            icon="🤰"
            value={
              pregnantCount
            }
            label="Đang mang thai"
          />

          <StatCard
            icon="🥚"
            value={
              laidEggsCount
            }
            label="Đã đẻ trứng"
          />

          <StatCard
            icon="🐣"
            value={
              completedCount
            }
            label="Hoàn thành"
          />

          <StatCard
            icon="🥚"
            value={
              totalEggs
            }
            label="Tổng số trứng"
          />

          <StatCard
            icon="🐍"
            value={
              totalOffspring
            }
            label="Tổng số con"
          />

        </div>

        {/* ERROR */}

        {error &&
          !showForm && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

        {/* LIST */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

            <div>
              <h2 className="text-lg font-bold sm:text-xl">
                Các lần phối
              </h2>

              <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm">
                Danh sách các lần phối đã ghi nhận.
              </p>
            </div>

            <button
              type="button"
              onClick={
                loadData
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Làm mới
            </button>

          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Đang tải dữ liệu...
            </div>
          ) : breedings.length ===
            0 ? (
            <div className="p-12 text-center">

              <div className="text-6xl">
                🥚
              </div>

              <h3 className="mt-4 text-xl font-bold">
                Chưa có lần phối nào
              </h3>

              <p className="mt-2 text-slate-500">
                Hãy thêm lần phối đầu tiên.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {breedings.map(
                (breeding) => {

                  const male =
                    breeding.male;

                  const female =
                    breeding.female;

                  return (
                    <div
                      key={
                        breeding.id
                      }
                      className="p-3 transition hover:bg-slate-50 sm:p-5"
                    >

                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getBreedingTypeClass(
                                breeding.breedingType
                              )}`}
                            >
                              {
                                getBreedingTypeLabel(
                                  breeding.breedingType
                                )
                              }
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                breeding.status
                              )}`}
                            >
                              {
                                getStatusLabel(
                                  breeding.status
                                )
                              }
                            </span>

                          </div>

                          <h3 className="mt-3 text-lg font-bold">

                            {male?.name ||
                              "Không có con đực"}

                            <span className="mx-2 text-slate-400">
                              ×
                            </span>

                            {female?.name ||
                              "Không xác định"}

                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">

                            <span>
                              ♂️{" "}
                              {
                                male
                                  ?.species
                                  ?.name
                              }
                            </span>

                            <span>
                              ♀️{" "}
                              {
                                female
                                  ?.species
                                  ?.name
                              }
                            </span>

                            <span>
                              📅{" "}
                              {formatDate(
                                breeding.pairingDate ||
                                  breeding.startDate
                              )}
                            </span>

                          </div>

                          {breeding.breedingType ===
                            "CROSSBREED" && (
                            <p className="mt-2 text-sm font-semibold text-purple-700">
                              🧬 Lai khác loài
                            </p>
                          )}

                        </div>

                        {/* KẾT QUẢ */}

                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">

                          {breeding.status ===
                            "LAID_EGGS" &&
                            breeding.eggCount !=
                              null && (
                              <ResultBox
                                label="Trứng"
                                value={String(
                                  breeding.eggCount
                                )}
                              />
                            )}

                          {breeding.status ===
                            "COMPLETED" && (
                            <>
                              <ResultBox
                                label="Tổng con"
                                value={String(
                                  breeding.offspringTotal ||
                                    0
                                )}
                              />

                              <ResultBox
                                label="Cái"
                                value={String(
                                  breeding.offspringFemale ||
                                    0
                                )}
                              />

                              <ResultBox
                                label="Đực"
                                value={String(
                                  breeding.offspringMale ||
                                    0
                                )}
                              />

                              <ResultBox
                                label="Chết"
                                value={String(
                                  breeding.offspringDead ||
                                    0
                                )}
                              />
                            </>
                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(
                              breeding
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white sm:w-auto sm:px-4 sm:text-sm"
                        >
                          ✏️ Sửa
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>

      {/* ================================================== */}
      {/* MODAL */}
      {/* ================================================== */}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >

          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">

              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  {editingId
                    ? "Sửa lần phối"
                    : "Thêm lần phối"}
                </h2>

                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm">
                  Chọn kiểu sinh sản và cặp cá thể.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-500 hover:bg-slate-200"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="p-4 sm:p-6"
            >

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* KIỂU SINH SẢN */}

              <section>

                <h3 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold">
                  🧬 Kiểu sinh sản
                </h3>

                <div className="grid gap-4 md:grid-cols-2">

                  <button
                    type="button"
                    onClick={() =>
                      changeBreedingType(
                        "SAME_SPECIES"
                      )
                    }
                    className={`rounded-2xl border-2 p-5 text-left transition ${
                      breedingType ===
                      "SAME_SPECIES"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >

                    <div className="text-2xl sm:text-3xl">
                      🐍
                    </div>

                    <div className="mt-2 font-bold">
                      Sinh sản cùng loài
                    </div>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm">
                      Chỉ cho phép đực và cái cùng loài.
                    </p>

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeBreedingType(
                        "CROSSBREED"
                      )
                    }
                    className={`rounded-2xl border-2 p-5 text-left transition ${
                      breedingType ===
                      "CROSSBREED"
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >

                    <div className="text-2xl sm:text-3xl">
                      🧬
                    </div>

                    <div className="mt-2 font-bold">
                      Lai khác loài
                    </div>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm">
                      Cho phép đực và cái thuộc hai loài khác nhau.
                    </p>

                  </button>

                </div>

              </section>

              {/* LOÀI */}

              {breedingType ===
                "SAME_SPECIES" && (
                <section className="mt-7">

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    🐾 Loài *
                  </label>

                  <select
                    value={
                      selectedSpeciesId
                    }
                    onChange={(
                      event
                    ) =>
                      changeSpecies(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >

                    <option value="">
                      — Chọn loài —
                    </option>

                    {speciesList.map(
                      (
                        species
                      ) => (
                        <option
                          key={
                            species.id
                          }
                          value={
                            species.id
                          }
                        >
                          {
                            species.name
                          }
                        </option>
                      )
                    )}

                  </select>

                  <p className="mt-2 text-xs text-slate-400">
                    Sau khi chọn loài, hệ thống chỉ hiện cá thể đực/cái thuộc loài đó.
                  </p>

                </section>
              )}

              {/* CẶP */}

              <section className="mt-7">

                <h3 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold">
                  🐾 Cặp sinh sản
                </h3>

                <div className="grid gap-4 md:gap-5 md:grid-cols-2">

                  {/* ĐỰC */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      ♂️ Con đực *
                    </label>

                    <select
                      value={
                        maleId
                      }
                      onChange={(
                        event
                      ) =>
                        setMaleId(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                    >

                      <option value="">
                        — Chọn con đực —
                      </option>

                      {filteredMales.map(
                        (
                          animal
                        ) => (
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
                            }
                            {" — "}
                            {
                              animal.code
                            }
                            {" — "}
                            {
                              animal
                                .species
                                ?.name
                            }
                            {animal.morph
                              ?.name
                              ? ` — ${animal.morph.name}`
                              : ""}
                            {animal.genetics
                              ? ` — 🧬 ${animal.genetics}`
                              : ""}
                          </option>
                        )
                      )}

                    </select>

                    {filteredMales.length ===
                      0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        {breedingType ===
                        "SAME_SPECIES"
                          ? selectedSpeciesId
                            ? "Loài này chưa có con đực."
                            : "Hãy chọn loài trước."
                          : "Chưa có cá thể đực nào."}
                      </p>
                    )}

                  </div>

                  {/* CÁI */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      ♀️ Con cái *
                    </label>

                    <select
                      value={
                        femaleId
                      }
                      onChange={(
                        event
                      ) =>
                        setFemaleId(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                    >

                      <option value="">
                        — Chọn con cái —
                      </option>

                      {filteredFemales.map(
                        (
                          animal
                        ) => (
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
                            }
                            {" — "}
                            {
                              animal.code
                            }
                            {" — "}
                            {
                              animal
                                .species
                                ?.name
                            }
                            {animal.morph
                              ?.name
                              ? ` — ${animal.morph.name}`
                              : ""}
                            {animal.genetics
                              ? ` — 🧬 ${animal.genetics}`
                              : ""}
                          </option>
                        )
                      )}

                    </select>

                    {filteredFemales.length ===
                      0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        {breedingType ===
                        "SAME_SPECIES"
                          ? selectedSpeciesId
                            ? "Loài này không có con cái đang sẵn sàng sinh sản. Con cái đã lên kế hoạch, đã phối hoặc đang mang thai sẽ không được chọn."
                            : "Hãy chọn loài trước."
                          : "Không có con cái đang sẵn sàng sinh sản. Con cái đã lên kế hoạch, đã phối hoặc đang mang thai sẽ không được chọn."}
                      </p>
                    )}

                  </div>

                </div>

                {/* PREVIEW */}

                {selectedMale &&
                  selectedFemale && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                      <p className="text-sm font-semibold text-slate-500">
                        Cặp đang chọn
                      </p>

                      <div className="mt-2 text-lg font-bold">
                        {selectedMale.name}

                        <span className="mx-2 text-slate-400">
                          ×
                        </span>

                        {selectedFemale.name}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          ♂️{" "}
                          {
                            selectedMale
                              .species
                              ?.name
                          }
                        </span>

                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                          ♀️{" "}
                          {
                            selectedFemale
                              .species
                              ?.name
                          }
                        </span>

                        {selectedMale
                          .morph
                          ?.name && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                            ♂{" "}
                            {
                              selectedMale
                                .morph
                                .name
                            }
                          </span>
                        )}

                        {selectedFemale
                          .morph
                          ?.name && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                            ♀{" "}
                            {
                              selectedFemale
                                .morph
                                .name
                            }
                          </span>
                        )}

                        {breedingType ===
                          "CROSSBREED" && (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                            🧬 Lai khác loài
                          </span>
                        )}

                      </div>

                    </div>
                  )}

              </section>

              {/* NGÀY */}

              <section className="mt-7">

                <h3 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold">
                  📅 Thời gian
                </h3>

                <div className="grid gap-5 md:grid-cols-3">

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Ngày phối / bắt đầu
                    </label>

                    <input
                      type="date"
                      value={
                        pairingDate
                      }
                      onChange={(
                        event
                      ) =>
                        setPairingDate(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Ngày dự kiến đẻ
                    </label>

                    <input
                      type="date"
                      value={
                        expectedDate
                      }
                      onChange={(
                        event
                      ) =>
                        setExpectedDate(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Ngày đẻ
                    </label>

                    <input
                      type="date"
                      value={
                        layingDate
                      }
                      onChange={(
                        event
                      ) =>
                        setLayingDate(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                </div>

              </section>

              {/* TRẠNG THÁI */}

              <section className="mt-7">

                <h3 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold">
                  📌 Trạng thái
                </h3>

                <select
                  value={
                    status
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                >

                  {statusOptions.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}

                </select>

              </section>

              {/* TRỨNG */}

              {status ===
                "LAID_EGGS" && (
                <section className="mt-7">

                  <h3 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold">
                    🥚 Kết quả đẻ trứng
                  </h3>

                  <NumberField
                    label="🥚 Số trứng"
                    value={
                      eggCount
                    }
                    onChange={
                      setEggCount
                    }
                    placeholder="Ví dụ: 8"
                  />

                </section>
              )}

              {/* CON */}

              {status ===
                "COMPLETED" && (
                <section className="mt-7">

                  <h3 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold">
                    🐣 Kết quả sinh sản
                  </h3>

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                    <NumberField
                      label="🐣 Tổng số con"
                      value={
                        offspringTotal
                      }
                      onChange={
                        setOffspringTotal
                      }
                      placeholder="Ví dụ: 8"
                    />

                    <NumberField
                      label="♀️ Số con cái"
                      value={
                        offspringFemale
                      }
                      onChange={
                        setOffspringFemale
                      }
                      placeholder="Ví dụ: 4"
                    />

                    <NumberField
                      label="♂️ Số con đực"
                      value={
                        offspringMale
                      }
                      onChange={
                        setOffspringMale
                      }
                      placeholder="Ví dụ: 3"
                    />

                    <NumberField
                      label="💀 Số con chết"
                      value={
                        offspringDead
                      }
                      onChange={
                        setOffspringDead
                      }
                      placeholder="Ví dụ: 1"
                    />

                  </div>

                </section>
              )}

              {/* GHI CHÚ */}

              <section className="mt-7">

                <h3 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold">
                  📝 Ghi chú
                </h3>

                <textarea
                  rows={4}
                  value={
                    notes
                  }
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ghi chú về lần phối..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </section>

              {/* FOOTER */}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          editingId
                        )
                      }
                      disabled={
                        saving
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      🗑️ Xóa lần phối
                    </button>
                  )}
                </div>

                <div className="flex gap-3">

                  <button
                    type="button"
                    onClick={
                      closeForm
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="rounded-xl bg-emerald-600 px-7 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingId
                      ? "Lưu thay đổi"
                      : "Thêm lần phối"}
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