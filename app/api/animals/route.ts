import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeSex(sex: unknown) {
  if (
    sex === "MALE" ||
    sex === "Đực" ||
    sex === "male"
  ) {
    return "MALE" as const;
  }

  if (
    sex === "FEMALE" ||
    sex === "Cái" ||
    sex === "female"
  ) {
    return "FEMALE" as const;
  }

  return "UNKNOWN" as const;
}

function parseNumber(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

// ==================================================
// GET - LẤY DANH SÁCH ĐỘNG VẬT
// ==================================================

export async function GET() {
  try {
    const animals =
      await prisma.animal.findMany({
        include: {
          species: true,

          morph: true,

          images: true,

          father: {
            select: {
              id: true,
              code: true,
              name: true,
              genetics: true,
            },
          },

          mother: {
            select: {
              id: true,
              code: true,
              name: true,
              genetics: true,
            },
          },

          offspring: {
            include: {
              breeding: {
                include: {
                  male: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      genetics: true,
                    },
                  },

                  female: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      genetics: true,
                    },
                  },
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(
      animals
    );
  } catch (error) {
    console.error(
      "GET /api/animals error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể lấy danh sách động vật.",

        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// POST - THÊM ĐỘNG VẬT
// ==================================================

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const {
      name,
      species,
      morph,
      sex,
      weight,
      purchasePrice,
      notes,
      genetics,
      fatherId,
      motherId,
      sourceBreedingId,
    } = body;

    // ==================================================
    // KIỂM TRA DỮ LIỆU CƠ BẢN
    // ==================================================

    if (
      !name ||
      !String(name).trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Tên cá thể là bắt buộc.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !species ||
      !String(species).trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Loài động vật là bắt buộc.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CHUẨN HÓA GIỚI TÍNH
    // ==================================================

    const normalizedSex =
      normalizeSex(sex);

    // ==================================================
    // TÌM / TẠO LOÀI
    // ==================================================

    let speciesRecord =
      await prisma.species.findUnique(
        {
          where: {
            name: String(
              species
            ).trim(),
          },
        }
      );

    if (!speciesRecord) {
      speciesRecord =
        await prisma.species.create({
          data: {
            name: String(
              species
            ).trim(),
          },
        });
    }

    // ==================================================
    // MORPH
    // ==================================================

    let morphRecord = null;

    if (
      morph &&
      String(morph).trim()
    ) {
      morphRecord =
        await prisma.morph.findUnique(
          {
            where: {
              speciesId_name: {
                speciesId:
                  speciesRecord.id,

                name: String(
                  morph
                ).trim(),
              },
            },
          }
        );

      if (!morphRecord) {
        morphRecord =
          await prisma.morph.create({
            data: {
              name: String(
                morph
              ).trim(),

              speciesId:
                speciesRecord.id,
            },
          });
      }
    }

    // ==================================================
    // KIỂM TRA BỐ / MẸ
    // ==================================================

    let father = null;
    let mother = null;

    if (fatherId) {
      father =
        await prisma.animal.findUnique(
          {
            where: {
              id: String(
                fatherId
              ),
            },
            select: {
              id: true,
              sex: true,
              speciesId: true,
            },
          }
        );

      if (!father) {
        return NextResponse.json(
          {
            error:
              "Không tìm thấy cá thể bố.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        father.sex !== "MALE"
      ) {
        return NextResponse.json(
          {
            error:
              "Cá thể được chọn làm bố phải là con đực.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (motherId) {
      mother =
        await prisma.animal.findUnique(
          {
            where: {
              id: String(
                motherId
              ),
            },
            select: {
              id: true,
              sex: true,
              speciesId: true,
            },
          }
        );

      if (!mother) {
        return NextResponse.json(
          {
            error:
              "Không tìm thấy cá thể mẹ.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        mother.sex !== "FEMALE"
      ) {
        return NextResponse.json(
          {
            error:
              "Cá thể được chọn làm mẹ phải là con cái.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // ==================================================
    // KHÔNG CHO BỐ = MẸ
    // ==================================================

    if (
      fatherId &&
      motherId &&
      fatherId === motherId
    ) {
      return NextResponse.json(
        {
          error:
            "Bố và mẹ không thể là cùng một cá thể.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // MÃ CÁ THỂ
    // ==================================================

    const code =
      `AN-${Date.now()}`;

    // ==================================================
    // TẠO ĐỘNG VẬT
    // ==================================================

    const animal =
      await prisma.animal.create({
        data: {
          code,

          name: String(
            name
          ).trim(),

          speciesId:
            speciesRecord.id,

          morphId:
            morphRecord?.id ??
            null,

          sex:
            normalizedSex,

          weight:
            parseNumber(weight),

          purchasePrice:
            parseNumber(
              purchasePrice
            ),

          genetics:
            genetics &&
            String(genetics).trim()
              ? String(
                  genetics
                ).trim()
              : null,

          fatherId:
            fatherId
              ? String(
                  fatherId
                ).trim()
              : null,

          motherId:
            motherId
              ? String(
                  motherId
                ).trim()
              : null,

          status:
            "HEALTHY",

          notes:
            notes &&
            String(notes).trim()
              ? String(
                  notes
                ).trim()
              : null,
        },

        include: {
          species: true,

          morph: true,

          images: true,

          father: {
            select: {
              id: true,
              code: true,
              name: true,
              genetics: true,
            },
          },

          mother: {
            select: {
              id: true,
              code: true,
              name: true,
              genetics: true,
            },
          },
        },
      });

    // ==================================================
    // NẾU LÀ CON SINH RA TỪ LẦN PHỐI
    // ==================================================

    if (sourceBreedingId) {
      const breeding =
        await prisma.breeding.findUnique(
          {
            where: {
              id: String(
                sourceBreedingId
              ),
            },
            select: {
              id: true,
            },
          }
        );

      if (breeding) {
        await prisma.offspring.create({
          data: {
            code:
              animal.code,

            name:
              animal.name,

            breedingId:
              breeding.id,

            animalId:
              animal.id,

            sex:
              animal.sex,

            weight:
              animal.weight,

            genetics:
              genetics &&
              String(
                genetics
              ).trim()
                ? String(
                    genetics
                  ).trim()
                : null,

            notes:
              notes &&
              String(notes).trim()
                ? String(
                    notes
                  ).trim()
                : null,
          },
        });
      }
    }

    return NextResponse.json(
      animal,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/animals error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể thêm động vật.",

        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định",
      },
      {
        status: 500,
      }
    );
  }
}