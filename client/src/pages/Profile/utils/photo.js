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
      const photo = canvas.toDataURL('image/jpeg', 0.78);
      if (photo.length > 900000) {
        reject(new Error('This image could not be compressed enough. Choose another image.'));
        return;
      }
      resolve(photo);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});
