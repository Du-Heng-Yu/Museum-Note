import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

import type {
  Artifact,
  ContentType,
  CreateArtifactInput,
  CreateExhibitionInput,
  CreateTextPanelInput,
  Exhibition,
  ExhibitionContentItem,
  MoveDirection,
  TextPanel,
} from '../types/models';

const DATABASE_NAME = 'guanzhan-helper.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

interface ExhibitionRow {
  id: number;
  title: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  preface: string | null;
  epilogue: string | null;
  exhibition_type: string | null;
  cover_image_uri: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

interface ArtifactRow {
  id: number;
  exhibition_id: number;
  cover_image_uri: string;
  image_uris_json: string;
  title: string;
  description: string | null;
  year: number | null;
  dynasty: string | null;
  is_assistant: number;
  recorded_at: number;
  created_at: number;
  updated_at: number;
  exhibition_title?: string;
}

interface TextPanelRow {
  id: number;
  exhibition_id: number;
  title: string;
  description: string | null;
  image_uri: string | null;
  recorded_at: number;
  created_at: number;
  updated_at: number;
}

interface ExhibitionContentRow {
  orderId: number;
  orderIndex: number;
  contentType: ContentType;
  contentId: number;
  title: string;
  description: string | null;
  imageUri: string | null;
  year: number | null;
  dynasty: string | null;
  isAssistant: number | null;
}

function safeParseImageUris(rawValue: string): string[] {
  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

function mapExhibition(row: ExhibitionRow): Exhibition {
  return {
    id: row.id,
    title: row.title,
    locationName: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    preface: row.preface,
    epilogue: row.epilogue,
    exhibitionType: row.exhibition_type,
    coverImageUri: row.cover_image_uri,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    exhibitionId: row.exhibition_id,
    coverImageUri: row.cover_image_uri,
    imageUris: safeParseImageUris(row.image_uris_json),
    title: row.title,
    description: row.description,
    year: row.year,
    dynasty: row.dynasty,
    isAssistant: row.is_assistant === 1,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exhibitionTitle: row.exhibition_title,
  };
}

function mapTextPanel(row: TextPanelRow): TextPanel {
  return {
    id: row.id,
    exhibitionId: row.exhibition_id,
    title: row.title,
    description: row.description,
    imageUri: row.image_uri,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDatabaseAsync(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }
  return databasePromise;
}

async function getNextOrderIndexAsync(db: SQLiteDatabase, exhibitionId: number): Promise<number> {
  const row = await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(order_index) AS maxOrder FROM content_order WHERE exhibition_id = ?',
    exhibitionId
  );
  return (row?.maxOrder ?? -1) + 1;
}

async function normalizeOrderIndexAsync(db: SQLiteDatabase, exhibitionId: number): Promise<void> {
  const rows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM content_order WHERE exhibition_id = ? ORDER BY order_index ASC',
    exhibitionId
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    await db.runAsync('UPDATE content_order SET order_index = ? WHERE id = ?', index, row.id);
  }
}

export async function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabaseAsync();
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS exhibitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          location_name TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          preface TEXT,
          epilogue TEXT,
          exhibition_type TEXT,
          cover_image_uri TEXT,
          notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS artifacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exhibition_id INTEGER NOT NULL,
          cover_image_uri TEXT NOT NULL,
          image_uris_json TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          year INTEGER,
          dynasty TEXT,
          is_assistant INTEGER NOT NULL DEFAULT 0,
          recorded_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS text_panels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exhibition_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          image_uri TEXT,
          recorded_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS content_order (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exhibition_id INTEGER NOT NULL,
          content_type TEXT NOT NULL CHECK(content_type IN ('artifact', 'textPanel')),
          content_id INTEGER NOT NULL,
          order_index INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE,
          UNIQUE(exhibition_id, content_type, content_id),
          UNIQUE(exhibition_id, order_index)
        );

