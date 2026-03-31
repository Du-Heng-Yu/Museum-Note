import * as SQLite from 'expo-sqlite';

import type {
  Artifact,
  CreateArtifactInput,
  CreateExhibitionInput,
  DatabaseStats,
  Exhibition,
  ExhibitionArtifactSort,
  UpdateArtifactInput,
  UpdateExhibitionInput,
} from './types';

const DATABASE_NAME = 'museum_notes.db';
const SCHEMA_VERSION = 1;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

type UserVersionRow = {
  user_version: number;
};

type CountRow = {
  count: number;
};

type ExhibitionRow = {
  id: number;
  name: string;
  cover_photo_uri: string | null;
  intro: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: string;
  updated_at: string;
};

type ArtifactRow = {
  id: number;
  name: string;
  photo_uri: string | null;
  exhibition_id: number;
  year: number;
  dynasty: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const EXHIBITION_SORT_ORDER_SQL: Record<ExhibitionArtifactSort, string> = {
  name_asc: 'name COLLATE NOCASE ASC',
  year_asc: 'year ASC',
  created_at_desc: 'created_at DESC',
};

function mapExhibitionRow(row: ExhibitionRow): Exhibition {
  return {
    id: row.id,
    name: row.name,
    coverPhotoUri: row.cover_photo_uri,
    intro: row.intro,
    gpsLatitude: row.gps_latitude,
    gpsLongitude: row.gps_longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapArtifactRow(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    name: row.name,
    photoUri: row.photo_uri,
    exhibitionId: row.exhibition_id,
    year: row.year,
    dynasty: row.dynasty,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  return trimmed;
}

function requireInt(value: number, fieldName: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
  return value;
}

function nullableText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableNumber(value: number | null | undefined): number | null {
  return value === undefined ? null : value;
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return databasePromise;
}

async function getUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function migrateToV1(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exhibitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cover_photo_uri TEXT,
      intro TEXT,
      gps_latitude REAL,
      gps_longitude REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_uri TEXT,
      exhibition_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      dynasty TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS exhibition_sort_preferences (
      exhibition_id INTEGER PRIMARY KEY,
      sort_key TEXT NOT NULL CHECK(sort_key IN ('name_asc', 'year_asc', 'created_at_desc')),
      updated_at TEXT NOT NULL,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_artifacts_exhibition_id ON artifacts(exhibition_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_dynasty_created_at ON artifacts(dynasty, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_artifacts_year_created_at ON artifacts(year, created_at DESC);

    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
}

export async function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabase();
      await db.execAsync('PRAGMA foreign_keys = ON;');

      const currentVersion = await getUserVersion(db);
      if (currentVersion < 1) {
        await migrateToV1(db);
      }
    })();
  }

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export async function resetDatabaseForDevelopment(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS exhibition_sort_preferences;
    DROP TABLE IF EXISTS artifacts;
    DROP TABLE IF EXISTS exhibitions;
    PRAGMA user_version = 0;
  `);

  initializationPromise = null;
  await initializeDatabase();
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  await initializeDatabase();
  const db = await getDatabase();

  const exhibitionCountRow = await db.getFirstAsync<CountRow>(
    'SELECT COUNT(*) as count FROM exhibitions'
  );
  const artifactCountRow = await db.getFirstAsync<CountRow>(
    'SELECT COUNT(*) as count FROM artifacts'
  );

  return {
    exhibitionCount: exhibitionCountRow?.count ?? 0,
    artifactCount: artifactCountRow?.count ?? 0,
  };
}

export async function createExhibition(input: CreateExhibitionInput): Promise<Exhibition> {
  await initializeDatabase();
  const db = await getDatabase();

  const name = requireText(input.name, 'Exhibition name');
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO exhibitions (
      name,
      cover_photo_uri,
      intro,
      gps_latitude,
      gps_longitude,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    name,
    nullableText(input.coverPhotoUri),
    nullableText(input.intro),
    nullableNumber(input.gpsLatitude),
    nullableNumber(input.gpsLongitude),
    now,
    now
  );

  const created = await getExhibitionById(Number(result.lastInsertRowId));
  if (!created) {
    throw new Error('Failed to create exhibition.');
  }

  return created;
}

export async function getExhibitionById(id: number): Promise<Exhibition | null> {
  await initializeDatabase();
  const db = await getDatabase();

  const row = await db.getFirstAsync<ExhibitionRow>(
    `SELECT
      id,
      name,
      cover_photo_uri,
      intro,
      gps_latitude,
      gps_longitude,
      created_at,
      updated_at
    FROM exhibitions
    WHERE id = ?`,
    id
  );

  return row ? mapExhibitionRow(row) : null;
}

export async function listExhibitions(): Promise<Exhibition[]> {
  await initializeDatabase();
  const db = await getDatabase();

  const rows = await db.getAllAsync<ExhibitionRow>(
    `SELECT
      id,
      name,
      cover_photo_uri,
      intro,
      gps_latitude,
      gps_longitude,
      created_at,
      updated_at
    FROM exhibitions
    ORDER BY created_at DESC`
  );

  return rows.map(mapExhibitionRow);
}

export async function updateExhibition(
  id: number,
  input: UpdateExhibitionInput
): Promise<Exhibition> {
  const existing = await getExhibitionById(id);
  if (!existing) {
    throw new Error('Exhibition not found.');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  const name =
    input.name !== undefined ? requireText(input.name, 'Exhibition name') : existing.name;

  await db.runAsync(
    `UPDATE exhibitions SET
      name = ?,
      cover_photo_uri = ?,
      intro = ?,
      gps_latitude = ?,
      gps_longitude = ?,
      updated_at = ?
    WHERE id = ?`,
    name,
    input.coverPhotoUri !== undefined
      ? nullableText(input.coverPhotoUri)
      : existing.coverPhotoUri,
    input.intro !== undefined ? nullableText(input.intro) : existing.intro,
    input.gpsLatitude !== undefined ? nullableNumber(input.gpsLatitude) : existing.gpsLatitude,
    input.gpsLongitude !== undefined ? nullableNumber(input.gpsLongitude) : existing.gpsLongitude,
    now,
    id
  );

  const updated = await getExhibitionById(id);
  if (!updated) {
    throw new Error('Failed to update exhibition.');
  }

  return updated;
}

export async function deleteExhibition(id: number): Promise<void> {
  await initializeDatabase();
  const db = await getDatabase();

  const artifactCount = await db.getFirstAsync<CountRow>(
    'SELECT COUNT(*) as count FROM artifacts WHERE exhibition_id = ?',
    id
  );

  if ((artifactCount?.count ?? 0) > 0) {
    throw new Error('Cannot delete exhibition with artifacts.');
  }

  await db.runAsync('DELETE FROM exhibitions WHERE id = ?', id);
}

export async function createArtifact(input: CreateArtifactInput): Promise<Artifact> {
  await initializeDatabase();
  const db = await getDatabase();

  const name = requireText(input.name, 'Artifact name');
  const dynasty = requireText(input.dynasty, 'Dynasty');
  const year = requireInt(input.year, 'Year');
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO artifacts (
      name,
      photo_uri,
      exhibition_id,
      year,
      dynasty,
      note,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    name,
    nullableText(input.photoUri),
    input.exhibitionId,
    year,
    dynasty,
    nullableText(input.note),
    now,
    now
  );

  const created = await getArtifactById(Number(result.lastInsertRowId));
  if (!created) {
    throw new Error('Failed to create artifact.');
  }

  return created;
}

export async function getArtifactById(id: number): Promise<Artifact | null> {
  await initializeDatabase();
  const db = await getDatabase();

  const row = await db.getFirstAsync<ArtifactRow>(
    `SELECT
      id,
      name,
      photo_uri,
      exhibition_id,
      year,
      dynasty,
      note,
      created_at,
      updated_at
    FROM artifacts
    WHERE id = ?`,
    id
  );

  return row ? mapArtifactRow(row) : null;
}

export async function listArtifactsByDynasty(dynasty: string): Promise<Artifact[]> {
  await initializeDatabase();
  const db = await getDatabase();
  const normalizedDynasty = requireText(dynasty, 'Dynasty');

  const rows = await db.getAllAsync<ArtifactRow>(
    `SELECT
      id,
      name,
      photo_uri,
      exhibition_id,
      year,
      dynasty,
      note,
      created_at,
      updated_at
    FROM artifacts
    WHERE dynasty = ?
    ORDER BY created_at DESC`,
    normalizedDynasty
  );

  return rows.map(mapArtifactRow);
}

export async function listArtifactsByExhibition(
  exhibitionId: number,
  sort: ExhibitionArtifactSort = 'created_at_desc'
): Promise<Artifact[]> {
  await initializeDatabase();
  const db = await getDatabase();

  const orderByClause = EXHIBITION_SORT_ORDER_SQL[sort];
  const rows = await db.getAllAsync<ArtifactRow>(
    `SELECT
      id,
      name,
      photo_uri,
      exhibition_id,
      year,
      dynasty,
      note,
      created_at,
      updated_at
    FROM artifacts
    WHERE exhibition_id = ?
    ORDER BY ${orderByClause}`,
    exhibitionId
  );

  return rows.map(mapArtifactRow);
}

export async function updateArtifact(id: number, input: UpdateArtifactInput): Promise<Artifact> {
  const existing = await getArtifactById(id);
  if (!existing) {
    throw new Error('Artifact not found.');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  const name = input.name !== undefined ? requireText(input.name, 'Artifact name') : existing.name;
  const dynasty =
    input.dynasty !== undefined ? requireText(input.dynasty, 'Dynasty') : existing.dynasty;
  const year = input.year !== undefined ? requireInt(input.year, 'Year') : existing.year;

  await db.runAsync(
    `UPDATE artifacts SET
      name = ?,
      photo_uri = ?,
      exhibition_id = ?,
      year = ?,
      dynasty = ?,
      note = ?,
      updated_at = ?
    WHERE id = ?`,
    name,
    input.photoUri !== undefined ? nullableText(input.photoUri) : existing.photoUri,
    input.exhibitionId ?? existing.exhibitionId,
    year,
    dynasty,
    input.note !== undefined ? nullableText(input.note) : existing.note,
    now,
    id
  );

  const updated = await getArtifactById(id);
  if (!updated) {
    throw new Error('Failed to update artifact.');
  }

  return updated;
}

export async function deleteArtifact(id: number): Promise<void> {
  await initializeDatabase();
  const db = await getDatabase();
  await db.runAsync('DELETE FROM artifacts WHERE id = ?', id);
}

export async function setExhibitionSortPreference(
  exhibitionId: number,
  sort: ExhibitionArtifactSort
): Promise<void> {
  await initializeDatabase();
  const db = await getDatabase();

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO exhibition_sort_preferences (exhibition_id, sort_key, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(exhibition_id) DO UPDATE SET
       sort_key = excluded.sort_key,
       updated_at = excluded.updated_at`,
    exhibitionId,
    sort,
    now
  );
}

export async function getExhibitionSortPreference(
  exhibitionId: number
): Promise<ExhibitionArtifactSort> {
  await initializeDatabase();
  const db = await getDatabase();

  const row = await db.getFirstAsync<{ sort_key: ExhibitionArtifactSort }>(
    'SELECT sort_key FROM exhibition_sort_preferences WHERE exhibition_id = ?',
    exhibitionId
  );

  return row?.sort_key ?? 'created_at_desc';
}

export async function closeDatabase(): Promise<void> {
  if (!databasePromise) {
    return;
  }

  const db = await databasePromise;
  await db.closeAsync();
  databasePromise = null;
  initializationPromise = null;
}
