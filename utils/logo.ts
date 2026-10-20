// Shrinks an uploaded logo before it's saved. Logos ride along on every invoice
// and receipt link, so a 4 MB phone photo would make those pages slow; 512px
// is plenty for any place the logo is shown. Transparency is kept (PNG), with a
// WebP fallback if the PNG is still large.
const MAX_SIDE = 512;
const TARGET_BYTES = 450 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be read as an image'));
    img.src = src;
  });

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Could not read the file'));
    r.readAsDataURL(file);
  });

const dataUrlBytes = (dataUrl: string) => Math.ceil(((dataUrl.split(',')[1] || '').length * 3) / 4);

export const prepareLogo = async (file: File): Promise<string> => {
  if (!ACCEPTED.includes(file.type)) throw new Error('Please choose a PNG, JPG or WebP image');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is too large (max 15 MB)');

  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return original;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  let out = canvas.toDataURL('image/png');
  if (dataUrlBytes(out) > TARGET_BYTES) out = canvas.toDataURL('image/webp', 0.9);
  if (dataUrlBytes(out) > TARGET_BYTES) out = canvas.toDataURL('image/webp', 0.75);
  return out;
};
