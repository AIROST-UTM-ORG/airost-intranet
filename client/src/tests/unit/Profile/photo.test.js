import { toUploadablePhoto } from '../../../pages/Profile/utils/photo';

describe('toUploadablePhoto', () => {
  test('reduces image quality until the encoded photo fits the request limit', () => {
    const photo = 'x'.repeat(80000);
    const canvas = {
      toDataURL: jest.fn()
        .mockReturnValueOnce('x'.repeat(90000))
        .mockReturnValueOnce(photo),
    };

    expect(toUploadablePhoto(canvas)).toBe(photo);
    expect(canvas.toDataURL.mock.calls).toEqual([
      ['image/jpeg', 0.78],
      ['image/jpeg', 0.68],
    ]);
  });

  test('rejects images that remain above the request limit at minimum quality', () => {
    const canvas = { toDataURL: jest.fn(() => 'x'.repeat(90000)) };

    expect(() => toUploadablePhoto(canvas)).toThrow(
      'This image could not be compressed to the upload size. Choose another image.',
    );
    expect(canvas.toDataURL).toHaveBeenCalledTimes(6);
  });
});
