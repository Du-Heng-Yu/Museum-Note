/**
 * 展览表 CRUD
 */

import type { Exhibition } from '../types';
import { getDatabase } from './database';
import { getArtifactsByExhibitionId, deleteArtifact } from './artifacts';

/**
 * 创建展览
 * created_at 由内部生成，返回含 id 的完整记录
 */
export function createExhibition(
  data: Omit<Exhibition, 'id' | 'created_at' | 'cover_photo'>,
): Exhibition {
  const db = getDatabase();
  const createdAt = new Date().toISOString();

  const result = db.runSync(
    `INSERT INTO exhibitions (name, museum, visit_date, description, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    data.name,
    data.museum,
    data.visit_date,
    data.description ?? null,
    createdAt,
  );

  return {
    id: result.lastInsertRowId,
    ...data,
    cover_photo: null,
    created_at: createdAt,
  };
}

/**
 * 查询全部展览，按 visit_date DESC 排序
 */
export function getAllExhibitions(): Exhibition[] {
  const db = getDatabase();
  return db.getAllSync<Exhibition>(
    'SELECT * FROM exhibitions ORDER BY visit_date DESC',
  );
}

/**
 * 按 ID 查询单条展览
 */
export function getExhibitionById(id: number): Exhibition | null {
  const db = getDatabase();
  return db.getFirstSync<Exhibition>(
    'SELECT * FROM exhibitions WHERE id = ?',
    id,
  );
}

/**
 * 动态更新展览字段（只更新传入的非 undefined 字段）
 */
export function updateExhibition(
  id: number,
  data: Partial<Omit<Exhibition, 'id' | 'created_at'>>,
): void {
  const db = getDatabase();
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  const fields: (keyof typeof data)[] = [
    'name', 'museum', 'visit_date', 'description', 'cover_photo',
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
    `UPDATE exhibitions SET ${setClauses.join(', ')} WHERE id = ?`,
    ...values,
  );
}

/**
 * 级联删除展览：先删除展览下所有文物（含照片清理），再删除展览
 */
export async function deleteExhibition(id: number): Promise<void> {
  const db = getDatabase();

  // 1. 查出该展览下所有文物，逐条删除（含照片清理）
  const artifacts = getArtifactsByExhibitionId(id);
  for (const artifact of artifacts) {
    await deleteArtifact(artifact.id);
  }

  // 2. 删除展览记录
  db.runSync('DELETE FROM exhibitions WHERE id = ?', id);
}

/**
 * 返回该展览下的文物数量（用于展览列表卡片显示）
 */
export function getExhibitionArtifactCount(id: number): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM artifacts WHERE exhibition_id = ?',
    id,
  );
  return row?.count ?? 0;
}
