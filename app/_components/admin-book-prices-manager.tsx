"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./admin-book-prices-manager.module.css";

type AdminBookPriceItem = {
  id: string;
  author: string;
  title: string;
  price: number | null;
};

type EditableBookPriceItem = AdminBookPriceItem & {
  savedPrice: number | null;
  priceInput: string;
};

type PdfPageImage = {
  data: Uint8Array;
  height: number;
  width: number;
};

const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_MARGIN = 40;
const PDF_SCALE = 2;
const PDF_ROW_HEIGHT = 28;
const PDF_TABLE_TOP = 150;
const PDF_TABLE_BOTTOM = 70;

function createEditableRows(items: AdminBookPriceItem[]): EditableBookPriceItem[] {
  return items.map((item) => ({
    ...item,
    savedPrice: item.price,
    priceInput: item.price === null ? "" : `${item.price}`,
  }));
}

function parsePriceInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      ok: true as const,
      value: null,
    };
  }

  const parsed = Number(trimmed.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    value: parsed,
  };
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function createUtf16LeBlob(content: string, mimeType: string) {
  const buffer = new ArrayBuffer((content.length + 1) * 2);
  const view = new DataView(buffer);

  view.setUint16(0, 0xfeff, true);

  for (let index = 0; index < content.length; index += 1) {
    view.setUint16((index + 1) * 2, content.charCodeAt(index), true);
  }

  return new Blob([buffer], { type: mimeType });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function textEncoderBytes(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function createPdfBlob(pages: PdfPageImage[]) {
  const header = concatBytes([
    textEncoderBytes("%PDF-1.4\n%"),
    new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x0a]),
  ]);

  const totalObjects = 2 + pages.length * 3;
  const objects: Uint8Array[] = [];

  const pageObjectNumbers = pages.map((_, index) => 3 + index * 3);
  const imageObjectNumbers = pages.map((_, index) => 4 + index * 3);
  const contentObjectNumbers = pages.map((_, index) => 5 + index * 3);

  objects.push(
    textEncoderBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
  );

  const kids = pageObjectNumbers.map((pageNumber) => `${pageNumber} 0 R`).join(" ");
  objects.push(
    textEncoderBytes(
      `2 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>\nendobj\n`,
    ),
  );

  pages.forEach((page, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const imageObjectNumber = imageObjectNumbers[index];
    const contentObjectNumber = contentObjectNumbers[index];
    const contentStream = textEncoderBytes(
      `q\n${PDF_PAGE_WIDTH} 0 0 ${PDF_PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`,
    );

    objects.push(
      textEncoderBytes(
        `${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /XObject << /Im0 ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\nendobj\n`,
      ),
    );

    objects.push(
      concatBytes([
        textEncoderBytes(
          `${imageObjectNumber} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>\nstream\n`,
        ),
        page.data,
        textEncoderBytes("\nendstream\nendobj\n"),
      ]),
    );

    objects.push(
      concatBytes([
        textEncoderBytes(
          `${contentObjectNumber} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n`,
        ),
        contentStream,
        textEncoderBytes("endstream\nendobj\n"),
      ]),
    );
  });

  const offsets = [0];
  let currentOffset = header.length;

  for (const object of objects) {
    offsets.push(currentOffset);
    currentOffset += object.length;
  }

  const xrefOffset = currentOffset;
  const xrefRows = [
    `xref\n0 ${totalObjects + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
  ];

  const trailer = `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfBytes = concatBytes([
    header,
    ...objects,
    textEncoderBytes(`${xrefRows.join("\n")}\n`),
    textEncoderBytes(trailer),
  ]);

  return new Blob([pdfBytes], { type: "application/pdf" });
}

function fitTextToWidth(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  const ellipsis = "...";
  let trimmed = value;

  while (trimmed.length > 0 && context.measureText(`${trimmed}${ellipsis}`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed ? `${trimmed}${ellipsis}` : ellipsis;
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }

        reject(new Error("Nem sikerült a PDF oldal képének létrehozása."));
      },
      "image/jpeg",
      0.92,
    );
  });

  return new Uint8Array(await blob.arrayBuffer());
}

