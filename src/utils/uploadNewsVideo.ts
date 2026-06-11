import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadVideoOptions {
  onProgress?: (percent: number) => void;
  uploadToFirebase?: boolean;
  storagePath?: string;
}

/**
 * Uploads a video file to Firebase Storage if online and connected.
 * Falls back to base64 data URL if offline/error occurs.
 * 
 * @param file The HTML File object to upload
 * @param options Upload options including progress callback and paths
 * @returns Promise resolving to the Firebase Storage URL or a base64 Data URL, and optionally triggering warning on fallback
 */
export const uploadVideoFile = (
  file: File,
  options?: UploadVideoOptions
): Promise<string> => {
  const uploadToFirebase = options?.uploadToFirebase !== false;
  const storagePath = options?.storagePath || 'news_videos/';
  const onProgress = options?.onProgress;

  return new Promise((resolve, reject) => {
    // Check if we should upload to Firebase Storage and storage is configured
    if (!uploadToFirebase || !storage) {
      readAsBase64(file, resolve, reject, onProgress);
      return;
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileRef = ref(storage, `${storagePath}${Date.now()}-${sanitizedName}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        console.warn('Firebase Storage upload failed, falling back to base64', error);
        // Fallback to base64 on error
        readAsBase64(file, resolve, reject, onProgress);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (e) {
          console.warn('Failed to get download URL, falling back to base64', e);
          readAsBase64(file, resolve, reject, onProgress);
        }
      }
    );
  });
};

const readAsBase64 = (
  file: File,
  resolve: (value: string) => void,
  reject: (reason: any) => void,
  onProgress?: (percent: number) => void
) => {
  const reader = new FileReader();
  
  reader.onloadstart = () => {
    if (onProgress) onProgress(0);
  };
  
  reader.onprogress = (e) => {
    if (e.lengthComputable && onProgress) {
      onProgress(Math.round((e.loaded / e.total) * 100));
    }
  };
  
  reader.onload = (event) => {
    const result = event.target?.result;
    if (typeof result === 'string') {
      if (onProgress) onProgress(100);
      
      resolve(result);
    } else {
      reject(new Error('Не удалось прочитать видеофайл.'));
    }
  };
  
  reader.onerror = () => {
    reject(new Error('Ошибка при чтении видеофайла.'));
  };
  
  reader.readAsDataURL(file);
};
