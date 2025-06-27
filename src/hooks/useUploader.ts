/**
 * Custom hook for handling file uploads
 * Separates upload logic from UI components
 */

import { useState } from 'react';

export interface UploadState {
  isProcessing: boolean;
  processingStatus: string;
  error: string | null;
  result: any | null;
}

export interface UseUploaderReturn {
  state: UploadState;
  upload: (formData: FormData) => Promise<any>;
  reset: () => void;
}

export function useUploader(uploadUrl: string = '/api/recording/upload'): UseUploaderReturn {
  const [state, setState] = useState<UploadState>({
    isProcessing: false,
    processingStatus: '',
    error: null,
    result: null
  });

  const upload = async (formData: FormData): Promise<any> => {
    setState({
      isProcessing: true,
      processingStatus: 'Uploading recording...',
      error: null,
      result: null
    });

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      
      setState({
        isProcessing: false,
        processingStatus: 'Upload complete!',
        error: null,
        result
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload recording';
      setState({
        isProcessing: false,
        processingStatus: '',
        error: errorMessage,
        result: null
      });
      throw error;
    }
  };

  const reset = () => {
    setState({
      isProcessing: false,
      processingStatus: '',
      error: null,
      result: null
    });
  };

  return {
    state,
    upload,
    reset
  };
}