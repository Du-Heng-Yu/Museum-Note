export type ExhibitionArtifactSort = 'name_asc' | 'year_asc' | 'created_at_desc';

export type Exhibition = {
  id: number;
  name: string;
  coverPhotoUri: string | null;
  intro: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Artifact = {
  id: number;
  name: string;
  photoUri: string | null;
  exhibitionId: number;
  year: number;
  dynasty: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateExhibitionInput = {
  name: string;
  coverPhotoUri?: string | null;
  intro?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
};

export type UpdateExhibitionInput = {
  name?: string;
  coverPhotoUri?: string | null;
  intro?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
};

export type CreateArtifactInput = {
  name: string;
  photoUri?: string | null;
  exhibitionId: number;
  year: number;
  dynasty: string;
  note?: string | null;
};

export type UpdateArtifactInput = {
  name?: string;
  photoUri?: string | null;
  exhibitionId?: number;
  year?: number;
  dynasty?: string;
  note?: string | null;
};

export type DatabaseStats = {
  exhibitionCount: number;
  artifactCount: number;
};
