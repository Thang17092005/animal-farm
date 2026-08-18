import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const animal =
      await prisma.animal.findUnique({
        where: { id },

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
                    },
                  },

                  female: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!animal) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy động vật.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(animal);
  } catch (error) {
    console.error(
      "GET /api/animals/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể lấy thông tin động vật.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const body = await request.json();

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
      status,
    } = body;

    if (!name?.trim() || !species?.trim()) {
      return NextResponse.json(
        {
          error:
            "Tên và loài động vật là bắt buộc.",
        },
        { status: 400 }
      );
    }

    const existing =
      await prisma.animal.findUnique({
        where: { id },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy động vật.",
        },
        { status: 404 }
      );
    }

    // =========================
    // LOÀI
    // =========================

    let speciesRecord =
      await prisma.species.findUnique({
        where: {
          name: species.trim(),
        },
      });

    if (!speciesRecord) {
      speciesRecord =
        await prisma.species.create({
          data: {
            name: species.trim(),
          },
        });
    }

    // =========================
    // MORPH
    // =========================

    let morphRecord = null;

    if (morph?.trim()) {
      morphRecord =
        await prisma.morph.findUnique({
          where: {
            speciesId_name: {
              speciesId: speciesRecord.id,
              name: morph.trim(),
            },
          },
        });

      if (!morphRecord) {
        morphRecord =
          await prisma.morph.create({
            data: {
              name: morph.trim(),
              speciesId: speciesRecord.id,
            },
          });
      }
    }

    // =========================
    // CẬP NHẬT
    // =========================

    const animal =
      await prisma.animal.update({
        where: { id },

        data: {
          name: name.trim(),

          speciesId:
            speciesRecord.id,

          morphId:
            morphRecord?.id ?? null,

          sex:
            sex === "Đực"
              ? "MALE"
              : sex === "Cái"
              ? "FEMALE"
              : "UNKNOWN",

          weight:
            weight !== undefined &&
            weight !== null &&
            weight !== "" &&
            !isNaN(Number(weight))
              ? Number(weight)
              : null,

          purchasePrice:
            purchasePrice !== undefined &&
            purchasePrice !== null &&
            purchasePrice !== "" &&
            !isNaN(Number(purchasePrice))
              ? Number(purchasePrice)
              : null,

          genetics:
            genetics?.trim() || null,

          fatherId:
            fatherId?.trim() || null,

          motherId:
            motherId?.trim() || null,

          status:
            status || existing.status,

          notes:
            notes?.trim() || null,
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

    // =========================
    // CẬP NHẬT NGUỒN LẦN PHỐI
    // =========================

    const existingOffspring =
      await prisma.offspring.findFirst({
        where: {
          animalId: id,
        },
      });

    if (sourceBreedingId) {
      if (existingOffspring) {
        await prisma.offspring.update({
          where: {
            id: existingOffspring.id,
          },

          data: {
            breedingId:
              sourceBreedingId,

            name: animal.name,

            sex: animal.sex,

            weight: animal.weight,

            genetics:
              animal.genetics,

            notes: animal.notes,
          },
        });
      } else {
        await prisma.offspring.create({
          data: {
            code: animal.code,

            name: animal.name,

            breedingId:
              sourceBreedingId,

            animalId: animal.id,

            sex: animal.sex,

            weight: animal.weight,

            genetics:
              animal.genetics,

            notes: animal.notes,
          },
        });
      }
    } else if (existingOffspring) {
      await prisma.offspring.delete({
        where: {
          id: existingOffspring.id,
        },
      });
    }

    return NextResponse.json(animal);
  } catch (error) {
    console.error(
      "PUT /api/animals/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể cập nhật động vật.",

        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const animal =
      await prisma.animal.findUnique({
        where: { id },
      });

    if (!animal) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy động vật.",
        },
        { status: 404 }
      );
    }

    await prisma.animal.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message:
        "Đã xóa động vật.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/animals/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể xóa động vật.",
      },
      { status: 500 }
    );
  }
}