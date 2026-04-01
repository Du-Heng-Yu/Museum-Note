export type MainTabParamList = {
  historyPage: undefined;
  exhibitionPage: undefined;
};

export type AddArtifactPageParams = {
  initialPhotoUris?: string[];
  focusNameInput?: boolean;
};

export type RootStackParamList = {
  MainTabs: undefined;
  addArtifactPage: AddArtifactPageParams | undefined;
};
