export type RootStackParamList = {
  MainTabs: undefined;
  CreateExhibition: undefined;
  ExhibitionDetail: { exhibitionId: number };
  CreateArtifact: { exhibitionId: number };
  CreateTextPanel: { exhibitionId: number };
  ArtifactDetail: { artifactId: number };
};

export type MainTabParamList = {
  ExhibitionHome: undefined;
  ArtifactHome: undefined;
};
