/**
 * Renders front and back covers to PNG blobs using browser canvas.
 * Output matches the BookPreview CoverPage / BackCoverPage components exactly.
 * A4 at 150dpi = 1240×1754.
 */

const W = 1240;
const H = 1754;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Render the front cover to a PNG blob.
 *
 * @param logoSrc        URL of the Piccoload logo (imported asset)
 * @param gridImageUrls  4 URLs: [original1, lineart1, lineart2, original2] (null = placeholder)
 * @param subtitle       Upper text line (e.g. "FOR KIDS AND ADULTS ALIKE")
 * @param bottomTitle    Lower text line (e.g. "color your memories")
 */
export async function renderFrontCoverPng(
  logoSrc: string,
  gridImageUrls: (string | null)[],
  subtitle: string,
  bottomTitle: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Cream background
  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(0, 0, W, H);

  // Logo — centered, width = 50% of canvas
  try {
    const logo = await loadImage(logoSrc);
    const logoW = Math.round(W * 0.5);
    const logoH = Math.round(logoW * (logo.naturalHeight / logo.naturalWidth));
    const logoX = Math.round((W - logoW) / 2);
    // Place logo so bottom sits just above the grid (grid starts at gridTop)
    const gridTop = Math.round(H * 0.16);
    const logoY = Math.round(gridTop / 2 - logoH / 2);
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  } catch {
    // Skip logo if it fails to load
  }

  // 2×2 grid
  const gridMargin = Math.round(W * 0.0875);
  const gridW = W - gridMargin * 2;
  const cellSize = Math.round(gridW / 2);
  const gridTop = Math.round(H * 0.16);

  const positions: [number, number][] = [
    [gridMargin, gridTop],
    [gridMargin + cellSize, gridTop],
    [gridMargin, gridTop + cellSize],
    [gridMargin + cellSize, gridTop + cellSize],
  ];

  // Placeholder fills
  ctx.fillStyle = "#ede8e0";
  for (const [x, y] of positions) {
    ctx.fillRect(x, y, cellSize, cellSize);
  }

  // Draw grid images
  for (let i = 0; i < 4; i++) {
    const url = gridImageUrls[i];
    if (!url) continue;
    try {
      const img = await loadImage(url);
      const [x, y] = positions[i];
      // Cover-fit into cell (crop to square)
      const srcAspect = img.naturalWidth / img.naturalHeight;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (srcAspect > 1) {
        sw = img.naturalHeight;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, cellSize, cellSize);
    } catch {
      // Skip failed image
    }
  }

  // Bottom text — right-aligned, below grid
  const textRightX = W - gridMargin;
  const textTopY = gridTop + cellSize * 2 + Math.round(H * 0.03);

  // Subtitle (Yuji Syuku fallback to sans-serif)
  ctx.fillStyle = "#282828";
  ctx.textAlign = "right";
  ctx.font = `${Math.round(W * 0.031)}px "Yuji Syuku", serif`;
  ctx.fillText(subtitle.toUpperCase(), textRightX, textTopY);

  // Bottom title (Bristol fallback to serif)
  ctx.font = `${Math.round(W * 0.038)}px "Bristol", serif`;
  ctx.fillText(bottomTitle, textRightX, textTopY + Math.round(H * 0.03));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

/**
 * Render the back cover to a PNG blob.
 *
 * @param logoSrc    URL of the Piccoload logo
 * @param qrCodeSrc  URL of the QR code image
 */
export async function renderBackCoverPng(
  logoSrc: string,
  qrCodeSrc: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Cream background
  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(0, 0, W, H);

  // The logo asset is a 2000x2000 square with the wordmark inset — 39% of the
  // height is transparent padding above it and 36% below. Scaling the whole
  // square to 40% of the page width therefore produced a 496px-tall block whose
  // wordmark landed on top of the affiliate text drawn beneath it. Crop to the
  // wordmark's own bounds so its height follows its real aspect ratio, and lay
  // the block out bottom-up so every element reserves its own space.
  const LOGO_BOX = { x: 308 / 2000, y: 780 / 2000, w: 1453 / 2000, h: 504 / 2000 };

  const bottomMargin = Math.round(H * 0.034);
  const logoW = Math.round(W * 0.36);
  const logoH = Math.round(logoW * (LOGO_BOX.h / LOGO_BOX.w));
  const logoX = Math.round((W - logoW) / 2);
  const logoY = H - bottomMargin - logoH;

  // QR + affiliate text row, sitting clear above the logo
  const qrSize = Math.round(W * 0.065);
  const affFontSize = Math.round(W * 0.013);
  const affLeading = Math.round(affFontSize * 1.5);
  const affLines = [
    "Please scan the QR code for",
    "information on our affiliate",
    "programme. Make money for",
    "your referrals!",
  ];
  const affBlockH = affFontSize + affLeading * (affLines.length - 1);
  const rowH = Math.max(qrSize, affBlockH);
  const rowTop = logoY - Math.round(H * 0.016) - rowH;

  // Website + social — centered, above the QR row
  const webFontSize = Math.round(W * 0.016);
  const webBaseline = rowTop - Math.round(H * 0.0125);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = `${webFontSize}px "Yuji Syuku", serif`;
  ctx.fillText("www.piccoload.com          @officialpiccoload", W / 2, webBaseline);

  try {
    const qr = await loadImage(qrCodeSrc);
    const qrX = Math.round(W / 2 - qrSize - W * 0.04);
    ctx.drawImage(qr, qrX, rowTop + Math.round((rowH - qrSize) / 2), qrSize, qrSize);
  } catch {
    // Skip
  }

  const affTextX = Math.round(W / 2 + W * 0.01);
  ctx.font = `${affFontSize}px "Yuji Syuku", serif`;
  ctx.textAlign = "left";
  affLines.forEach((line, i) => {
    ctx.fillText(line, affTextX, rowTop + affFontSize + i * affLeading);
  });

  // Logo last, cropped to the wordmark and anchored to the bottom margin
  try {
    const logo = await loadImage(logoSrc);
    ctx.drawImage(
      logo,
      LOGO_BOX.x * logo.naturalWidth,
      LOGO_BOX.y * logo.naturalHeight,
      LOGO_BOX.w * logo.naturalWidth,
      LOGO_BOX.h * logo.naturalHeight,
      logoX,
      logoY,
      logoW,
      logoH,
    );
  } catch {
    // Skip
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}
