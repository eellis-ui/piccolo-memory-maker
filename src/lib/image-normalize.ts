/**
 * Shared photo normalization for every path that uploads book photos.
 *
 * Both the Upload step and the Approve step's "add photos" flow must produce
 * the same thing: a portrait-A4, ≤1536px JPEG. Photos that skip this (raw
 * HEICs, full-resolution originals, landscape crops) render wrong in the book
 * or kill the converter, so there is exactly one implementation.
 */

/** Convert HEIC/HEIF to a JPEG blob (lazy-loads the codec). */
export const convertHeicToJpeg = async (file: File): Promise<Blob> => {
  const { heicTo } = await import("heic-to");
  return heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
};

export const isHeicFile = (file: File): boolean => {
  const nameLower = file.name.toLowerCase();
  return (
    nameLower.endsWith(".heic") ||
    nameLower.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
};

/**
 * Normalize an image: always output PORTRAIT A4 ratio.
 * Landscape images are rotated 90° CW so they fill the portrait page.
 * No stretching — only center-crop and rotation.
 */
export const normalizeImage = (blob: Blob): Promise<{ blob: Blob; isLandscape: boolean }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      // 1536 matches the AI converter's input cap (convert-to-lineart MAX_DIM)
      // — anything lower starves the line-art model of detail.
      const MAX_DIM = 1536;
      const A4_PORTRAIT_RATIO = 1 / Math.SQRT2; // ≈ 0.7071 (portrait A4: 210×297mm)

      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const needsRotation = natW > natH; // Landscape → rotate 90° CW to portrait

      // Step 1: If landscape, rotate onto a temp canvas so it becomes portrait.
      // The rotation canvas is pre-scaled below iOS Safari's canvas ceiling
      // (~16.7M px backing store) — a 48MP phone photo drawn at natural size
      // silently produces a blank canvas there, which then failed the whole
      // upload batch.
      const MAX_CANVAS_PIXELS = 12_000_000;
      const preScale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (natW * natH)));
      const srcW = Math.round(natW * preScale);
      const srcH = Math.round(natH * preScale);

      let source: HTMLCanvasElement | HTMLImageElement;
      let effW: number, effH: number;

      if (needsRotation) {
        const tmp = document.createElement("canvas");
        tmp.width = srcH;
        tmp.height = srcW;
        const tCtx = tmp.getContext("2d")!;
        tCtx.translate(srcH, 0);
        tCtx.rotate(Math.PI / 2);
        tCtx.drawImage(img, 0, 0, srcW, srcH);
        source = tmp;
        effW = srcH;
        effH = srcW;
      } else if (preScale < 1) {
        const tmp = document.createElement("canvas");
        tmp.width = srcW;
        tmp.height = srcH;
        tmp.getContext("2d")!.drawImage(img, 0, 0, srcW, srcH);
        source = tmp;
        effW = srcW;
        effH = srcH;
      } else {
        source = img;
        effW = natW;
        effH = natH;
      }

      // Step 2: Cover-crop to portrait A4 ratio (no stretching)
      let cropX = 0, cropY = 0, cropW = effW, cropH = effH;
      const currentRatio = effW / effH;

      if (currentRatio > A4_PORTRAIT_RATIO) {
        // Wider than A4 portrait → crop sides
        cropW = Math.round(effH * A4_PORTRAIT_RATIO);
        cropX = Math.round((effW - cropW) / 2);
      } else if (currentRatio < A4_PORTRAIT_RATIO) {
        // Taller than A4 portrait → crop top/bottom
        cropH = Math.round(effW / A4_PORTRAIT_RATIO);
        cropY = Math.round((effH - cropH) / 2);
      }

      // Step 3: Scale down to max dimension
      let w = cropW, h = cropH;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      // Step 4: Draw final portrait image
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));
      ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, w, h);
      canvas.toBlob(
        (result) => (result ? resolve({ blob: result, isLandscape: false }) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        0.85
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(blob);
  });
};
