/**
 * Renders front and back covers to PNG blobs using browser canvas.
 * Output matches the BookPreview CoverPage / BackCoverPage components exactly.
 * A4 at 300dpi = 2480×3508, matching convert-to-lineart's interior pages — a
 * 150dpi cover on 300dpi pages prints as a visibly softer front.
 *
 * 8.7M pixels is within the canvas ceiling on every browser we support
 * (iOS Safari caps around 16.7M), but a single canvas is now roughly 35MB of
 * RGBA. CheckoutStep starts every cover for every book at once, so a 3-book
 * order would otherwise hold six of them live — enough to be killed on a
 * mid-range phone. renderQueued() below serialises them instead.
 */

const W = 2480;
const H = 3508;

/**
 * Serialises canvas work so only one full-size cover exists at a time.
 * Callers can still fire renders concurrently; they simply queue here.
 */
let renderChain: Promise<unknown> = Promise.resolve();

function renderQueued<T>(work: () => Promise<T>): Promise<T> {
  const next = renderChain.then(work, work);
  // Keep the chain alive regardless of individual failures.
  renderChain = next.catch(() => undefined);
  return next;
}

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
async function renderFrontCoverPngUnqueued(
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
      (blob) => {
        // Drop the backing store now rather than waiting for GC; at 2480×3508
        // each canvas holds ~35MB and the next cover is queued right behind.
        canvas.width = 0;
        canvas.height = 0;
        blob ? resolve(blob) : reject(new Error("toBlob failed"));
      },
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
async function renderBackCoverPngUnqueued(
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

  // Content sits in bottom 25%
  const contentTop = Math.round(H * 0.75);

  // Logo — 40% width, centered
  try {
    const logo = await loadImage(logoSrc);
    const logoW = Math.round(W * 0.4);
    const logoH = Math.round(logoW * (logo.naturalHeight / logo.naturalWidth));
    const logoX = Math.round((W - logoW) / 2);
    ctx.drawImage(logo, logoX, contentTop, logoW, logoH);
  } catch {
    // Skip
  }

  // Website + social — centered text
  const textY = contentTop + Math.round(H * 0.06);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = `${Math.round(W * 0.016)}px "Yuji Syuku", serif`;
  ctx.fillText("www.piccoload.com          @officialpiccoload", W / 2, textY);

  // QR code + affiliate text
  const qrY = textY + Math.round(H * 0.015);
  const qrSize = Math.round(W * 0.065);
  try {
    const qr = await loadImage(qrCodeSrc);
    const qrX = Math.round(W / 2 - qrSize - W * 0.04);
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  } catch {
    // Skip
  }

  // Affiliate text next to QR
  const affTextX = Math.round(W / 2 + W * 0.01);
  const affFontSize = Math.round(W * 0.013);
  ctx.font = `${affFontSize}px "Yuji Syuku", serif`;
  ctx.textAlign = "left";
  const affLines = [
    "Please scan the QR code for",
    "information on our affiliate",
    "programme. Make money for",
    "your referrals!",
  ];
  affLines.forEach((line, i) => {
    ctx.fillText(line, affTextX, qrY + affFontSize + i * Math.round(affFontSize * 1.5));
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Drop the backing store now rather than waiting for GC; at 2480×3508
        // each canvas holds ~35MB and the next cover is queued right behind.
        canvas.width = 0;
        canvas.height = 0;
        blob ? resolve(blob) : reject(new Error("toBlob failed"));
      },
      "image/png",
    );
  });
}

/**
 * Render the front cover to a PNG blob. Queued — see renderQueued above.
 */
export function renderFrontCoverPng(
  logoSrc: string,
  gridImageUrls: (string | null)[],
  subtitle: string,
  bottomTitle: string,
): Promise<Blob> {
  return renderQueued(() =>
    renderFrontCoverPngUnqueued(logoSrc, gridImageUrls, subtitle, bottomTitle),
  );
}

/**
 * Render the back cover to a PNG blob. Queued — see renderQueued above.
 */
export function renderBackCoverPng(logoSrc: string, qrCodeSrc: string): Promise<Blob> {
  return renderQueued(() => renderBackCoverPngUnqueued(logoSrc, qrCodeSrc));
}
