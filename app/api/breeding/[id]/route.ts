import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

function parseDate(value: unknown) {
  if (!value) return null;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const {
      maleId,
      femaleId,
      pairingDate,
      expectedDate,
      layingDate,
      status,
      notes,
    } = body;

    if (!femaleId) {
      return NextResponse.json(
        {
          error: "Con cái là bắt buộc.",
        },
        {
          status: 400,
        }
      );
    }

    const breeding = await prisma.breeding.update({
      where: {
        id,
      },
      data: {
        maleId: maleId || null,
        femaleId,

        pairingDate: parseDate(pairingDate),
        expectedDate: parseDate(expectedDate),
        layingDate: parseDate(layingDate),

        status: status || "PLANNED",

        notes: notes?.trim() || null,
      },
      include: {
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
        offspring: true,
      },
    });

    return NextResponse.json(breeding);
  } catch (error) {
    console.error("PUT /api/breeding/[id] error:", error);

    return NextResponse.json(
      {
        error: "Không thể cập nhật lần phối.",
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

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  try {
    const { id } = await context.params;

    await prisma.breeding.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/breeding/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Không thể xóa lần phối.",
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