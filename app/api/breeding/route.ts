import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDate(value: unknown) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseIntOrNull(value: unknown) {
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

function getBreedingData(
  body: Record<string, any>
) {
  const allowedStatuses = [
    "PLANNED",
    "PAIRING",
    "PREGNANT",
    "LAID_EGGS",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ];

  const status =
    allowedStatuses.includes(
      body.status
    )
      ? body.status
      : "PLANNED";

  const breedingType =
    body.breedingType ===
    "CROSSBREED"
      ? "CROSSBREED"
      : "SAME_SPECIES";

  const pairingDate =
    parseDate(
      body.pairingDate
    );

  return {
    maleId:
      body.maleId || null,

    femaleId:
      body.femaleId,

    breedingType,

    startDate:
      pairingDate ||
      parseDate(
        body.startDate
      ),

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
      typeof body.notes ===
      "string"
        ? body.notes.trim() ||
          null
        : null,

    eggCount:
      status ===
      "LAID_EGGS"
        ? parseIntOrNull(
            body.eggCount
          )
        : null,

    offspringTotal:
      status ===
      "COMPLETED"
        ? parseIntOrNull(
            body.offspringTotal
          )
        : null,

    offspringFemale:
      status ===
      "COMPLETED"
        ? parseIntOrNull(
            body.offspringFemale
          )
        : null,

    offspringMale:
      status ===
      "COMPLETED"
        ? parseIntOrNull(
            body.offspringMale
          )
        : null,

    offspringDead:
      status ===
      "COMPLETED"
        ? parseIntOrNull(
            body.offspringDead
          )
        : null,
  };
}

// ======================================================
// KIỂM TRA CON CÁI ĐANG BẬN SINH SẢN
// ======================================================

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
            "PLANNED",
            "PAIRING",
            "PREGNANT",
          ],
        },

        ...(excludeBreedingId
          ? {
              id: {
                not:
                  excludeBreedingId,
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
        "Con cái này đang có một lần phối khác ở trạng thái đã lên kế hoạch, đã phối hoặc đang mang thai. Không thể thêm lần phối mới.",

      status: 400,
    };
  }

  return {
    error: null,
    status: 200,
  };
}

// ======================================================
// KIỂM TRA CẶP SINH SẢN
// ======================================================

async function validateBreedingPair(
  maleId: string | null,
  femaleId: string,
  breedingType: string
) {
  if (!maleId) {
    return {
      error:
        "Bạn cần chọn con đực.",

      status: 400,
    };
  }

  if (!femaleId) {
    return {
      error:
        "Bạn cần chọn con cái.",

      status: 400,
    };
  }

  if (
    maleId ===
    femaleId
  ) {
    return {
      error:
        "Con đực và con cái không thể là cùng một cá thể.",

      status: 400,
    };
  }

  const [
    male,
    female,
  ] = await Promise.all([
    prisma.animal.findUnique({
      where: {
        id: maleId,
      },

      include: {
        species: true,
      },
    }),

    prisma.animal.findUnique({
      where: {
        id: femaleId,
      },

      include: {
        species: true,
      },
    }),
  ]);

  if (!male) {
    return {
      error:
        "Không tìm thấy con đực.",

      status: 404,
    };
  }

  if (!female) {
    return {
      error:
        "Không tìm thấy con cái.",

      status: 404,
    };
  }

  if (
    male.sex !==
    "MALE"
  ) {
    return {
      error:
        `"${male.name}" không phải cá thể đực.`,

      status: 400,
    };
  }

  if (
    female.sex !==
    "FEMALE"
  ) {
    return {
      error:
        `"${female.name}" không phải cá thể cái.`,

      status: 400,
    };
  }

  const sameSpecies =
    male.speciesId ===
    female.speciesId;

  // ==================================================
  // SINH SẢN CÙNG LOÀI
  // ==================================================

  if (
    breedingType ===
    "SAME_SPECIES"
  ) {
    if (!sameSpecies) {
      return {
        error:
          `Không thể sinh sản cùng loài: ${male.species.name} × ${female.species.name}. Hãy chọn chế độ "Lai khác loài".`,

        status: 400,
      };
    }
  }

  // ==================================================
  // LAI KHÁC LOÀI
  // ==================================================

  if (
    breedingType ===
    "CROSSBREED"
  ) {
    if (sameSpecies) {
      return {
        error:
          `Hai cá thể đều là ${male.species.name}. Đây là sinh sản cùng loài, không phải lai khác loài.`,

        status: 400,
      };
    }
  }

  return {
    male,
    female,
    error: null,
    status: 200,
  };
}

// ======================================================
// KIỂM TRA KẾT QUẢ
// ======================================================

