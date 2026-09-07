export const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;
export const AUDIO_SIGNATURE_BYTES = 64 * 1024;

const AUDIO_FILE_TYPES = Object.freeze({
  mp3: {
    uploadContentType: 'audio/mpeg',
    acceptedContentTypes: new Set(['audio/mpeg', 'audio/mp3']),
  },
  wav: {
    uploadContentType: 'audio/wav',
    acceptedContentTypes: new Set(['audio/wav', 'audio/x-wav', 'audio/vnd.wave']),
  },
  m4a: {
    uploadContentType: 'audio/mp4',
    acceptedContentTypes: new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a']),
  },
  aac: {
    uploadContentType: 'audio/aac',
    acceptedContentTypes: new Set(['audio/aac', 'audio/aacp', 'audio/x-aac']),
  },
  flac: {
    uploadContentType: 'audio/flac',
    acceptedContentTypes: new Set(['audio/flac', 'audio/x-flac']),
  },
  ogg: {
    uploadContentType: 'audio/ogg',
    acceptedContentTypes: new Set(['audio/ogg', 'application/ogg']),
  },
  aif: {
    uploadContentType: 'audio/aiff',
    acceptedContentTypes: new Set(['audio/aiff', 'audio/x-aiff']),
  },
  aiff: {
    uploadContentType: 'audio/aiff',
    acceptedContentTypes: new Set(['audio/aiff', 'audio/x-aiff']),
  },
});

const MAX_FILE_NAME_LENGTH = 160;
const M4A_BRANDS = new Set(['M4A ', 'M4B ', 'mp41', 'mp42', 'isom', 'iso2', 'qt  ']);
const OGG_AUDIO_MARKERS = ['vorbis', 'OpusHead', 'Speex   ', 'fLaC', 'FLAC'];

function normalizeContentType(value) {
  if (typeof value !== 'string') return '';
  return value.split(';', 1)[0].trim().toLowerCase();
}

function ascii(bytes, offset, length) {
  if (offset < 0 || length < 0 || offset + length > bytes.length) return '';
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function containsAscii(bytes, value) {
  const needle = new TextEncoder().encode(value);
  if (needle.length === 0 || needle.length > bytes.length) return false;

  for (let offset = 0; offset <= bytes.length - needle.length; offset += 1) {
    let matches = true;
    for (let index = 0; index < needle.length; index += 1) {
      if (bytes[offset + index] !== needle[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
}

function hasMpegAudioFrame(bytes) {
  const searchLength = Math.min(bytes.length - 3, 4096);

  for (let offset = 0; offset < searchLength; offset += 1) {
    const first = bytes[offset];
    const second = bytes[offset + 1];
    const third = bytes[offset + 2];
    if (first !== 0xff || (second & 0xe0) !== 0xe0) continue;

    const version = (second >> 3) & 0x03;
    const layer = (second >> 1) & 0x03;
    const bitrate = (third >> 4) & 0x0f;
    const sampleRate = (third >> 2) & 0x03;
    if (version !== 0x01 && layer !== 0x00 && bitrate !== 0x00 && bitrate !== 0x0f && sampleRate !== 0x03) {
      return true;
    }
  }

  return false;
}

function hasAacAdtsFrame(bytes) {
  const searchLength = Math.min(bytes.length - 1, 4096);

  for (let offset = 0; offset < searchLength; offset += 1) {
    if (bytes[offset] === 0xff && (bytes[offset + 1] & 0xf6) === 0xf0) return true;
  }

  return false;
}

export function normalizeAudioFileName(value) {
  if (typeof value !== 'string') return null;

  const baseName = value.replace(/\\/g, '/').split('/').pop()?.trim() ?? '';
  const extension = baseName.split('.').pop()?.toLowerCase() ?? '';
  if (!baseName || !Object.hasOwn(AUDIO_FILE_TYPES, extension)) return null;

  const displayName = baseName
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, MAX_FILE_NAME_LENGTH)
    .trim();

  return displayName ? { displayName, extension } : null;
}

export function getAudioUploadContentType(extension, declaredContentType) {
  const spec = AUDIO_FILE_TYPES[typeof extension === 'string' ? extension.toLowerCase() : ''];
  if (!spec) return null;

  const normalized = normalizeContentType(declaredContentType);
  if (normalized && !spec.acceptedContentTypes.has(normalized)) return null;
  return spec.uploadContentType;
}

export function validateAudioUploadMetadata({ fileName, fileSize, contentType }) {
  const normalizedFile = normalizeAudioFileName(fileName);
  if (!normalizedFile) return { ok: false, reason: 'unsupported_extension' };

  if (typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize <= 0) {
    return { ok: false, reason: 'invalid_size' };
  }

  if (fileSize > MAX_AUDIO_SIZE_BYTES) return { ok: false, reason: 'too_large' };

  const uploadContentType = getAudioUploadContentType(normalizedFile.extension, contentType);
  if (!uploadContentType) return { ok: false, reason: 'mime_mismatch' };

  return { ok: true, normalizedFile, uploadContentType };
}

export function matchesAudioFileSignature(extension, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 4) return false;

  switch (extension?.toLowerCase()) {
    case 'mp3':
      return ascii(bytes, 0, 3) === 'ID3' || hasMpegAudioFrame(bytes);
    case 'wav':
      return bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE';
    case 'm4a': {
      if (bytes.length < 12 || ascii(bytes, 4, 4) !== 'ftyp') return false;
      for (let offset = 8; offset + 4 <= Math.min(bytes.length, 32); offset += 4) {
        if (M4A_BRANDS.has(ascii(bytes, offset, 4))) return true;
      }
      return false;
    }
    case 'aac':
      return ascii(bytes, 0, 4) === 'ADIF' || hasAacAdtsFrame(bytes);
    case 'flac':
      return ascii(bytes, 0, 4) === 'fLaC';
    case 'ogg':
      return ascii(bytes, 0, 4) === 'OggS'
        && bytes[4] === 0
        && OGG_AUDIO_MARKERS.some(marker => containsAscii(bytes, marker));
    case 'aif':
    case 'aiff':
      return bytes.length >= 12
        && ascii(bytes, 0, 4) === 'FORM'
        && (ascii(bytes, 8, 4) === 'AIFF' || ascii(bytes, 8, 4) === 'AIFC');
    default:
      return false;
  }
}
