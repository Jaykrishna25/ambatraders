// Turns one uploaded catalogue image into the three web versions the site uses:
//   image — full card (max 1100px wide)
//   thumb — grid thumbnail (550px wide)
//   model — cropped model shot (left panel of a standard catalogue card)
// Everything runs in the browser with <canvas>, output as WebP.

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image file.'));
    };
    img.src = url;
  });

function render(img, sx, sy, sw, sh, maxW, quality = 0.84) {
  const scale = Math.min(1, maxW / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image conversion failed.'))), 'image/webp', quality),
  );
}

/**
 * @param {File} file
 * @param {{ catalogCard?: boolean }} opts  catalogCard: crop the left model panel like the existing cards
 */
export async function makeImageSet(file, { catalogCard = true } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  const img = await loadImage(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const portrait = H / W > 1.15;
  const [image, thumb, model] = await Promise.all([
    render(img, 0, 0, W, H, 1100),
    render(img, 0, 0, W, H, 550, 0.8),
    catalogCard && portrait
      ? render(img, 0, 0, Math.round(W * 0.38), Math.round(H * 0.74), 420)
      : render(img, 0, 0, W, H, 600),
  ]);
  return { image, thumb, model };
}

export const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read image.'));
    r.readAsDataURL(blob);
  });
