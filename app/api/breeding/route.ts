import { NextRequest, NextResponse } from "next/server";
import {
  Prisma,
  BreedingStatus,
  BreedingType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

function parseDate(value: unknown): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseIntOrNull(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    return null;
  }

  return Math.max(0, number);
}

function parseBreedingType(
  value: unknown
): BreedingType {
  if (value === "CROSSBREED") {
    return BreedingType.CROSSBREED;
  }

  return BreedingType.SAME_SPECIES;
}

function parseBreedingStatus(
  value: unknown
): BreedingStatus {
  const statuses: BreedingStatus[] = [
    BreedingStatus.PLANNED,
    BreedingStatus.PAIRING,
    BreedingStatus.PREGNANT,
    BreedingStatus.LAID_EGGS,
    BreedingStatus.COMPLETED,
    BreedingStatus.FAILED,
    BreedingStatus.CANCELLED,
  ];

  if (
    typeof value === "string" &&
    statuses.includes(
      value as BreedingStatus
    )
  ) {
    return value as BreedingStatus;
  }

  return BreedingStatus.PLANNED;
}

function buildBreedingData(
  body: Record<string, unknown>
): Prisma.BreedingUncheckedCreateInput {
  const status =
    parseBreedingStatus(body.status);

  const breedingType =
    parseBreedingType(
      body.breedingType
    );

  const pairingDate =
    parseDate(body.pairingDate);

  const femaleId =
    typeof body.femaleId === "string"
      ? body.femaleId.trim()
      : "";

  const maleId =
    typeof body.maleId === "string" &&
    body.maleId.trim()
      ? body.maleId.trim()
      : null;

  return {
    maleId,

    femaleId,

    startDate:
      pairingDate ??
      parseDate(body.startDate),

    pairingDate,

    expectedDate:
      parseDate(body.expectedDate),

    layingDate:
      parseDate(body.layingDate),

    status,

    notes:
      typeof body.notes === "string"
        ? body.notes.trim() || null
        : null,

    eggCount:
      status === BreedingStatus.LAID_EGGS
        ? parseIntOrNull(
            body.eggCount
          )
        : null,

    offspringDead:
      status === BreedingStatus.COMPLETED
        ? parseIntOrNull(
            body.offspringDead
          )
        : null,

    offspringFemale:
      status === BreedingStatus.COMPLETED
        ? parseIntOrNull(
            body.offspringFemale
          )
        : null,

    offspringMale:
      status === BreedingStatus.COMPLETED
        ? parseIntOrNull(
            body.offspringMale
          )
        : null,

    offspringTotal:
      status === BreedingStatus.COMPLETED
        ? parseIntOrNull(
            body.offspringTotal
          )
        : null,

    breedingType,
  };
}

async function validateBreedingPair(
  maleId: string | null,
  femaleId: string,
  breedingType: BreedingType
) {
  if (!maleId) {
    return {
      error: "Bạn cần chọn con đực.",
      status: 400,
    };
  }

  if (!femaleId) {
    return {
      error: "Bạn cần chọn con cái.",
      status: 400,
    };
  }

  if (maleId === femaleId) {
    return {
      error:
        "Con đực và con cái không thể là cùng một cá thể.",
      status: 400,
    };
  }

  const [male, female] =
    await Promise.all([
      prisma.animal.findUnique({
        where: {
          id: maleId,
        },

        include: {
          species: true,
          morph: true,
        },
      }),

      prisma.animal.findUnique({
        where: {
          id: femaleId,
        },

        include: {
          species: true,
          morph: true,
        },
      }),
    ]);

  if (!male) {
    return {
      error: "Không tìm thấy con đực.",
      status: 404,
    };
  }

  if (!female) {
    return {
      error: "Không tìm thấy con cái.",
      status: 404,
    };
  }

  if (male.sex !== "MALE") {
    return {
      error:
        `"${male.name}" không phải cá thể đực.`,
      status: 400,
    };
  }

  if (female.sex !== "FEMALE") {
    return {
      error:
        `"${female.name}" không phải cá thể cái.`,
      status: 400,
    };
  }

  const sameSpecies =
    male.speciesId ===
    female.speciesId;

  if (
    breedingType ===
      BreedingType.SAME_SPECIES &&
    !sameSpecies
  ) {
    return {
      error:
        `Hai cá thể thuộc loài khác nhau (${male.species.name} × ${female.species.name}). Hãy chọn "Lai khác loài".`,
      status: 400,
    };
  }

  if (
    breedingType ===
      BreedingType.CROSSBREED &&
    sameSpecies
  ) {
    return {
      error:
        `Hai cá thể đều thuộc loài ${male.species.name}. Hãy chọn "Cùng loài".`,
      status: 400,
    };
  }

  return {
    male,
    female,
    error: null,
    status: 200,
  };
}

