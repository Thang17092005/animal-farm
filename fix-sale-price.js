const fs = require("fs");

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log("❌ Không tìm thấy:", filePath);
    return;
  }

  let text = fs.readFileSync(filePath, "utf8");
  const original = text;

  for (const [oldText, newText] of replacements) {
    if (text.includes(oldText)) {
      text = text.replace(oldText, newText);
    }
  }

  if (text !== original) {
    const backup = filePath + ".backup-before-sale-price";
    if (!fs.existsSync(backup)) {
      fs.writeFileSync(backup, original, "utf8");
    }

    fs.writeFileSync(filePath, text, "utf8");
    console.log("✅ Đã sửa:", filePath);
  } else {
    console.log("ℹ️ Không có thay đổi:", filePath);
  }
}


/* =========================================================
   1. APP / ANIMALS
   ========================================================= */

patchFile("app/animals/page.tsx", [

  /* AnimalForm: thêm salePrice nếu đang thiếu */
  [
`  purchasePrice: string;
  status: AnimalStatus;`,
`  purchasePrice: string;
  salePrice: string;
  status: AnimalStatus;`
  ],

  /* emptyForm: thêm salePrice */
  [
`  purchasePrice: "",
  status: "HEALTHY",`,
`  purchasePrice: "",
  salePrice: "",
  status: "HEALTHY",`
  ],

  /* openEditForm: lấy giá bán hiện tại */
  [
`      purchasePrice:
        animal.purchasePrice ===
            null ||
        animal.purchasePrice ===
            undefined
          ? ""
          : String(
              animal.purchasePrice
            ),

      status: animal.status,`,
`      purchasePrice:
        animal.purchasePrice ===
            null ||
        animal.purchasePrice ===
            undefined
          ? ""
          : String(
              animal.purchasePrice
            ),

      salePrice:
        animal.salePrice ===
            null ||
        animal.salePrice ===
            undefined
          ? ""
          : String(
              animal.salePrice
            ),

      status: animal.status,`
  ],

  /* submit: gửi salePrice lên API */
  [
`            purchasePrice:
              form.purchasePrice.trim(),

            status:
              form.status,`,
`            purchasePrice:
              form.purchasePrice.trim(),

            salePrice:
              form.salePrice.trim(),

            status:
              form.status,`
  ],

  /* card: hiển thị giá bán */
  [
`                        <InfoRow
                          label="💰 Giá mua"
                          value={formatMoney(
                            animal.purchasePrice
                          )}
                        />

                      </div>`,
`                        <InfoRow
                          label="💰 Giá mua"
                          value={formatMoney(
                            animal.purchasePrice
                          )}
                        />

                        <InfoRow
                          label="🏷️ Giá bán"
                          value={formatMoney(
                            animal.salePrice
                          )}
                        />

                      </div>`
  ],

  /* Trường hợp card mobile dùng div thay InfoRow */
  [
`                            {animal.purchasePrice !==
                              null &&
                              animal.purchasePrice !==
                                undefined && (

                                <div>
                                  💰 Giá mua:{" "}

                                  <span className="font-medium text-slate-800">
                                    {formatMoney(
                                      animal.purchasePrice
                                    )}
                                  </span>
                                </div>

                              )}

                          </div>`,
`                            {animal.purchasePrice !==
                              null &&
                              animal.purchasePrice !==
                                undefined && (

                                <div>
                                  💰 Giá mua:{" "}

                                  <span className="font-medium text-slate-800">
                                    {formatMoney(
                                      animal.purchasePrice
                                    )}
                                  </span>
                                </div>

                              )}

                            {animal.salePrice !==
                              null &&
                              animal.salePrice !==
                                undefined && (

                                <div>
                                  🏷️ Giá bán:{" "}

                                  <span className="font-medium text-slate-800">
                                    {formatMoney(
                                      animal.salePrice
                                    )}
                                  </span>
                                </div>

                              )}

                          </div>`
  ]
]);


/* =========================================================
   2. TỔNG QUAN
   app/page.tsx
   ========================================================= */

