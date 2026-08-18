import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalAnimals = await prisma.animal.count();

    const valueResult = await prisma.animal.aggregate({
      _sum: {
        purchasePrice: true,
      },
    });

    const breedingAnimals = await prisma.animal.count({
      where: {
        status: "BREEDING",
      },
    });

    const offspring = await prisma.offspring.count();

    const totalValue = Number(
      valueResult._sum.purchasePrice ?? 0
    );

    return NextResponse.json({
      totalAnimals,
      totalValue,
      breedingAnimals,
      offspring,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);

    return NextResponse.json(
      {
        error: "Không thể lấy dữ liệu thống kê.",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}