import * as FileSystem from 'expo-file-system/legacy';

const IMAGE_DIRECTORY = `${FileSystem.documentDirectory}images`;

async function ensureImageDirectoryAsync(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
  }
}

function getFileExtension(uri: string): string {
  const cleanUri = uri.split('?')[0];
  const parts = cleanUri.split('.');
  if (parts.length < 2) {
    return 'jpg';
  }
  return parts[parts.length - 1];
}

export async function persistImageAsync(sourceUri: string): Promise<string> {
  await ensureImageDirectoryAsync();
  const extension = getFileExtension(sourceUri);
  const fileName = `image-${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;
  const targetUri = `${IMAGE_DIRECTORY}/${fileName}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: targetUri,
  });

  return targetUri;
}

export async function persistImagesAsync(sourceUris: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const sourceUri of sourceUris) {
    const persisted = await persistImageAsync(sourceUri);
    results.push(persisted);
  }
  return results;
}