async function validateFemaleAvailability(
  femaleId: string,
  excludeBreedingId?: string
) {
  const activeBreeding =
    await prisma.breeding.findFirst({
      where: {
        femaleId,

        status: {
          in: [
            BreedingStatus.PLANNED,
            BreedingStatus.PAIRING,
            BreedingStatus.PREGNANT,
          ],
        },

        ...(excludeBreedingId
          ? {
              id: {
                not: excludeBreedingId,
              },
            }
          : {}),
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (activeBreeding) {
    return {
      error:
        "Con cái này đang có một lần phối khác chưa hoàn thành.",
      status: 400,
    };
  }

  return {
    error: null,
    status: 200,
  };
}

function validateResultData(
  data: Prisma.BreedingUncheckedCreateInput
) {
  if (
    data.status !==
    BreedingStatus.COMPLETED
  ) {
    return null;
  }

  const total =
    data.offspringTotal ?? 0;

  const female =
    data.offspringFemale ?? 0;

  const male =
    data.offspringMale ?? 0;

  const dead =
    data.offspringDead ?? 0;

  if (female + male > total) {
    return (
      "Số con đực + số con cái không thể lớn hơn tổng số con."
    );
  }

  if (dead > total) {
    return (
      "Số con chết không thể lớn hơn tổng số con."
    );
  }

  return null;
}

const breedingInclude =
  Prisma.validator<Prisma.BreedingInclude>()({
    male: {
      include: {
        species: true,
        morph: true,
      },
    },

    female: {
      include: {
        species: true,
        morph: true,
      },
    },

    eggs: true,

    offspring: {
      include: {
        animal: {
          include: {
            species: true,
            morph: true,
          },
        },
      },
    },
  });

export async function GET() {
  try {
    const breedings =
      await prisma.breeding.findMany({
        include: breedingInclude,

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(
      breedings
    );
  } catch (error) {
    console.error(
      "GET /api/breeding:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tải dữ liệu sinh sản.",

        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const femaleId =
      typeof body.femaleId === "string"
        ? body.femaleId.trim()
        : "";

    const maleId =
      typeof body.maleId === "string"
        ? body.maleId.trim()
        : "";

    if (!maleId) {
      return NextResponse.json(
        {
          error:
            "Bạn cần chọn con đực.",
        },
        {
          status: 400,
        }
      );
    }

    if (!femaleId) {
      return NextResponse.json(
        {
          error:
            "Bạn cần chọn con cái.",
        },
        {
          status: 400,
        }
      );
    }

    const breedingType =
      parseBreedingType(
        body.breedingType
      );

    const pair =
      await validateBreedingPair(
        maleId,
        femaleId,
        breedingType
      );

    if (pair.error) {
      return NextResponse.json(
        {
          error: pair.error,
        },
        {
          status: pair.status,
        }
      );
    }

    const availability =
      await validateFemaleAvailability(
        femaleId
      );

    if (availability.error) {
      return NextResponse.json(
        {
          error:
            availability.error,
        },
        {
          status:
            availability.status,
        }
      );
    }

    const data =
      buildBreedingData({
        ...body,
        maleId,
        femaleId,
      });

    const resultError =
      validateResultData(data);

    if (resultError) {
      return NextResponse.json(
        {
          error: resultError,
        },
        {
          status: 400,
        }
      );
    }

    const breeding =
      await prisma.breeding.create({
        data,

        include: breedingInclude,
      });

    return NextResponse.json(
      breeding,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/breeding:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể thêm lần phối.",

        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Thiếu mã lần phối.",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await prisma.breeding.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy lần phối.",
        },
        {
          status: 404,
        }
      );
    }

    const maleId =
      typeof body.maleId === "string"
        ? body.maleId.trim()
        : "";

    const femaleId =
      typeof body.femaleId === "string"
        ? body.femaleId.trim()
        : "";

    if (!maleId || !femaleId) {
      return NextResponse.json(
        {
          error:
            "Bạn cần chọn đầy đủ con đực và con cái.",
        },
        {
          status: 400,
        }
      );
    }

    const breedingType =
      parseBreedingType(
        body.breedingType
      );

    const pair =
      await validateBreedingPair(
        maleId,
        femaleId,
        breedingType
      );

    if (pair.error) {
      return NextResponse.json(
        {
          error: pair.error,
        },
        {
          status: pair.status,
        }
      );
    }

    const availability =
      await validateFemaleAvailability(
        femaleId,
        id
      );

    if (availability.error) {
      return NextResponse.json(
        {
          error:
            availability.error,
        },
        {
          status:
            availability.status,
        }
      );
    }

    const data =
      buildBreedingData({
        ...body,
        maleId,
        femaleId,
      });

    const resultError =
      validateResultData(data);

    if (resultError) {
      return NextResponse.json(
        {
          error: resultError,
        },
        {
          status: 400,
        }
      );
    }

    const updateData: Prisma.BreedingUncheckedUpdateInput =
      data;

    const breeding =
      await prisma.breeding.update({
        where: {
          id,
        },

        data: updateData,

        include: breedingInclude,
      });

    return NextResponse.json(
      breeding
    );
  } catch (error) {
    console.error(
      "PATCH /api/breeding:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể cập nhật lần phối.",

        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Thiếu mã lần phối.",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await prisma.breeding.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy lần phối.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.breeding.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Đã xóa lần phối.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/breeding:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể xóa lần phối.",

        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định.",
      },
      {
        status: 500,
      }
    );
  }
}