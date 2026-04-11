/**
 * 照片工具函数
 * 复制、删除、目录管理、系统相册保存
 */

import { Paths, Directory, File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const PHOTOS_DIR = new Directory(Paths.document, 'photos');

/**
 * 确保 documentDirectory/photos/ 目录存在，不存在则创建
 */
export async function ensurePhotosDirectory(): Promise<void> {
  if (!PHOTOS_DIR.exists) {
    PHOTOS_DIR.create({ intermediates: true });
  }
}

/**
 * 将临时路径的照片逐一复制到 documentDirectory/photos/
 * 命名: artifact_{artifactId}_{index}.jpg
 * 若同名文件已存在，则自动寻找下一个可用序号，避免编辑态追加照片时冲突
 * 返回复制后的私有路径数组
 */
export async function copyPhotosToPrivateDir(
  tempPaths: string[],
  artifactId: number,
): Promise<string[]> {
  await ensurePhotosDirectory();
  const privatePaths: string[] = [];

  let nextIndex = 0;

  for (let i = 0; i < tempPaths.length; i++) {
    let destFile: File;

    while (true) {
      const fileName = `artifact_${artifactId}_${nextIndex}.jpg`;
      destFile = new File(PHOTOS_DIR, fileName);
      nextIndex += 1;
      if (!destFile.exists) {
        break;
      }
    }

    const srcFile = new File(tempPaths[i]);
    srcFile.copy(destFile);
    privatePaths.push(destFile.uri);
  }

  return privatePaths;
}

/**
 * 删除指定路径的照片文件
 * 单个文件删除失败时仅 console.warn，不阻断流程
 */
export async function deletePhotoFiles(photoPaths: string[]): Promise<void> {
  for (const path of photoPaths) {
    try {
      const file = new File(path);
      if (file.exists) {
        file.delete();
      }
    } catch (e) {
      console.warn('[Photo] 删除文件失败:', path, e);
    }
  }
}

/**
 * 将选择的照片复制为展览封面
 * 命名: exhibition_{exhibitionId}_cover.jpg
 */
export async function copyExhibitionCover(
  tempPath: string,
  exhibitionId: number,
): Promise<string> {
  await ensurePhotosDirectory();
  const fileName = `exhibition_${exhibitionId}_cover.jpg`;
  const destFile = new File(PHOTOS_DIR, fileName);
  const srcFile = new File(tempPath);
  if (destFile.exists) {
    destFile.delete();
  }
  srcFile.copy(destFile);
  return destFile.uri;
}

/**
 * 将相机拍摄照片保存到系统相册
 * 需要 expo-media-library 权限
 */
export async function saveCameraPhotoToAlbum(uri: string): Promise<void> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[Photo] 媒体库权限未授予，无法保存到系统相册');
    return;
  }
  await MediaLibrary.saveToLibraryAsync(uri);
}
