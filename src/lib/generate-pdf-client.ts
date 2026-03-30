import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

const A4_W = 210;
const A4_H = 297;

async function downloadImageAsBase64(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("order-files")
    .createSignedUrl(path, 600);
  if (error || !data?.signedUrl) return null;

  try {
    const response = await fetch(data.signedUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface GeneratePdfOptions {
  orderId: string;
  onProgress?: (current: number, total: number) => void;
}

interface PdfResult {
  blob: Blob;
  arrayBuffer: ArrayBuffer;
}

export async function generatePdfClientSide({ orderId, onProgress }: GeneratePdfOptions): Promise<PdfResult> {
  // Fetch order details using service role via edge function is not needed — 
  // we read via RLS (admin or owner can read)
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, title_page_text, title_page_enabled, dedication_page_text, dedication_page_enabled, cover_image_id, cover_image_id_2")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) throw new Error("Order not found");

  const { data: photos } = await supabase
    .from("order_photos")
    .select("id, original_path, converted_path, conversion_status, page_position, is_landscape")
    .eq("order_id", orderId)
    .order("page_position");

  if (!photos || photos.length === 0) throw new Error("No photos found");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let firstPage = true;
  const totalSteps = photos.length + 2; // cover + back + photos
  let currentStep = 0;

  function report() {
    currentStep++;
    onProgress?.(currentStep, totalSteps);
  }

  function addImagePage(dataUrl: string) {
    if (!firstPage) doc.addPage();
    firstPage = false;
    try {
      doc.addImage(dataUrl, "PNG", 0, 0, A4_W, A4_H);
    } catch {
      // Try as JPEG fallback
      try {
        doc.addImage(dataUrl, "JPEG", 0, 0, A4_W, A4_H);
      } catch (e) {
        console.warn("Failed to add image to PDF:", e);
      }
    }
  }

  // 1. Front cover
  firstPage = false;
  doc.setFillColor(255, 250, 243);
  doc.rect(0, 0, A4_W, A4_H, "F");

  // Logo
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("piccolo'd", A4_W / 2, 55, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("FROM PIC TO PEN", A4_W / 2, 65, { align: "center" });

  // 2x2 cover grid
  const gridMargin = A4_W * 0.0875;
  const gridW = A4_W - gridMargin * 2;
  const cellSize = gridW / 2;
  const gridTop = 80;

  const coverPhotoId1 = order.cover_image_id;
  const coverPhotoId2 = order.cover_image_id_2 || coverPhotoId1;

  let coverPhoto1: { original_path: string; converted_path: string | null } | null = null;
  let coverPhoto2: { original_path: string; converted_path: string | null } | null = null;

  if (coverPhotoId1) {
    const found = photos.find((p) => p.id === coverPhotoId1);
    if (found) coverPhoto1 = found;
  }
  if (coverPhotoId2 && coverPhotoId2 !== coverPhotoId1) {
    const found = photos.find((p) => p.id === coverPhotoId2);
    if (found) coverPhoto2 = found;
  } else {
    coverPhoto2 = coverPhoto1;
  }

  const gridPaths = [
    coverPhoto1?.original_path ?? null,
    coverPhoto1?.converted_path ?? null,
    coverPhoto2?.converted_path ?? null,
    coverPhoto2?.original_path ?? null,
  ];

  const gridPositions = [
    [gridMargin, gridTop],
    [gridMargin + cellSize, gridTop],
    [gridMargin, gridTop + cellSize],
    [gridMargin + cellSize, gridTop + cellSize],
  ];

  // Draw placeholder backgrounds
  doc.setFillColor(237, 232, 224);
  for (const [x, y] of gridPositions) {
    doc.rect(x, y, cellSize, cellSize, "F");
  }

  // Download and draw cover grid images
  for (let i = 0; i < 4; i++) {
    const path = gridPaths[i];
    if (!path || path === "deleted") continue;
    const dataUrl = await downloadImageAsBase64(path);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "JPEG", gridPositions[i][0], gridPositions[i][1], cellSize, cellSize);
      } catch (e) {
        console.warn(`Cover grid image ${i} failed:`, e);
      }
    }
  }

  // Bottom text
  const textRightX = A4_W - gridMargin;
  const textTopY = gridTop + cellSize * 2 + 12;

  const subtitle = order.dedication_page_enabled && order.dedication_page_text?.trim()
    ? order.dedication_page_text.trim().toUpperCase()
    : "FOR KIDS AND ADULTS ALIKE";
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(subtitle, textRightX, textTopY, { align: "right" });

  const bottomTitle = order.dedication_page_enabled && order.dedication_page_text?.trim()
    ? order.dedication_page_text.trim()
    : "color your memories";
  doc.setFontSize(18);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(40, 40, 40);
  doc.text(bottomTitle, textRightX, textTopY + 10, { align: "right" });
  report();

  // 2. Back cover
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, A4_W, A4_H, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("piccolo'd", A4_W / 2, A4_H - 10, { align: "center" });
  report();

  // 3. Title page
  if (order.title_page_enabled && order.title_page_text) {
    doc.addPage();
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(order.title_page_text, A4_W - 40);
    doc.text(lines, A4_W / 2, A4_H / 2, { align: "center" });
  }

  // 4. Dedication page
  if (order.dedication_page_enabled && order.dedication_page_text) {
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(order.dedication_page_text, A4_W - 40);
    doc.text(lines, A4_W / 2, A4_H / 2, { align: "center" });
  }

  // 5. Line art pages
  const coverIds = new Set([coverPhotoId1, coverPhotoId2].filter(Boolean));
  for (const photo of photos) {
    const path = photo.converted_path || photo.original_path;
    if (!path || path === "deleted") {
      report();
      continue;
    }

    const dataUrl = await downloadImageAsBase64(path);
    if (dataUrl) {
      addImagePage(dataUrl);
    }
    report();
  }

  const arrayBuffer = doc.output("arraybuffer");
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });

  return { blob, arrayBuffer };
}

/**
 * Generate PDF client-side and upload to storage, then update the order record.
 */
export async function generateAndUploadPdf(
  orderId: string,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const { arrayBuffer } = await generatePdfClientSide({ orderId, onProgress });

  const pdfPath = `production-pdfs/${orderId}/coloring-book.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("order-files")
    .upload(pdfPath, arrayBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) throw new Error("Failed to upload PDF: " + uploadError.message);

  // Update order with production_pdf_path
  await supabase
    .from("orders")
    .update({ production_pdf_path: pdfPath })
    .eq("id", orderId);

  return pdfPath;
}
