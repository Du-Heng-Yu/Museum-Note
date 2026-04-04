/**
 * 文物表 CRUD
 */

import type { Artifact } from '../types';
import { getDatabase } from './database';
import { parseJsonArray } from '../utils/json';
import { deletePhotoFiles } from '../utils/photo';

/**
 * 创建文物
 * photos 和 tags 应在调用前已经是 JSON 字符串（或 null）
 * created_at 由内部生成
 */
export function createArtifact(
  data: Omit<Artifact, 'id' | 'created_at'>,
): Artifact {
  const db = getDatabase();
  const createdAt = new Date().toISOString();

  const result = db.runSync(
    `INSERT INTO artifacts (name, year, dynasty, exhibition_id, photos, description, note, tags, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.name,
    data.year,
    data.dynasty,
    data.exhibition_id,
    data.photos ?? null,
    data.description ?? null,
    data.note ?? null,
    data.tags ?? null,
    createdAt,
  );

  return {
    id: result.lastInsertRowId,
    ...data,
    created_at: createdAt,
  };
}

/**
 * 查询全部文物，按 year ASC 排序（用于时间轴渲染）
 */
export function getAllArtifacts(): Artifact[] {
  const db = getDatabase();
  return db.getAllSync<Artifact>('SELECT * FROM artifacts ORDER BY year ASC');
}

/**
 * 按 ID 查询单条文物
 */
export function getArtifactById(id: number): Artifact | null {
  const db = getDatabase();
  return db.getFirstSync<Artifact>('SELECT * FROM artifacts WHERE id = ?', id);
}

/**
 * 按展览 ID 查询该展览下所有文物，按 year ASC 排序
 */
export function getArtifactsByExhibitionId(
  exhibitionId: number,
): Artifact[] {
  const db = getDatabase();
  return db.getAllSync<Artifact>(
    'SELECT * FROM artifacts WHERE exhibition_id = ? ORDER BY year ASC',
    exhibitionId,
  );
}

/**
 * 动态更新文物字段（只更新传入的非 undefined 字段）
 */
export function updateArtifact(
  id: number,
  data: Partial<Omit<Artifact, 'id' | 'created_at'>>,
): void {
  const db = getDatabase();
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  const fields: (keyof typeof data)[] = [
    'name', 'year', 'dynasty', 'exhibition_id',
    'photos', 'description', 'note', 'tags',
  ];

  for (const key of fields) {
    if (data[key] !== undefined) {
      setClauses.push(`${key} = ?`);
      values.push(data[key] as string | number | null);
    }
  }

  if (setClauses.length === 0) return;

  values.push(id);
  db.runSync(
    `UPDATE artifacts SET ${setClauses.join(', ')} WHERE id = ?`,
    ...values,
  );
}

/**
 * 删除文物记录，并同步删除 documentDirectory/photos/ 中该文物的所有照片文件
 */
export async function deleteArtifact(id: number): Promise<void> {
  const db = getDatabase();

  // 1. 读取照片路径
  const artifact = db.getFirstSync<Artifact>(
    'SELECT photos FROM artifacts WHERE id = ?',
    id,
  );

  if (artifact?.photos) {
    const photoPaths = parseJsonArray(artifact.photos);
    await deletePhotoFiles(photoPaths);
  }

  // 2. 删除数据库记录
  db.runSync('DELETE FROM artifacts WHERE id = ?', id);
}
