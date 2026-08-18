import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const transactionTypes = [
  "PURCHASE",
  "SALE",
  "FEED",
  "MEDICAL",
  "EQUIPMENT",
  "SHIPPING",
  "OTHER",
] as const;

function validType(
  value: unknown
): value is (typeof transactionTypes)[number] {
  return (
    typeof value === "string" &&
    transactionTypes.includes(
      value as (typeof transactionTypes)[number]
    )
  );
}

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const body =
      await request.json();

    const {
      type,
      animalId,
      amount,
      date,
      description,
      notes,
    } = body;

    if (!validType(type)) {
      return NextResponse.json(
        {
          error:
            "Loại giao dịch không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Số tiền phải lớn hơn 0.",
        },
        {
          status: 400,
        }
      );
    }

    if (animalId) {
      const animal =
        await prisma.animal.findUnique({
          where: {
            id: String(animalId),
          },
        });

      if (!animal) {
        return NextResponse.json(
          {
            error:
              "Cá thể không tồn tại.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const transaction =
      await prisma.transaction.update({
        where: {
          id,
        },

        data: {
          type,

          animalId:
            animalId || null,

          amount:
            numericAmount,

          date: date
            ? new Date(
                `${date}T12:00:00`
              )
            : undefined,

          description:
            description?.trim() ||
            null,

          notes:
            notes?.trim() ||
            null,
        },

        include: {
          animal: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json(
      transaction
    );
  } catch (error) {
    console.error(
      "PUT /api/transactions/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể cập nhật giao dịch.",
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
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    await prisma.transaction.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/transactions/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể xóa giao dịch.",
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