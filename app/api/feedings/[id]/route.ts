import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

function parseBoolean(value: unknown) {
  if (value === true || value === "true") {
    return true;
  }

  return false;
}

export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    const { id } = await context.params;

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

    const dateTime = new Date(
      `${String(date)}T${String(time)}:00`
    );

    if (Number.isNaN(dateTime.getTime())) {
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

    const feeding = await prisma.feeding.update({
      where: {
        id,
      },

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

    return NextResponse.json(feeding);
  } catch (error) {
    console.error(
      "PUT /api/feedings/[id]:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể cập nhật lịch cho ăn.",
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
    const { id } = await context.params;

    await prisma.feeding.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/feedings/[id]:",
      error
    );

    return NextResponse.json(
      {
        error: "Không thể xóa lịch cho ăn.",
      },
      {
        status: 500,
      }
    );
  }
}