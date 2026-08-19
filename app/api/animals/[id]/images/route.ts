import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const STORAGE_BUCKET = "animal-images";

// ==================================================
// GET - LẤY DANH SÁCH ẢNH
// ==================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const animal = await prisma.animal.findUnique({
      where: {
        id,
      },
      include: {
        images: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!animal) {
      return NextResponse.json(
        {
          error: "Không tìm thấy động vật.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(animal.images);
  } catch (error) {
    console.error(
      "GET animal images error:",
      error
    );

    return NextResponse.json(
      {
        error: "Không thể lấy danh sách ảnh.",
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

// ==================================================
// POST - THÊM ẢNH
// ==================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const animal = await prisma.animal.findUnique({
      where: {
        id,
      },
      include: {
        images: true,
      },
    });

    if (!animal) {
      return NextResponse.json(
        {
          error: "Không tìm thấy động vật.",
        },
        {
          status: 404,
        }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    const captionValue =
      formData.get("caption");

    const makePrimary =
      formData.get("isPrimary") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Bạn chưa chọn ảnh.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------
    // KIỂM TRA ĐỊNH DẠNG
    // ------------------------------------------

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Định dạng ảnh không được hỗ trợ. Chỉ dùng JPG, PNG, WEBP hoặc GIF.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------
    // KIỂM TRA DUNG LƯỢNG
    // ------------------------------------------

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Ảnh quá lớn. Kích thước tối đa là 10MB.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------
    // TẠO TÊN FILE
    // ------------------------------------------

    const extension =
      EXTENSIONS[file.type] || ".jpg";

    const fileName =
      `${randomUUID()}${extension}`;

    const storagePath =
      `${id}/${fileName}`;

    // ------------------------------------------
    // CHUYỂN FILE THÀNH BUFFER
    // ------------------------------------------

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    // ------------------------------------------
    // KHỞI TẠO SUPABASE CHỈ KHI API ĐƯỢC GỌI
    // ------------------------------------------

    const supabaseAdmin =
      getSupabaseAdmin();

    // ------------------------------------------
    // UPLOAD LÊN SUPABASE STORAGE
    // ------------------------------------------

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(
        storagePath,
        buffer,
        {
          contentType: file.type,
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(
        "Supabase Storage upload error:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "Không thể lưu ảnh vào Supabase Storage.",
          detail: uploadError.message,
        },
        {
          status: 500,
        }
      );
    }

    // ------------------------------------------
    // LẤY PUBLIC URL
    // ------------------------------------------

    const {
      data: publicUrlData,
    } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const url =
      publicUrlData.publicUrl;

    // ------------------------------------------
    // XÁC ĐỊNH ẢNH CHÍNH
    // ------------------------------------------

    const shouldBePrimary =
      makePrimary ||
      animal.images.length === 0;

    if (shouldBePrimary) {
      await prisma.animalImage.updateMany({
        where: {
          animalId: id,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // ------------------------------------------
    // LƯU DATABASE
    // ------------------------------------------

    const image =
      await prisma.animalImage.create({
        data: {
          animalId: id,

          url,

          caption:
            typeof captionValue === "string"
              ? captionValue.trim() || null
              : null,

          isPrimary: shouldBePrimary,
        },
      });

    return NextResponse.json(
      image,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST animal image error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tải ảnh lên.",
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

// ==================================================
// PATCH - ĐẶT ẢNH CHÍNH
// ==================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const imageId =
      body?.imageId;

    if (!imageId) {
      return NextResponse.json(
        {
          error: "Thiếu mã ảnh.",
        },
        {
          status: 400,
        }
      );
    }

    const image =
      await prisma.animalImage.findFirst({
        where: {
          id: imageId,
          animalId: id,
        },
      });

    if (!image) {
      return NextResponse.json(
        {
          error: "Không tìm thấy ảnh.",
        },
        {
          status: 404,
        }
      );
    }

    // ------------------------------------------
    // BỎ ẢNH CHÍNH CŨ
    // ------------------------------------------

    await prisma.animalImage.updateMany({
      where: {
        animalId: id,
      },
      data: {
        isPrimary: false,
      },
    });

    // ------------------------------------------
    // ĐẶT ẢNH MỚI LÀM ẢNH CHÍNH
    // ------------------------------------------

    const updated =
      await prisma.animalImage.update({
        where: {
          id: imageId,
        },
        data: {
          isPrimary: true,
        },
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "PATCH animal image error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể đặt ảnh chính.",
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

// ==================================================
// DELETE - XÓA ẢNH
// ==================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const { searchParams } =
      new URL(request.url);

    const imageId =
      searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        {
          error: "Thiếu mã ảnh.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------
    // TÌM ẢNH
    // ------------------------------------------

    const image =
      await prisma.animalImage.findFirst({
        where: {
          id: imageId,
          animalId: id,
        },
      });

    if (!image) {
      return NextResponse.json(
        {
          error: "Không tìm thấy ảnh.",
        },
        {
          status: 404,
        }
      );
    }

    // ------------------------------------------
    // XÓA FILE TRÊN SUPABASE STORAGE
    // ------------------------------------------

    try {
      const supabaseUrl =
        process.env.SUPABASE_URL;

      if (supabaseUrl) {
        const publicPrefix =
          `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/`;

        if (
          image.url.startsWith(
            publicPrefix
          )
        ) {
          const storagePath =
            image.url.substring(
              publicPrefix.length
            );

          const supabaseAdmin =
            getSupabaseAdmin();

          const {
            error: removeError,
          } =
            await supabaseAdmin.storage
              .from(STORAGE_BUCKET)
              .remove([
                storagePath,
              ]);

          if (removeError) {
            console.warn(
              "Không thể xóa file trên Supabase Storage:",
              removeError
            );
          }
        }
      }
    } catch (storageError) {
      console.warn(
        "Storage delete error:",
        storageError
      );
    }

    // ------------------------------------------
    // XÓA DATABASE
    // ------------------------------------------

    await prisma.animalImage.delete({
      where: {
        id: imageId,
      },
    });

    // ------------------------------------------
    // NẾU XÓA ẢNH CHÍNH
    // → CHỌN ẢNH KHÁC LÀM ẢNH CHÍNH
    // ------------------------------------------

    if (image.isPrimary) {
      const nextImage =
        await prisma.animalImage.findFirst({
          where: {
            animalId: id,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      if (nextImage) {
        await prisma.animalImage.update({
          where: {
            id: nextImage.id,
          },
          data: {
            isPrimary: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã xóa ảnh.",
    });
  } catch (error) {
    console.error(
      "DELETE animal image error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể xóa ảnh.",
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