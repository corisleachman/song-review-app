export const SIGNED_UPLOAD_RESPONSE_GRACE_MS = 15_000;

function createDefaultRequest() {
  return new XMLHttpRequest();
}

export function reportUploadDiagnostic(event, details = {}) {
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get('uploadDebug') !== '1') return;

  // Explicit QA opt-in only. Never log URLs, tokens, filenames, or file content.
  console.info('[audio-upload]', JSON.stringify({ event, ...details }));
}

export function uploadAudioToSignedUrl(
  { file, uploadUrl, contentType, onProgress },
  {
    createRequest = createDefaultRequest,
    responseGraceMs = SIGNED_UPLOAD_RESPONSE_GRACE_MS,
    onDiagnostic = reportUploadDiagnostic,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const xhr = createRequest();
    let settled = false;
    let responseTimer = null;
    const startedAt = Date.now();
    const diagnose = (event, details = {}) => {
      onDiagnostic(event, { elapsedMs: Date.now() - startedAt, ...details });
    };

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      if (responseTimer !== null) globalThis.clearTimeout(responseTimer);
      callback();
    };

    const startResponseTimer = () => {
      if (settled || responseTimer !== null) return;

      diagnose('response_grace_started', { responseGraceMs });
      // Supabase may persist the object while its PUT response remains open. Once
      // browser progress rounds to 100%, give that response a short grace period,
      // then let the server finalizer prove whether the object is complete and valid.
      responseTimer = globalThis.setTimeout(() => {
        diagnose('response_grace_elapsed');
        finish(resolve);
      }, responseGraceMs);
    };

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;

      onProgress?.(event.loaded, event.total);
      if (event.total > 0 && Math.round((event.loaded / event.total) * 100) >= 100) {
        if (responseTimer === null) {
          diagnose('displayed_completion', { loaded: event.loaded, total: event.total });
        }
        startResponseTimer();
      }
    });
    xhr.upload.addEventListener('load', startResponseTimer);

    xhr.addEventListener('load', () => {
      diagnose('storage_response', { status: xhr.status });
      if (xhr.status >= 200 && xhr.status < 300) {
        finish(resolve);
      } else {
        finish(() => reject(new Error('Upload failed')));
      }
    });
    xhr.addEventListener('error', () => {
      diagnose('network_error');
      finish(() => reject(new Error('Network error')));
    });
    xhr.addEventListener('abort', () => {
      diagnose('cancelled');
      finish(() => reject(new Error('Upload cancelled')));
    });
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    diagnose('started');
    xhr.send(file);
  });
}
