import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lấy danh sách loài
export async function GET() {
  try {
    const species = await prisma.species.findMany({
      include: {
        _count: {
          select: {
            animals: true,
            morphs: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(species);
  } catch (error) {
    console.error("GET /api/species error:", error);

    return NextResponse.json(
      {
        error: "Không thể lấy danh sách loài.",
        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định",
      },
      { status: 500 }
    );
  }
}

// Thêm loài mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          error: "Tên loài không được để trống.",
        },
        { status: 400 }
      );
    }

    const existing =
      await prisma.species.findUnique({
        where: {
          name,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error: "Loài này đã tồn tại.",
          species: existing,
        },
        { status: 409 }
      );
    }

    const species =
      await prisma.species.create({
        data: {
          name,
          scientificName:
            body?.scientificName?.trim() || null,
          description:
            body?.description?.trim() || null,
        },
      });

    return NextResponse.json(
      species,
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/species error:", error);

    return NextResponse.json(
      {
        error: "Không thể thêm loài.",
        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định",
      },
      { status: 500 }
    );
  }
}