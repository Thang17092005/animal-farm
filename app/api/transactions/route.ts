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

export async function GET() {
  try {
    const transactions =
      await prisma.transaction.findMany({
        include: {
          animal: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },

        orderBy: [
          {
            date: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return NextResponse.json(
      transactions
    );
  } catch (error) {
    console.error(
      "GET /api/transactions error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể lấy dữ liệu tài chính.",
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

export async function POST(
  request: NextRequest
) {
  try {
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
      await prisma.transaction.create({
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
            : new Date(),

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
      transaction,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/transactions error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể thêm giao dịch.",
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