patchFile("app/page.tsx", [

  /* Type Animal: thêm salePrice nếu thiếu */
  [
`  purchasePrice?: string | number | null;
  status: AnimalStatus;`,
`  purchasePrice?: string | number | null;
  salePrice?: string | number | null;
  status: AnimalStatus;`
  ],

  /* Nếu type đang dùng required purchasePrice */
  [
`  purchasePrice: string | number | null;
  status: AnimalStatus;`,
`  purchasePrice: string | number | null;
  salePrice: string | number | null;
  status: AnimalStatus;`
  ],

  /* Stats: thêm tổng giá bán dự kiến */
  [
`  const totalValue =
    activeAnimals.reduce(
      (sum, animal) => {
        return (
          sum +
          Number(
            animal.purchasePrice ?? 0
          )
        );
      },
      0
    );

  const breedingCount =`,
`  const totalValue =
    activeAnimals.reduce(
      (sum, animal) => {
        return (
          sum +
          Number(
            animal.purchasePrice ?? 0
          )
        );
      },
      0
    );

  const totalSaleValue =
    activeAnimals.reduce(
      (sum, animal) => {
        return (
          sum +
          Number(
            animal.salePrice ?? 0
          )
        );
      },
      0
    );

  const breedingCount =`
  ],

  /* Thêm card Giá bán dự kiến trước card Sinh sản */
  [
`            {/* SINH SẢN */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">`,
`            {/* GIÁ BÁN DỰ KIẾN */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <div className="flex items-start justify-between">

                <div className="text-3xl">
                  🏷️
                </div>

                <span className="text-sm font-medium text-slate-400">
                  DỰ KIẾN
                </span>

              </div>

              <div className="mt-6 text-2xl font-bold text-slate-900 md:text-3xl">
                {loading
                  ? "..."
                  : formatMoney(
                      totalSaleValue
                    )}
              </div>

              <p className="mt-1 text-slate-500">
                Giá bán dự kiến
              </p>

            </div>

            {/* SINH SẢN */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">`
  ],

  /* Card Cá thể gần đây: thêm giá bán */
  [
`                            {animal.purchasePrice !==
                              null &&
                              animal.purchasePrice !==
                                undefined && (

                                <div>
                                  💰 Giá mua:{" "}

                                  <span className="font-medium text-slate-800">
                                    {formatMoney(
                                      animal.purchasePrice
                                    )}
                                  </span>
                                </div>

                              )}

                          </div>`,
`                            {animal.purchasePrice !==
                              null &&
                              animal.purchasePrice !==
                                undefined && (

                                <div>
                                  💰 Giá mua:{" "}

                                  <span className="font-medium text-slate-800">
                                    {formatMoney(
                                      animal.purchasePrice
                                    )}
                                  </span>
                                </div>

                              )}

                            {animal.salePrice !==
                              null &&
                              animal.salePrice !==
                                undefined && (

                                <div>
                                  🏷️ Giá bán:{" "}

                                  <span className="font-medium text-slate-800">
                                    {formatMoney(
                                      animal.salePrice
                                    )}
                                  </span>
                                </div>

                              )}

                          </div>`
  ],

  /* Trường hợp Tổng quan dùng AnimalList dạng InfoRow */
  [
`                        <InfoRow
                          label="💰 Giá mua"
                          value={formatMoney(
                            animal.purchasePrice
                          )}
                        />

                      </div>`,
`                        <InfoRow
                          label="💰 Giá mua"
                          value={formatMoney(
                            animal.purchasePrice
                          )}
                        />

                        <InfoRow
                          label="🏷️ Giá bán"
                          value={formatMoney(
                            animal.salePrice
                          )}
                        />

                      </div>`
  ]
]);


console.log("");
console.log("🎉 Hoàn tất sửa Giá bán!");
console.log("📱 Động vật: đã thêm Giá bán.");
console.log("🏠 Tổng quan: đã thêm Giá bán dự kiến + Giá bán từng cá thể.");
console.log("");
console.log("👉 Bây giờ chạy: npm run build");
