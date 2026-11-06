const MAX_PROFILE_PHOTO_DATA_URL_LENGTH = 85000;
const PHOTO_QUALITIES = [0.78, 0.68, 0.58, 0.48, 0.38, 0.28];

export const toUploadablePhoto = (canvas) => {
  for (const quality of PHOTO_QUALITIES) {
    const photo = canvas.toDataURL('image/jpeg', quality);
    if (photo.length <= MAX_PROFILE_PHOTO_DATA_URL_LENGTH) return photo;
  }

  throw new Error('This image could not be compressed to the upload size. Choose another image.');
};

export const makeSquarePhoto = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('The selected image could not be read.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('The selected file is not a valid image.'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Your browser could not process the selected image.'));
        return;
      }

      const size = 400;
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const cropX = (image.naturalWidth - cropSize) / 2;
      const cropY = (image.naturalHeight - cropSize) / 2;
      canvas.width = size;
      canvas.height = size;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, size, size);
      try {
        resolve(toUploadablePhoto(canvas));
      } catch (error) {
        reject(error);
      }
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});