async function createPdfPages(items: EditableBookPriceItem[]) {
  const pagePixelWidth = PDF_PAGE_WIDTH * PDF_SCALE;
  const pagePixelHeight = PDF_PAGE_HEIGHT * PDF_SCALE;
  const margin = PDF_MARGIN * PDF_SCALE;
  const tableTop = PDF_TABLE_TOP * PDF_SCALE;
  const rowHeight = PDF_ROW_HEIGHT * PDF_SCALE;
  const tableBottom = PDF_TABLE_BOTTOM * PDF_SCALE;
  const rowsPerPage = Math.max(
    1,
    Math.floor((pagePixelHeight - tableTop - tableBottom) / rowHeight),
  );
  const titleX = margin;
  const authorX = margin;
  const bookX = margin + 190 * PDF_SCALE;
  const priceX = pagePixelWidth - margin;
  const pages: PdfPageImage[] = [];

  for (let start = 0; start < items.length || (items.length === 0 && start === 0); start += rowsPerPage) {
    const pageItems = items.slice(start, start + rowsPerPage);
    const canvas = document.createElement("canvas");

    canvas.width = pagePixelWidth;
    canvas.height = pagePixelHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Nem sikerült előkészíteni a PDF rajzfelületét.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pagePixelWidth, pagePixelHeight);
    context.fillStyle = "#17312f";
    context.textBaseline = "top";

    context.font = `${36 * PDF_SCALE}px "Segoe UI", Arial, sans-serif`;
    context.fillText("Könyvárlista", titleX, margin);

    context.font = `${16 * PDF_SCALE}px "Segoe UI", Arial, sans-serif`;
    context.fillStyle = "#51706b";
    context.fillText(`Generálva: ${new Date().toLocaleDateString("hu-HU")}`, titleX, margin + 48 * PDF_SCALE);
    context.fillText(`Oldal ${Math.floor(start / rowsPerPage) + 1}`, priceX - 90 * PDF_SCALE, margin + 48 * PDF_SCALE);

    context.strokeStyle = "#cfe0dc";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(margin, tableTop - 18 * PDF_SCALE);
    context.lineTo(pagePixelWidth - margin, tableTop - 18 * PDF_SCALE);
    context.stroke();

    context.font = `${15 * PDF_SCALE}px "Segoe UI", Arial, sans-serif`;
    context.fillStyle = "#0b5f58";
    context.fillText("Szerző", authorX, tableTop - 2 * PDF_SCALE);
    context.fillText("Cím", bookX, tableTop - 2 * PDF_SCALE);
    context.textAlign = "right";
    context.fillText("Ár", priceX, tableTop - 2 * PDF_SCALE);
    context.textAlign = "left";

    context.strokeStyle = "#a7c6c0";
    context.beginPath();
    context.moveTo(margin, tableTop + 24 * PDF_SCALE);
    context.lineTo(pagePixelWidth - margin, tableTop + 24 * PDF_SCALE);
    context.stroke();

    context.font = `${14 * PDF_SCALE}px "Segoe UI", Arial, sans-serif`;
    context.fillStyle = "#17312f";

    if (pageItems.length === 0) {
      context.fillText("Nincs exportálható könyv.", authorX, tableTop + 36 * PDF_SCALE);
    }

    pageItems.forEach((item, index) => {
      const rowY = tableTop + 36 * PDF_SCALE + index * rowHeight;
      const author = fitTextToWidth(context, item.author || "Szerző nincs megadva", 170 * PDF_SCALE);
      const title = fitTextToWidth(context, item.title, 250 * PDF_SCALE);
      const price = item.priceInput.trim() || "-";

      if (index % 2 === 0) {
        context.fillStyle = "#f4f8f7";
        context.fillRect(margin, rowY - 8 * PDF_SCALE, pagePixelWidth - margin * 2, 24 * PDF_SCALE);
      }

      context.fillStyle = "#17312f";
      context.textAlign = "left";
      context.fillText(author, authorX, rowY);
      context.fillText(title, bookX, rowY);
      context.textAlign = "right";
      context.fillText(price, priceX, rowY);
      context.textAlign = "left";

      context.strokeStyle = "#e4eeeb";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(margin, rowY + 24 * PDF_SCALE);
      context.lineTo(pagePixelWidth - margin, rowY + 24 * PDF_SCALE);
      context.stroke();
    });

    pages.push({
      data: await canvasToJpegBytes(canvas),
      width: pagePixelWidth,
      height: pagePixelHeight,
    });
  }

  return pages;
}

