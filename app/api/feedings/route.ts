import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDate(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

function parseBoolean(value: unknown) {
  if (value === true || value === "true") {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const animalId = searchParams.get("animalId");
    const completed = searchParams.get("completed");

    const feedings = await prisma.feeding.findMany({
      where: {
        ...(animalId
          ? {
              animalId,
            }
          : {}),

        ...(completed === "true"
          ? {
              completed: true,
            }
          : {}),

        ...(completed === "false"
          ? {
              completed: false,
            }
          : {}),
      },

      include: {
        animal: {
          include: {
            species: true,
            morph: true,
          },
        },
      },

      orderBy: [
        {
          date: "desc",
        },
        {
          time: "desc",
        },
      ],
    });

    return NextResponse.json(feedings);
  } catch (error) {
    console.error("GET /api/feedings:", error);

    return NextResponse.json(
      {
        error: "Không thể tải dữ liệu cho ăn.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      animalId,
      date,
      time,
      food,
      amount,
      note,
      completed,
    } = body;

    if (
      !animalId ||
      !date ||
      !time ||
      !String(food ?? "").trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập đầy đủ con vật, ngày, giờ và thức ăn.",
        },
        {
          status: 400,
        }
      );
    }

    const dateTime = parseDate(
      String(date),
      String(time)
    );

    if (!dateTime) {
      return NextResponse.json(
        {
          error: "Ngày hoặc giờ không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    const animal = await prisma.animal.findUnique({
      where: {
        id: String(animalId),
      },
    });

    if (!animal) {
      return NextResponse.json(
        {
          error: "Không tìm thấy con vật.",
        },
        {
          status: 404,
        }
      );
    }

    const feeding = await prisma.feeding.create({
      data: {
        animalId: String(animalId),

        date: dateTime,

        time: String(time),

        food: String(food).trim(),

        amount: amount
          ? String(amount).trim()
          : null,

        note: note
          ? String(note).trim()
          : null,

        completed: parseBoolean(completed),
      },

      include: {
        animal: {
          include: {
            species: true,
            morph: true,
          },
        },
      },
    });

    return NextResponse.json(feeding, {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/feedings:", error);

    return NextResponse.json(
      {
        error: "Không thể thêm lịch cho ăn.",
      },
      {
        status: 500,
      }
    );
  }
}