export const SIGNED_UPLOAD_RESPONSE_GRACE_MS = 15_000;

function createDefaultRequest() {
  return new XMLHttpRequest();
}

export function uploadAudioToSignedUrl(
  { file, uploadUrl, contentType, onProgress },
  {
    createRequest = createDefaultRequest,
    responseGraceMs = SIGNED_UPLOAD_RESPONSE_GRACE_MS,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const xhr = createRequest();
    let settled = false;
    let responseTimer = null;

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      if (responseTimer !== null) globalThis.clearTimeout(responseTimer);
      callback();
    };

    const startResponseTimer = () => {
      if (settled || responseTimer !== null) return;

      // Supabase may persist the object while its PUT response remains open. Once
      // every byte is sent, give that response a short grace period, then let the
      // server finalizer prove whether the object is complete and valid.
      responseTimer = globalThis.setTimeout(() => finish(resolve), responseGraceMs);
    };

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;

      onProgress?.(event.loaded, event.total);
      if (event.total > 0 && event.loaded >= event.total) startResponseTimer();
    });
    xhr.upload.addEventListener('load', startResponseTimer);

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finish(resolve);
      } else {
        finish(() => reject(new Error('Upload failed')));
      }
    });
    xhr.addEventListener('error', () => finish(() => reject(new Error('Network error'))));
    xhr.addEventListener('abort', () => finish(() => reject(new Error('Upload cancelled'))));
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}
