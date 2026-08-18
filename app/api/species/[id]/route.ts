import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const species =
      await prisma.species.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              animals: true,
              morphs: true,
            },
          },
        },
      });

    if (!species) {
      return NextResponse.json(
        {
          error: "Không tìm thấy loài.",
        },
        { status: 404 }
      );
    }

    // Không cho xóa nếu vẫn còn cá thể
    if (species._count.animals > 0) {
      return NextResponse.json(
        {
          error: `Không thể xóa "${species.name}" vì vẫn còn ${species._count.animals} cá thể thuộc loài này.`,
        },
        { status: 400 }
      );
    }

    // Xóa morph trước nếu còn morph thuộc loài
    await prisma.morph.deleteMany({
      where: {
        speciesId: id,
      },
    });

    await prisma.species.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa loài "${species.name}".`,
    });
  } catch (error) {
    console.error(
      "DELETE /api/species/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Không thể xóa loài.",
        detail:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định",
      },
      { status: 500 }
    );
  }
}