        CREATE INDEX IF NOT EXISTS idx_exhibitions_updated_at ON exhibitions(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_artifacts_exhibition_id ON artifacts(exhibition_id);
        CREATE INDEX IF NOT EXISTS idx_artifacts_year ON artifacts(year ASC);
        CREATE INDEX IF NOT EXISTS idx_text_panels_exhibition_id ON text_panels(exhibition_id);
        CREATE INDEX IF NOT EXISTS idx_content_order_exhibition_id ON content_order(exhibition_id, order_index);
      `);
    })();
  }

  await initializationPromise;
}

export async function getExhibitions(): Promise<Exhibition[]> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<ExhibitionRow>('SELECT * FROM exhibitions ORDER BY updated_at DESC');
  return rows.map(mapExhibition);
}

export async function getExhibitionById(exhibitionId: number): Promise<Exhibition | null> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<ExhibitionRow>('SELECT * FROM exhibitions WHERE id = ?', exhibitionId);
  return row ? mapExhibition(row) : null;
}

export async function createExhibition(input: CreateExhibitionInput): Promise<number> {
  const db = await getDatabaseAsync();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO exhibitions (
      title,
      location_name,
      latitude,
      longitude,
      preface,
      epilogue,
      exhibition_type,
      cover_image_uri,
      notes,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title.trim(),
    input.locationName.trim(),
    input.latitude ?? null,
    input.longitude ?? null,
    input.preface?.trim() || null,
    input.epilogue?.trim() || null,
    input.exhibitionType?.trim() || null,
    input.coverImageUri || null,
    input.notes?.trim() || null,
    now,
    now
  );
  return result.lastInsertRowId;
}

export async function deleteExhibition(exhibitionId: number): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync('DELETE FROM exhibitions WHERE id = ?', exhibitionId);
}

export async function createArtifact(input: CreateArtifactInput): Promise<number> {
  const db = await getDatabaseAsync();
  let artifactId = 0;

  await db.withTransactionAsync(async () => {
    const now = Date.now();
    const orderIndex = await getNextOrderIndexAsync(db, input.exhibitionId);
    const artifactResult = await db.runAsync(
      `INSERT INTO artifacts (
        exhibition_id,
        cover_image_uri,
        image_uris_json,
        title,
        description,
        year,
        dynasty,
        is_assistant,
        recorded_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.exhibitionId,
      input.coverImageUri,
      JSON.stringify(input.imageUris),
      input.title.trim(),
      input.description?.trim() || null,
      input.year ?? null,
      input.dynasty?.trim() || null,
      input.isAssistant ? 1 : 0,
      now,
      now,
      now
    );

    artifactId = artifactResult.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO content_order (
        exhibition_id,
        content_type,
        content_id,
        order_index,
        created_at
      ) VALUES (?, 'artifact', ?, ?, ?)`,
      input.exhibitionId,
      artifactId,
      orderIndex,
      now
    );

    await db.runAsync('UPDATE exhibitions SET updated_at = ? WHERE id = ?', now, input.exhibitionId);
  });

  return artifactId;
}

export async function createTextPanel(input: CreateTextPanelInput): Promise<number> {
  const db = await getDatabaseAsync();
  let panelId = 0;

  await db.withTransactionAsync(async () => {
    const now = Date.now();
    const orderIndex = await getNextOrderIndexAsync(db, input.exhibitionId);
    const panelResult = await db.runAsync(
      `INSERT INTO text_panels (
        exhibition_id,
        title,
        description,
        image_uri,
        recorded_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.exhibitionId,
      input.title.trim(),
      input.description?.trim() || null,
      input.imageUri || null,
      now,
      now,
      now
    );

    panelId = panelResult.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO content_order (
        exhibition_id,
        content_type,
        content_id,
        order_index,
        created_at
      ) VALUES (?, 'textPanel', ?, ?, ?)`,
      input.exhibitionId,
      panelId,
      orderIndex,
      now
    );

    await db.runAsync('UPDATE exhibitions SET updated_at = ? WHERE id = ?', now, input.exhibitionId);
  });

  return panelId;
}

export async function getExhibitionContents(exhibitionId: number): Promise<ExhibitionContentItem[]> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<ExhibitionContentRow>(
    `SELECT
      co.id AS orderId,
      co.order_index AS orderIndex,
      'artifact' AS contentType,
      a.id AS contentId,
      a.title AS title,
      a.description AS description,
      a.cover_image_uri AS imageUri,
      a.year AS year,
      a.dynasty AS dynasty,
      a.is_assistant AS isAssistant
    FROM content_order co
    INNER JOIN artifacts a
      ON co.content_type = 'artifact'
      AND co.content_id = a.id
    WHERE co.exhibition_id = ?

    UNION ALL

    SELECT
      co.id AS orderId,
      co.order_index AS orderIndex,
      'textPanel' AS contentType,
      tp.id AS contentId,
      tp.title AS title,
      tp.description AS description,
      tp.image_uri AS imageUri,
      NULL AS year,
      NULL AS dynasty,
      NULL AS isAssistant
    FROM content_order co
    INNER JOIN text_panels tp
      ON co.content_type = 'textPanel'
      AND co.content_id = tp.id
    WHERE co.exhibition_id = ?

    ORDER BY orderIndex ASC`,
    exhibitionId,
    exhibitionId
  );

  return rows.map((row) => ({
    orderId: row.orderId,
    orderIndex: row.orderIndex,
    contentType: row.contentType,
    contentId: row.contentId,
    title: row.title,
    description: row.description,
    imageUri: row.imageUri,
    year: row.year,
    dynasty: row.dynasty,
    isAssistant: row.isAssistant === null ? null : row.isAssistant === 1,
  }));
}

export async function moveContent(
  exhibitionId: number,
  contentType: ContentType,
  contentId: number,
  direction: MoveDirection
): Promise<boolean> {
  const db = await getDatabaseAsync();
  let moved = false;

  await db.withTransactionAsync(async () => {
    const current = await db.getFirstAsync<{ id: number; order_index: number }>(
      'SELECT id, order_index FROM content_order WHERE exhibition_id = ? AND content_type = ? AND content_id = ?',
      exhibitionId,
      contentType,
      contentId
    );

    if (!current) {
      return;
    }

    const target =
      direction === 'up'
        ? await db.getFirstAsync<{ id: number; order_index: number }>(
            'SELECT id, order_index FROM content_order WHERE exhibition_id = ? AND order_index < ? ORDER BY order_index DESC LIMIT 1',
            exhibitionId,
            current.order_index
          )
        : await db.getFirstAsync<{ id: number; order_index: number }>(
            'SELECT id, order_index FROM content_order WHERE exhibition_id = ? AND order_index > ? ORDER BY order_index ASC LIMIT 1',
            exhibitionId,
            current.order_index
          );

    if (!target) {
      return;
    }

    const tempOrder = -999999;
    await db.runAsync('UPDATE content_order SET order_index = ? WHERE id = ?', tempOrder, current.id);
    await db.runAsync('UPDATE content_order SET order_index = ? WHERE id = ?', current.order_index, target.id);
    await db.runAsync('UPDATE content_order SET order_index = ? WHERE id = ?', target.order_index, current.id);

    moved = true;
  });

  return moved;
}

export async function deleteArtifact(artifactId: number): Promise<void> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ exhibition_id: number }>('SELECT exhibition_id FROM artifacts WHERE id = ?', artifactId);
  if (!row) {
    return;
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM content_order WHERE content_type = 'artifact' AND content_id = ?", artifactId);
    await db.runAsync('DELETE FROM artifacts WHERE id = ?', artifactId);
    await normalizeOrderIndexAsync(db, row.exhibition_id);
    await db.runAsync('UPDATE exhibitions SET updated_at = ? WHERE id = ?', Date.now(), row.exhibition_id);
  });
}

export async function deleteTextPanel(panelId: number): Promise<void> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ exhibition_id: number }>('SELECT exhibition_id FROM text_panels WHERE id = ?', panelId);
  if (!row) {
    return;
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM content_order WHERE content_type = 'textPanel' AND content_id = ?", panelId);
    await db.runAsync('DELETE FROM text_panels WHERE id = ?', panelId);
    await normalizeOrderIndexAsync(db, row.exhibition_id);
    await db.runAsync('UPDATE exhibitions SET updated_at = ? WHERE id = ?', Date.now(), row.exhibition_id);
  });
}

export async function getMuseumArtifacts(): Promise<Artifact[]> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<ArtifactRow>(
    `SELECT
      a.*,
      e.title AS exhibition_title
    FROM artifacts a
    INNER JOIN exhibitions e ON e.id = a.exhibition_id
    WHERE a.is_assistant = 0
    ORDER BY
      CASE WHEN a.year IS NULL THEN 1 ELSE 0 END ASC,
      a.year ASC,
      a.recorded_at ASC`
  );

  return rows.map(mapArtifact);
}

export async function getArtifactById(artifactId: number): Promise<Artifact | null> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<ArtifactRow>(
    `SELECT
      a.*,
      e.title AS exhibition_title
    FROM artifacts a
    INNER JOIN exhibitions e ON e.id = a.exhibition_id
    WHERE a.id = ?`,
    artifactId
  );

  return row ? mapArtifact(row) : null;
}

export async function getTextPanelById(panelId: number): Promise<TextPanel | null> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<TextPanelRow>('SELECT * FROM text_panels WHERE id = ?', panelId);
  return row ? mapTextPanel(row) : null;
}
