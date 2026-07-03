"use client";

// Downscale a captured/uploaded photo in the browser before sending it to the
// vision API — keeps the request small and fast while preserving enough detail
// to read a receipt total or price tag.

export interface EncodedImage {
  /** base64 WITHOUT the data: prefix */
  data: string;
  media_type: "image/jpeg";
}

export async function resizeImageFile(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<EncodedImage> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { data, media_type: "image/jpeg" };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> */
    }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = URL.createObjectURL(file);
  });
}
