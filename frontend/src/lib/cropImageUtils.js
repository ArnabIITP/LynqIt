// Utility to crop and rotate image using canvas
// Uses the same logic as react-easy-crop docs
export async function getCroppedImg(imageSrc, crop, rotation = 0) {
  const createImage = url => new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const safeArea = Math.max(image.width, image.height) * 2;
  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(image, (safeArea - image.width) / 2, (safeArea - image.height) / 2);

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // Set canvas to final crop size
  canvas.width = crop.width;
  canvas.height = crop.height;

  // Draw cropped image
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width / 2 - crop.x),
    Math.round(0 - safeArea / 2 + image.height / 2 - crop.y)
  );

  // Return as base64
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(blob);
    }, 'image/jpeg');
  });
}
