import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Uploads a file to Firebase Storage
 * @param file The file to upload
 * @param folder The folder path in storage (e.g. 'avatars' or 'submissions')
 * @returns Object containing the download URL and metadata
 */
export const uploadFileToFirebase = async (
  file: File, 
  folder: string = 'uploads'
): Promise<{ url: string, path: string, format: string, bytes: number }> => {
  if (!storage) {
    throw new Error("Firebase Storage бапталмаған. (Firebase Storage is not configured)");
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  // Generate a unique filename using timestamp and random string
  const uniqueId = Date.now().toString() + '-' + Math.round(Math.random() * 1000000);
  const fileName = `${uniqueId}.${extension}`;
  const fullPath = `${folder}/${fileName}`;

  const storageRef = ref(storage, fullPath);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      path: fullPath,
      format: extension,
      bytes: file.size
    };
  } catch (error: any) {
    console.error("Firebase Storage Upload Error:", error);
    throw new Error(error.message || "Файлды Firebase Storage-ке жүктеу кезінде қате пайда болды.");
  }
};
