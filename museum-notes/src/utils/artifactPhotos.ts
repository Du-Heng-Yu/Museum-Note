function normalizePhotoUriList(photoUris: string[]): string[] {
  return photoUris
    .map((uri) => uri.trim())
    .filter((uri) => uri.length > 0);
}

export function parseArtifactPhotoUris(photoField: string | null | undefined): string[] {
  if (!photoField) {
    return [];
  }

  const trimmed = photoField.trim();
  if (!trimmed) {
    return [];
  }

  if (!trimmed.startsWith('[')) {
    return [trimmed];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [trimmed];
  }
}

export function getPrimaryArtifactPhotoUri(photoField: string | null | undefined): string | null {
  return parseArtifactPhotoUris(photoField)[0] ?? null;
}

export function serializeArtifactPhotoUris(photoUris: string[]): string | null {
  const normalized = normalizePhotoUriList(photoUris);
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length === 1) {
    return normalized[0];
  }

  return JSON.stringify(normalized);
}
