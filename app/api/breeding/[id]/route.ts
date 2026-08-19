import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type BreedingType =
  | "SAME_SPECIES"
  | "CROSSBREED";

type BreedingStatus =
  | "PLANNED"
  | "PAIRING"
  | "PREGNANT"
  | "LAID_EGGS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

function parseDate(
  value: unknown
): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(
    String(value)
  );

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
  return value === "CROSSBREED"
    ? "CROSSBREED"
    : "SAME_SPECIES";
}

function parseBreedingStatus(
  value: unknown
): BreedingStatus {
  const statuses: BreedingStatus[] = [
    "PLANNED",
    "PAIRING",
    "PREGNANT",
    "LAID_EGGS",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ];

  if (
    typeof value === "string" &&
    statuses.includes(
      value as BreedingStatus
    )
  ) {
    return value as BreedingStatus;
  }

  return "PLANNED";
}

function buildBreedingData(
  body: Record<string, unknown>
) {
  const status =
    parseBreedingStatus(
      body.status
    );

  const breedingType =
    parseBreedingType(
      body.breedingType
    );

  const pairingDate =
    parseDate(body.pairingDate);

  return {
    maleId:
      typeof body.maleId === "string" &&
      body.maleId.trim()
        ? body.maleId.trim()
        : null,

    femaleId:
      typeof body.femaleId === "string"
        ? body.femaleId.trim()
        : "",

    startDate:
      pairingDate ??
      parseDate(body.startDate),

    pairingDate,

    expectedDate:
      parseDate(
        body.expectedDate
      ),

    layingDate:
      parseDate(
        body.layingDate
      ),

    status,

    notes:
      typeof body.notes === "string"
        ? body.notes.trim() || null
        : null,

    eggCount:
      status === "LAID_EGGS"
        ? parseIntOrNull(
            body.eggCount
          )
        : null,

    offspringDead:
      status === "COMPLETED"
        ? parseIntOrNull(
            body.offspringDead
          )
        : null,

    offspringFemale:
      status === "COMPLETED"
        ? parseIntOrNull(
            body.offspringFemale
          )
        : null,

    offspringMale:
      status === "COMPLETED"
        ? parseIntOrNull(
            body.offspringMale
          )
        : null,

    offspringTotal:
      status === "COMPLETED"
        ? parseIntOrNull(
            body.offspringTotal
          )
        : null,

    breedingType,
  };
}

function validateResultData(
  data: ReturnType<
    typeof buildBreedingData
  >
) {
  if (data.status !== "COMPLETED") {
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

const breedingInclude = {
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
};

export async function GET(
  _request: NextRequest,
  context: Context
) {
  try {
    const { id } =
      await context.params;

    const breeding =
      await prisma.breeding.findUnique({
        where: {
          id,
        },

        include: breedingInclude,
      });

    if (!breeding) {
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

    return NextResponse.json(
      breeding
    );
  } catch (error) {
    console.error(
      "GET /api/breeding/[id]:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tải thông tin lần phối.",
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

export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    const { id } =
      await context.params;

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

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

    if (maleId === femaleId) {
      return NextResponse.json(
        {
          error:
            "Con đực và con cái không thể là cùng một cá thể.",
        },
        {
          status: 400,
        }
      );
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
      return NextResponse.json(
        {
          error:
            "Không tìm thấy con đực.",
        },
        {
          status: 404,
        }
      );
    }

    if (!female) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy con cái.",
        },
        {
          status: 404,
        }
      );
    }

    if (male.sex !== "MALE") {
      return NextResponse.json(
        {
          error:
            `"${male.name}" không phải cá thể đực.`,
        },
        {
          status: 400,
        }
      );
    }

    if (female.sex !== "FEMALE") {
      return NextResponse.json(
        {
          error:
            `"${female.name}" không phải cá thể cái.`,
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

    const sameSpecies =
      male.speciesId ===
      female.speciesId;

    if (
      breedingType ===
        "SAME_SPECIES" &&
      !sameSpecies
    ) {
      return NextResponse.json(
        {
          error:
            `Hai cá thể thuộc loài khác nhau (${male.species.name} × ${female.species.name}). Hãy chọn "Lai khác loài".`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      breedingType ===
        "CROSSBREED" &&
      sameSpecies
    ) {
      return NextResponse.json(
        {
          error:
            `Hai cá thể đều thuộc loài ${male.species.name}. Hãy chọn "Cùng loài".`,
        },
        {
          status: 400,
        }
      );
    }

    const activeBreeding =
      await prisma.breeding.findFirst({
        where: {
          femaleId,
          status: {
            in: [
              "PLANNED",
              "PAIRING",
              "PREGNANT",
            ],
          },
          id: {
            not: id,
          },
        },
      });

    if (activeBreeding) {
      return NextResponse.json(
        {
          error:
            "Con cái này đang có một lần phối khác chưa hoàn thành.",
        },
        {
          status: 400,
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
      await prisma.breeding.update({
        where: {
          id,
        },

        data,

        include: breedingInclude,
      });

    return NextResponse.json(
      breeding
    );
  } catch (error) {
    console.error(
      "PUT /api/breeding/[id]:",
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
  _request: NextRequest,
  context: Context
) {
  try {
    const { id } =
      await context.params;

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
      "DELETE /api/breeding/[id]:",
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