export function AdminBookPricesManager({ initialBooks }: { initialBooks: AdminBookPriceItem[] }) {
  const router = useRouter();
  const [books, setBooks] = useState(() => createEditableRows(initialBooks));
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const invalidBook = books.find((book) => !parsePriceInput(book.priceInput).ok);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("hu-HU");
  const filteredBooks = books.filter((book) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      book.title.toLocaleLowerCase("hu-HU").includes(normalizedQuery) ||
      book.author.toLocaleLowerCase("hu-HU").includes(normalizedQuery)
    );
  });
  const changedBooks = books.flatMap((book) => {
    const parsedPrice = parsePriceInput(book.priceInput);

    if (!parsedPrice.ok || parsedPrice.value === book.savedPrice) {
      return [];
    }

    return [
      {
        id: book.id,
        price: parsedPrice.value,
      },
    ];
  });
  const isBusy = isSaving || isPending || isExportingPdf;

  function updatePrice(bookId: string, priceInput: string) {
    setBooks((current) =>
      current.map((book) =>
        book.id === bookId
          ? {
              ...book,
              priceInput,
            }
          : book,
      ),
    );
  }

  function handleExcelExport() {
    const csvRows = [
      "sep=;",
      ["Szerző", "Cím", "Ár"].map(escapeCsvValue).join(";"),
      ...books.map((book) => {
        const author = escapeCsvValue(book.author || "Szerző nincs megadva");
        const title = escapeCsvValue(book.title);
        const price = escapeCsvValue(book.priceInput.trim());

        return [author, title, price].join(";");
      }),
    ];
    const csvContent = csvRows.join("\r\n");
    const blob = createUtf16LeBlob(csvContent, "text/csv;charset=utf-16le");
    const today = new Date().toISOString().slice(0, 10);

    downloadBlob(blob, `konyv-arak-${today}.csv`);
  }

  async function handlePdfExport() {
    setError("");
    setFeedback("");
    setIsExportingPdf(true);

    try {
      const pages = await createPdfPages(books);
      const pdfBlob = createPdfBlob(pages);
      const today = new Date().toISOString().slice(0, 10);

      downloadBlob(pdfBlob, `konyv-arak-${today}.pdf`);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Nem sikerült a PDF export létrehozása.",
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleBackNavigation() {
    if (changedBooks.length > 0) {
      setIsLeaveModalOpen(true);
      return;
    }

    router.push("/admin/books");
  }

  function handleLeaveWithoutSaving() {
    setIsLeaveModalOpen(false);
    router.push("/admin/books");
  }

  function closeLeaveModal() {
    setIsLeaveModalOpen(false);
  }

  async function handleSave() {
    if (invalidBook) {
      setFeedback("");
      setError(`Az ár csak nem negatív szám lehet ennél a könyvnél: ${invalidBook.title}.`);
      return;
    }

    if (changedBooks.length === 0) {
      setError("");
      setFeedback("Nincs menthető árváltozás.");
      return;
    }

    setIsSaving(true);
    setError("");
    setFeedback("");

    try {
      const response = await fetch("/api/admin/books/prices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates: changedBooks }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setError(payload?.message ?? "Az árak mentése nem sikerült.");
        return;
      }

      const changedPriceById = new Map(changedBooks.map((book) => [book.id, book.price]));

      setBooks((current) =>
        current.map((book) => {
          if (!changedPriceById.has(book.id)) {
            return book;
          }

          const nextPrice = changedPriceById.get(book.id) ?? null;

          return {
            ...book,
            price: nextPrice,
            savedPrice: nextPrice,
            priceInput: nextPrice === null ? "" : `${nextPrice}`,
          };
        }),
      );
      setFeedback(payload?.message ?? "A könyvárak sikeresen frissültek.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Hálózati hiba történt az árak mentése közben.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="admin-card">
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Könyvárak</p>
            <h3>Árak változtatása</h3>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.backButton} button-ghost`}
              style={{
                background: "white",
                color: "var(--teal)",
                border: "2px solid var(--teal)",
              }}
              onClick={handleBackNavigation}
              disabled={isBusy}
            >
              Vissza
            </button>
            <button
              type="button"
              className={styles.exportButton}
              onClick={handleExcelExport}
              disabled={books.length === 0 || isBusy}
            >
              Excel generálása
            </button>
            <button
              type="button"
              className={styles.exportButton}
              onClick={() => {
                void handlePdfExport();
              }}
              disabled={books.length === 0 || isBusy}
            >
              {isExportingPdf ? "PDF készül..." : "PDF generálása"}
            </button>
            <button
              type="button"
              className={styles.saveButton}
              onClick={() => {
                void handleSave();
              }}
              disabled={isBusy || books.length === 0 || changedBooks.length === 0}
            >
              {isSaving ? "Mentés folyamatban..." : "Adatok mentése"}
            </button>
          </div>
        </div>

        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        {books.length === 0 ? (
          <p className={styles.empty}>Még nincs feltöltött könyv.</p>
        ) : (
          <>
            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <span>Keresés cím vagy szerző alapján</span>
                <input
                  suppressHydrationWarning
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={styles.searchInput}
                  placeholder="Kezdd el beírni a címet vagy a szerzőt"
                />
              </label>
            </div>

            {filteredBooks.length === 0 ? (
              <p className={styles.empty}>Nincs a keresésnek megfelelő könyv.</p>
            ) : (
              <div className={styles.table}>
                <div className={`${styles.row} ${styles.headerRow}`}>
                  <span>Szerző</span>
                  <span>Cím</span>
                  <span>Ár (RON)</span>
                </div>

                {filteredBooks.map((book) => {
                  const parsedPrice = parsePriceInput(book.priceInput);
                  const isDirty = parsedPrice.ok && parsedPrice.value !== book.savedPrice;

                  return (
                    <div
                      key={book.id}
                      className={isDirty ? `${styles.row} ${styles.rowDirty}` : styles.row}
                    >
                      <span className={styles.author}>{book.author || "Szerző nincs megadva"}</span>
                      <span className={styles.title}>{book.title}</span>
                      <label className={styles.priceField}>
                        <input
                          suppressHydrationWarning
                          type="text"
                          inputMode="decimal"
                          value={book.priceInput}
                          onChange={(event) => updatePrice(book.id, event.target.value)}
                          className={styles.priceInput}
                          disabled={isBusy}
                          placeholder="0"
                          aria-label={`${book.title} ára`}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {isLeaveModalOpen ? (
        <div className={styles.modalBackdrop} onClick={closeLeaveModal}>
          <div className={styles.modalPanel} onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Nem mentett változások</p>
            <h3>Biztosan ki szeretnél lépni?</h3>
            <p className={styles.modalText}>
              Vannak nem mentett árváltozások. Ha most visszalépsz, ezek a módosítások elvesznek.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={closeLeaveModal}
              >
                Maradok
              </button>
              <button
                type="button"
                className={styles.modalLeaveButton}
                onClick={handleLeaveWithoutSaving}
              >
                Kilépés mentés nélkül
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
