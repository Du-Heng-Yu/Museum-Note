let _pendingUri: string | null = null;

export function setPendingPhoto(uri: string) {
  _pendingUri = uri;
}

export function consumePendingPhoto(): string | null {
  const u = _pendingUri;
  _pendingUri = null;
  return u;
}
