export type ContentType = 'artifact' | 'textPanel';

export interface Exhibition {
  id: number;
  title: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  preface: string | null;
  epilogue: string | null;
  exhibitionType: string | null;
  coverImageUri: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateExhibitionInput {
  title: string;
  locationName: string;
  latitude?: number | null;
  longitude?: number | null;
  preface?: string | null;
  epilogue?: string | null;
  exhibitionType?: string | null;
  coverImageUri?: string | null;
  notes?: string | null;
}

export interface Artifact {
  id: number;
  exhibitionId: number;
  coverImageUri: string;
  imageUris: string[];
  title: string;
  description: string | null;
  year: number | null;
  dynasty: string | null;
  isAssistant: boolean;
  recordedAt: number;
  createdAt: number;
  updatedAt: number;
  exhibitionTitle?: string;
}

export interface CreateArtifactInput {
  exhibitionId: number;
  coverImageUri: string;
  imageUris: string[];
  title: string;
  description?: string | null;
  year?: number | null;
  dynasty?: string | null;
  isAssistant: boolean;
}

export interface TextPanel {
  id: number;
  exhibitionId: number;
  title: string;
  description: string | null;
  imageUri: string | null;
  recordedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTextPanelInput {
  exhibitionId: number;
  title: string;
  description?: string | null;
  imageUri?: string | null;
}

export interface ExhibitionContentItem {
  orderId: number;
  orderIndex: number;
  contentType: ContentType;
  contentId: number;
  title: string;
  description: string | null;
  imageUri: string | null;
  year: number | null;
  dynasty: string | null;
  isAssistant: boolean | null;
}

export type MoveDirection = 'up' | 'down';