function validateResultData(
  data: Record<string, any>
) {
  if (
    data.status ===
    "COMPLETED"
  ) {
    const total =
      data.offspringTotal ??
      0;

    const female =
      data.offspringFemale ??
      0;

    const male =
      data.offspringMale ??
      0;

    const dead =
      data.offspringDead ??
      0;

    if (
      female + male >
      total
    ) {
      return (
        "Số con đực + số con cái không thể lớn hơn tổng số con."
      );
    }

    if (
      dead >
      total
    ) {
      return (
        "Số con chết không thể lớn hơn tổng số con."
      );
    }
  }

  return null;
}

// ======================================================
// GET
// ======================================================

export async function GET() {
  try {
    const breedings =
      await prisma.breeding.findMany(
        {
          include: {
            male: {
              select: {
                id: true,
                code: true,
                name: true,
                sex: true,
                weight: true,
                genetics: true,

                species: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

                morph: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },

            female: {
              select: {
                id: true,
                code: true,
                name: true,
                sex: true,
                weight: true,
                genetics: true,

                species: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

                morph: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },

            eggs: true,

            offspring: {
              include: {
                animal: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    sex: true,
                    genetics: true,

                    species: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },
        }
      );

    return NextResponse.json(
      breedings
    );
  } catch (error) {
    console.error(
      "GET /api/breeding error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể lấy danh sách sinh sản.",

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

// ======================================================
// POST
// ======================================================

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    if (!body.maleId) {
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

    if (!body.femaleId) {
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
      body.breedingType ===
      "CROSSBREED"
        ? "CROSSBREED"
        : "SAME_SPECIES";

    const pair =
      await validateBreedingPair(
        body.maleId,
        body.femaleId,
        breedingType
      );

    if (pair.error) {
      return NextResponse.json(
        {
          error:
            pair.error,
        },
        {
          status:
            pair.status,
        }
      );
    }

    // ==================================================
    // KHÔNG CHO CON CÁI ĐANG BẬN PHỐI THÊM
    // ==================================================

    const femaleAvailability =
      await validateFemaleAvailability(
        body.femaleId
      );

    if (
      femaleAvailability.error
    ) {
      return NextResponse.json(
        {
          error:
            femaleAvailability.error,
        },
        {
          status:
            femaleAvailability.status,
        }
      );
    }

    const data =
      getBreedingData(
        body
      );

    const resultError =
      validateResultData(
        data
      );

    if (resultError) {
      return NextResponse.json(
        {
          error:
            resultError,
        },
        {
          status: 400,
        }
      );
    }

    const breeding =
      await prisma.breeding.create(
        {
          data,

          include: {
            male: true,
            female: true,
            eggs: true,
            offspring: true,
          },
        }
      );

    return NextResponse.json(
      breeding,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/breeding error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể thêm lần phối.",

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

// ======================================================
// PATCH
// ======================================================

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    if (!body.id) {
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

    if (!body.maleId) {
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

    if (!body.femaleId) {
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

    const existing =
      await prisma.breeding.findUnique(
        {
          where: {
            id: body.id,
          },
        }
      );

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

    const breedingType =
      body.breedingType ===
      "CROSSBREED"
        ? "CROSSBREED"
        : "SAME_SPECIES";

    const pair =
      await validateBreedingPair(
        body.maleId,
        body.femaleId,
        breedingType
      );

    if (pair.error) {
      return NextResponse.json(
        {
          error:
            pair.error,
        },
        {
          status:
            pair.status,
        }
      );
    }

    // ==================================================
    // KHI SỬA, BỎ QUA CHÍNH LẦN PHỐI ĐANG SỬA
    // ==================================================

    const femaleAvailability =
      await validateFemaleAvailability(
        body.femaleId,
        body.id
      );

    if (
      femaleAvailability.error
    ) {
      return NextResponse.json(
        {
          error:
            femaleAvailability.error,
        },
        {
          status:
            femaleAvailability.status,
        }
      );
    }

    const data =
      getBreedingData(
        body
      );

    const resultError =
      validateResultData(
        data
      );

    if (resultError) {
      return NextResponse.json(
        {
          error:
            resultError,
        },
        {
          status: 400,
        }
      );
    }

    const breeding =
      await prisma.breeding.update(
        {
          where: {
            id: body.id,
          },

          data,

          include: {
            male: true,
            female: true,
            eggs: true,
            offspring: true,
          },
        }
      );

    return NextResponse.json(
      breeding
    );
  } catch (error) {
    console.error(
      "PATCH /api/breeding error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể cập nhật lần phối.",

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

// ======================================================
// DELETE
// ======================================================

export async function DELETE(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const id =
      searchParams.get(
        "id"
      );

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
      await prisma.breeding.findUnique(
        {
          where: {
            id,
          },
        }
      );

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

    await prisma.breeding.delete(
      {
        where: {
          id,
        },
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "Đã xóa lần phối.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/breeding error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể xóa lần phối.",

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