/**
 * 数据库模型类型定义
 */

/** 展览表记录 */
export interface Exhibition {
  id: number;
  name: string;
  museum: string;
  visit_date: string;
  description: string | null;
  created_at: string;
}

/** 文物表记录 */
export interface Artifact {
  id: number;
  name: string;
  year: number;
  dynasty: string;
  exhibition_id: number;
  photos: string | null;
  description: string | null;
  note: string | null;
  tags: string | null;
  created_at: string;
}

/** 朝代常量类型 */
export interface Dynasty {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  order: number;
}

/** 导航参数类型 */
export type RootStackParamList = {
  MainTabs: undefined;
  ArtifactDetail: { artifactId: number };
  ArtifactEdit: { artifactId?: number; photos?: string[] };
  ExhibitionDetail: { exhibitionId: number };
  ExhibitionEdit: { exhibitionId?: number; fromArtifactEdit?: boolean };
};

export type BottomTabParamList = {
  Timeline: undefined;
  Exhibitions: undefined;
};
