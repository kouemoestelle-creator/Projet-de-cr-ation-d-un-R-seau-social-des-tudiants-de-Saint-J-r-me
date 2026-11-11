// Réduit l'image dans le navigateur avant l'envoi (économie de données, objectif : moins de 1 Mo).
export async function compressImage(file, { maxSize = 1280, quality = 0.8 } = {}) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Format non accepté : choisissez une image JPEG ou PNG.');
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // fond blanc pour les PNG transparents
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Impossible de préparer cette image.');
  return new File([blob], 'image.jpg', { type: 'image/jpeg' });
}
