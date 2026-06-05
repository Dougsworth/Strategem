// Original scoresheet photos, kept so a coach can compare the reconstruction to
// the paper. Images are big, so they live in localStorage keyed by game id
// (NOT in the Firestore coach doc, which caps at 1 MB) — available on the device
// that scanned. We downscale + JPEG-compress first to stay small, and evict the
// oldest beyond a cap.

const PREFIX = "strategem.scanimg.";
const IDX = "strategem.scanimg.ids";
const CAP = 15;

function ids(): string[] {
  try {
    return JSON.parse(localStorage.getItem(IDX) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function getScanImage(id: string): string | null {
  try {
    return localStorage.getItem(PREFIX + id);
  } catch {
    return null;
  }
}

export function saveScanImage(id: string, dataUrl: string): void {
  const list = ids().filter((x) => x !== id);
  list.push(id);
  while (list.length > CAP) {
    const old = list.shift();
    if (old) {
      try {
        localStorage.removeItem(PREFIX + old);
      } catch {
        /* ignore */
      }
    }
  }
  // Store, evicting the oldest on quota errors and retrying.
  for (let tries = 0; tries < 6; tries++) {
    try {
      localStorage.setItem(PREFIX + id, dataUrl);
      localStorage.setItem(IDX, JSON.stringify(list));
      return;
    } catch {
      const old = list.shift();
      if (!old) return;
      try {
        localStorage.removeItem(PREFIX + old);
      } catch {
        /* ignore */
      }
    }
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Downscale to maxDim and JPEG-compress → a small data URL for comparison. */
export async function compressImage(
  file: File,
  maxDim = 1800,
  quality = 0.6,
): Promise<string> {
  try {
    const url = await readFile(file);
    const img = await loadImg(url);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return url;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    // Fall back to the raw file if canvas/processing fails.
    return readFile(file);
  }
}
