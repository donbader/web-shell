const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3366';

export interface ImageStatus {
  environment: string;
  exists: boolean;
}

export interface BuildProgress {
  status: 'starting' | 'building' | 'completed' | 'error';
  environment?: string;
  stream?: string;
  progress?: string;
  error?: string;
}

/**
 * Check if a specific environment image exists
 */
export async function checkImageExists(environment: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/images/check/${environment}`);
    if (!response.ok) {
      throw new Error(`Failed to check image: ${response.statusText}`);
    }

    const data: ImageStatus = await response.json();
    return data.exists;
  } catch (error) {
    console.error('[ImageService] Error checking image:', error);
    throw error;
  }
}

/**
 * Build an environment image with progress streaming via Server-Sent Events
 */
export async function buildImage(
  environment: string,
  onProgress: (progress: BuildProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use fetch to POST and create connection, then read stream
    fetch(`${API_URL}/api/images/build/${environment}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Build request failed: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            resolve();
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: BuildProgress = JSON.parse(line.substring(6));
                onProgress(data);

                if (data.status === 'completed') {
                  reader.cancel();
                  resolve();
                  return;
                } else if (data.status === 'error') {
                  reader.cancel();
                  reject(new Error(data.error || 'Build failed'));
                  return;
                }
              } catch (error) {
                console.error('[ImageService] Error parsing progress:', error);
              }
            }
          }
        }
      })
      .catch((error) => {
        console.error('[ImageService] Build error:', error);
        reject(error);
      });
  });
}

/**
 * Ensure an image exists, building it if necessary
 */
export async function ensureImage(
  environment: string,
  onProgress?: (progress: BuildProgress) => void
): Promise<void> {
  const exists = await checkImageExists(environment);

  if (exists) {
    console.log(`[ImageService] Image ${environment} already exists`);
    return;
  }

  console.log(`[ImageService] Image ${environment} not found, building...`);

  if (onProgress) {
    await buildImage(environment, onProgress);
  } else {
    await buildImage(environment, (progress) => {
      console.log('[ImageService] Build progress:', progress);
    });
  }
}
