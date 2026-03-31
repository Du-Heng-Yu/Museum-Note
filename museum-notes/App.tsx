import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  type Artifact,
  type Exhibition,
  createArtifact,
  createExhibition,
  getLastUsedExhibitionId,
  initializeDatabase,
  listArtifacts,
  listExhibitions,
} from './src/db';
import {
  DYNASTY_SEGMENTS,
  findDynastyByYear,
  formatYearLabel,
  getDynastyByLabel,
} from './src/constants/dynasties';

type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

type AppMode = 'history' | 'exhibition';

type EntryType = 'library' | 'camera' | 'text';

type ArtifactDraft = {
  name: string;
  note: string;
  yearText: string;
  dynasty: string;
  selectedExhibitionId: number | null;
  newExhibitionName: string;
  photoUri: string | null;
};

const EMPTY_DRAFT: ArtifactDraft = {
  name: '',
  note: '',
  yearText: '',
  dynasty: '',
  selectedExhibitionId: null,
  newExhibitionName: '',
  photoUri: null,
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误';
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({ status: 'loading' });
  const [bootstrapNonce, setBootstrapNonce] = useState(0);
  const [mode, setMode] = useState<AppMode>('history');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ArtifactDraft>(EMPTY_DRAFT);

  const pullCollections = useCallback(async () => {
    const [nextExhibitions, nextArtifacts] = await Promise.all([listExhibitions(), listArtifacts()]);
    setExhibitions(nextExhibitions);
    setArtifacts(nextArtifacts);
  }, []);

  const refreshCollections = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await pullCollections();
    } catch (error) {
      Alert.alert('刷新失败', toErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  }, [pullCollections]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await initializeDatabase();
        await pullCollections();

        if (active) {
          setBootstrapState({ status: 'ready' });
        }
      } catch (error) {
        if (active) {
          setBootstrapState({ status: 'error', message: toErrorMessage(error) });
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [pullCollections, bootstrapNonce]);

  const openComposer = useCallback(
    async (photoUri: string | null) => {
      const lastUsedExhibitionId = await getLastUsedExhibitionId();
      const fallbackExhibitionId = exhibitions.length > 0 ? exhibitions[0].id : null;

      setDraft({
        ...EMPTY_DRAFT,
        photoUri,
        selectedExhibitionId: lastUsedExhibitionId ?? fallbackExhibitionId,
      });
      setComposerVisible(true);
    },
    [exhibitions]
  );

  const handleOpenTextComposer = useCallback(async () => {
    try {
      setMenuVisible(false);
      await openComposer(null);
    } catch (error) {
      Alert.alert('打开失败', toErrorMessage(error));
    }
  }, [openComposer]);

  const pickImageAndOpenComposer = useCallback(
    async (entryType: Exclude<EntryType, 'text'>) => {
      try {
        setMenuVisible(false);

        const permission =
          entryType === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert('权限不足', entryType === 'camera' ? '请允许相机权限。' : '请允许相册权限。');
          return;
        }

        const result =
          entryType === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.85,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.85,
              });

        if (result.canceled) {
          return;
        }

        const asset = result.assets[0];
        await openComposer(asset?.uri ?? null);
      } catch (error) {
        Alert.alert('操作失败', toErrorMessage(error));
      }
    },
    [openComposer]
  );

  const onSelectEntry = useCallback(
    async (entryType: EntryType) => {
      if (entryType === 'text') {
        await handleOpenTextComposer();
        return;
      }

      await pickImageAndOpenComposer(entryType);
    },
    [handleOpenTextComposer, pickImageAndOpenComposer]
  );

  const onYearTextChange = useCallback((text: string) => {
    if (!/^-?\d*$/.test(text)) {
      return;
    }

    setDraft((previous) => {
      if (text === '' || text === '-') {
        return {
          ...previous,
          yearText: text,
          dynasty: '',
        };
      }

      const parsedYear = Number.parseInt(text, 10);
      if (Number.isNaN(parsedYear)) {
        return {
          ...previous,
          yearText: text,
        };
      }

      const matchedDynasty = findDynastyByYear(parsedYear);
      return {
        ...previous,
        yearText: text,
        dynasty: matchedDynasty?.label ?? '',
      };
    });
  }, []);

  const onSelectDynasty = useCallback((dynastyLabel: string) => {
    const dynasty = getDynastyByLabel(dynastyLabel);
    if (!dynasty) {
      return;
    }

    setDraft((previous) => ({
      ...previous,
      dynasty: dynasty.label,
      yearText: String(dynasty.fromYear),
    }));
  }, []);

  const saveArtifact = useCallback(async () => {
    if (isSaving) {
      return;
    }

    const artifactName = draft.name.trim();
    if (!artifactName) {
      Alert.alert('校验失败', '请填写文物名称。');
      return;
    }

    const parsedYear = Number.parseInt(draft.yearText, 10);
    if (!Number.isInteger(parsedYear)) {
      Alert.alert('校验失败', '请填写有效年代。');
      return;
    }

    const matchedDynasty = findDynastyByYear(parsedYear);
    if (!matchedDynasty) {
      Alert.alert('校验失败', '当前年代未匹配到朝代，请调整年份。');
      return;
    }

    const dynasty = draft.dynasty || matchedDynasty.label;
    if (dynasty !== matchedDynasty.label) {
      Alert.alert('校验失败', '年代与朝代不一致，请重新选择。');
      return;
    }

    setIsSaving(true);

    try {
      let exhibitionId = draft.selectedExhibitionId;
      const newExhibitionName = draft.newExhibitionName.trim();

      if (newExhibitionName) {
        const createdExhibition = await createExhibition({ name: newExhibitionName });
        exhibitionId = createdExhibition.id;
      }

      if (!exhibitionId) {
        Alert.alert('校验失败', '请先选择一个展览，或创建新展览。');
        return;
      }

      await createArtifact({
        name: artifactName,
        photoUri: draft.photoUri,
        exhibitionId,
        year: parsedYear,
        dynasty,
        note: draft.note.trim() || null,
      });

      await pullCollections();
      setComposerVisible(false);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      Alert.alert('保存失败', toErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [draft, isSaving, pullCollections]);

  const artifactsByDynasty = useMemo(() => {
    const map = new Map<string, Artifact[]>();

    for (const artifact of artifacts) {
      const current = map.get(artifact.dynasty) ?? [];
      current.push(artifact);
      map.set(artifact.dynasty, current);
    }

    return map;
  }, [artifacts]);

  const artifactCountByExhibition = useMemo(() => {
    const map = new Map<number, number>();

    for (const artifact of artifacts) {
      map.set(artifact.exhibitionId, (map.get(artifact.exhibitionId) ?? 0) + 1);
    }

    return map;
  }, [artifacts]);

  const latestPhotoByExhibition = useMemo(() => {
    const map = new Map<number, string>();

    for (const artifact of artifacts) {
      if (!artifact.photoUri) {
        continue;
      }

      if (!map.has(artifact.exhibitionId)) {
        map.set(artifact.exhibitionId, artifact.photoUri);
      }
    }

    return map;
  }, [artifacts]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 20,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx > 48 && mode === 'history') {
            setMode('exhibition');
          }

          if (gestureState.dx < -48 && mode === 'exhibition') {
            setMode('history');
          }
        },
      }),
    [mode]
  );

  if (bootstrapState.status === 'loading') {
    return (
      <View style={styles.bootContainer}>
        <Text style={styles.bootTitle}>正在加载博物馆笔记</Text>
        <Text style={styles.bootHint}>本地数据库初始化中...</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (bootstrapState.status === 'error') {
    return (
      <View style={styles.bootContainer}>
        <Text style={styles.bootTitle}>启动失败</Text>
        <Text style={styles.errorHint}>{bootstrapState.message}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setBootstrapState({ status: 'loading' });
            setBootstrapNonce((previous) => previous + 1);
          }}
        >
          <Text style={styles.retryButtonText}>重试</Text>
        </Pressable>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.appRoot}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.brand}>博物馆笔记</Text>

        <View style={styles.modeSwitcher}>
          <Pressable
            style={[styles.modeChip, mode === 'history' && styles.modeChipActive]}
            onPress={() => setMode('history')}
          >
            <Text style={[styles.modeText, mode === 'history' && styles.modeTextActive]}>历史</Text>
          </Pressable>

          <Pressable
            style={[styles.modeChip, mode === 'exhibition' && styles.modeChipActive]}
            onPress={() => setMode('exhibition')}
          >
            <Text style={[styles.modeText, mode === 'exhibition' && styles.modeTextActive]}>
              展览
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.refreshButton} onPress={() => void refreshCollections()}>
          <Text style={styles.refreshButtonText}>{isRefreshing ? '刷新中' : '刷新'}</Text>
        </Pressable>
      </View>

      <Text style={styles.gestureHint}>左右滑动内容区域可切换模式</Text>

      <View style={styles.contentArea} {...panResponder.panHandlers}>
        {mode === 'history' ? (
          <ScrollView contentContainerStyle={styles.historyContainer}>
            {DYNASTY_SEGMENTS.map((segment) => {
              const rows = artifactsByDynasty.get(segment.label) ?? [];

              return (
                <View key={segment.key} style={styles.timelineSection}>
                  <View style={styles.timelineMeta}>
                    <Text style={styles.timelineDynasty}>{segment.label}</Text>
                    <Text style={styles.timelineRange}>{segment.rangeLabel}</Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.timelineCards}
                  >
                    {rows.length === 0 ? (
                      <View style={styles.emptyTimelineCard}>
                        <Text style={styles.emptyTimelineText}>暂无文物</Text>
                      </View>
                    ) : (
                      rows.map((artifact) => (
                        <Pressable
                          key={artifact.id}
                          style={styles.artifactCard}
                          onPress={() => {
                            Alert.alert(
                              artifact.name,
                              `${artifact.dynasty} · ${formatYearLabel(artifact.year)}\n${artifact.note ?? '暂无说明'}`
                            );
                          }}
                        >
                          {artifact.photoUri ? (
                            <Image source={{ uri: artifact.photoUri }} style={styles.artifactImage} />
                          ) : (
                            <View style={styles.artifactImageFallback}>
                              <Text style={styles.artifactImageFallbackText}>无图</Text>
                            </View>
                          )}

                          <Text numberOfLines={1} style={styles.artifactName}>
                            {artifact.name}
                          </Text>
                          <Text style={styles.artifactYear}>{formatYearLabel(artifact.year)}</Text>
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        ) : exhibitions.length === 0 ? (
          <View style={styles.emptyExhibitionWrap}>
            <Text style={styles.emptyExhibitionTitle}>还没有展览</Text>
            <Text style={styles.emptyExhibitionHint}>点击底部 + 新建第一条文物并创建展览</Text>
          </View>
        ) : (
          <FlatList
            data={exhibitions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.exhibitionList}
            renderItem={({ item }) => {
              const artifactCount = artifactCountByExhibition.get(item.id) ?? 0;
              const previewPhoto = latestPhotoByExhibition.get(item.id);

              return (
                <Pressable
                  style={styles.exhibitionCard}
                  onPress={() => {
                    Alert.alert('展览详情', `${item.name}\n文物数量：${artifactCount}`);
                  }}
                >
                  <View style={styles.exhibitionCoverWrap}>
                    {previewPhoto ? (
                      <Image source={{ uri: previewPhoto }} style={styles.exhibitionCover} />
                    ) : (
                      <View style={styles.exhibitionCoverFallback}>
                        <Text style={styles.exhibitionCoverFallbackText}>等待头图</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.exhibitionInfo}>
                    <Text style={styles.exhibitionName}>{item.name}</Text>
                    <Text style={styles.exhibitionMeta}>文物 {artifactCount} 件</Text>
                    <Text style={styles.exhibitionMeta}>创建于 {formatDate(item.createdAt)}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.addButton} onPress={() => setMenuVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View style={styles.entrySheet}>
            <Text style={styles.entryTitle}>添加文物</Text>

            <Pressable style={styles.entryAction} onPress={() => void onSelectEntry('library')}>
              <Text style={styles.entryActionText}>从相册选择</Text>
            </Pressable>

            <Pressable style={styles.entryAction} onPress={() => void onSelectEntry('camera')}>
              <Text style={styles.entryActionText}>拍照</Text>
            </Pressable>

            <Pressable style={styles.entryAction} onPress={() => void onSelectEntry('text')}>
              <Text style={styles.entryActionText}>写文字</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={composerVisible}
        animationType="slide"
        onRequestClose={() => setComposerVisible(false)}
      >
        <View style={styles.composerRoot}>
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>新建文物</Text>
            <Pressable
              onPress={() => {
                if (isSaving) {
                  return;
                }
                setComposerVisible(false);
              }}
            >
              <Text style={styles.composerCancel}>取消</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.composerContent}>
            <Text style={styles.fieldLabel}>名称（必填）</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(text) => setDraft((previous) => ({ ...previous, name: text }))}
              placeholder="例如：鎏金铜灯"
              placeholderTextColor="#a7a9a7"
            />

            <Text style={styles.fieldLabel}>照片（选填）</Text>
            {draft.photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: draft.photoUri }} style={styles.photoPreview} />
                <Pressable
                  style={styles.photoRemoveButton}
                  onPress={() => setDraft((previous) => ({ ...previous, photoUri: null }))}
                >
                  <Text style={styles.photoRemoveText}>移除照片</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.photoHint}>可在上一层菜单里选择“拍照”或“从相册选择”。</Text>
            )}

            <Text style={styles.fieldLabel}>展览（必填）</Text>
            {exhibitions.length > 0 ? (
              <View style={styles.chipWrap}>
                {exhibitions.map((exhibition) => (
                  <Pressable
                    key={exhibition.id}
                    style={[
                      styles.exhibitionChip,
                      draft.selectedExhibitionId === exhibition.id && styles.exhibitionChipActive,
                    ]}
                    onPress={() =>
                      setDraft((previous) => ({
                        ...previous,
                        selectedExhibitionId: exhibition.id,
                        newExhibitionName: '',
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.exhibitionChipText,
                        draft.selectedExhibitionId === exhibition.id && styles.exhibitionChipTextActive,
                      ]}
                    >
                      {exhibition.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.smallHint}>当前还没有展览，请先创建一个。</Text>
            )}

            <TextInput
              style={styles.input}
              value={draft.newExhibitionName}
              onChangeText={(text) =>
                setDraft((previous) => ({
                  ...previous,
                  newExhibitionName: text,
                  selectedExhibitionId: text.trim() ? null : previous.selectedExhibitionId,
                }))
              }
              placeholder="或新建展览名称，例如：汉唐珍宝展"
              placeholderTextColor="#a7a9a7"
            />

            <Text style={styles.fieldLabel}>年代（必填）</Text>
            <TextInput
              style={styles.input}
              value={draft.yearText}
              onChangeText={onYearTextChange}
              placeholder="例如 1368 或 -221"
              placeholderTextColor="#a7a9a7"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.fieldLabel}>朝代（联动）</Text>
            <View style={styles.chipWrap}>
              {DYNASTY_SEGMENTS.map((segment) => (
                <Pressable
                  key={segment.key}
                  style={[styles.dynastyChip, draft.dynasty === segment.label && styles.dynastyChipActive]}
                  onPress={() => onSelectDynasty(segment.label)}
                >
                  <Text
                    style={[
                      styles.dynastyChipText,
                      draft.dynasty === segment.label && styles.dynastyChipTextActive,
                    ]}
                  >
                    {segment.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.smallHint}>
              当前识别朝代：{draft.dynasty || '未匹配'}
            </Text>

            <Text style={styles.fieldLabel}>文物说明（选填）</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={draft.note}
              onChangeText={(text) => setDraft((previous) => ({ ...previous, note: text }))}
              placeholder="记录说明牌内容或你的理解"
              placeholderTextColor="#a7a9a7"
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          <Pressable
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={() => void saveArtifact()}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? '保存中...' : '保存文物'}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#f4efe2',
    paddingTop: 54,
  },
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4efe2',
    gap: 10,
    paddingHorizontal: 24,
  },
  bootTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#232018',
  },
  bootHint: {
    fontSize: 15,
    color: '#72695b',
  },
  errorHint: {
    fontSize: 15,
    color: '#8a3525',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#232018',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#f8f5ef',
    fontWeight: '700',
  },
  header: {
    paddingHorizontal: 16,
    gap: 12,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#232018',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#e2d8c5',
    borderRadius: 16,
    padding: 4,
    alignSelf: 'center',
    gap: 4,
  },
  modeChip: {
    minWidth: 120,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeChipActive: {
    backgroundColor: '#232018',
  },
  modeText: {
    color: '#4f4639',
    fontWeight: '700',
    fontSize: 15,
  },
  modeTextActive: {
    color: '#f6f2e8',
  },
  refreshButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  refreshButtonText: {
    color: '#4f4639',
    fontSize: 13,
    fontWeight: '600',
  },
  gestureHint: {
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
    color: '#736b5f',
    fontSize: 12,
  },
  contentArea: {
    flex: 1,
  },
  historyContainer: {
    paddingHorizontal: 12,
    paddingBottom: 120,
    gap: 14,
  },
  timelineSection: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#fff9ef',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eadcc6',
  },
  timelineMeta: {
    width: 78,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  timelineDynasty: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2a241b',
  },
  timelineRange: {
    marginTop: 3,
    fontSize: 11,
    color: '#7b7267',
    lineHeight: 16,
  },
  timelineCards: {
    gap: 10,
    paddingRight: 2,
  },
  emptyTimelineCard: {
    width: 122,
    height: 122,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfd2bd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdf6ea',
  },
  emptyTimelineText: {
    color: '#9b9183',
    fontSize: 12,
    fontWeight: '600',
  },
  artifactCard: {
    width: 122,
    borderRadius: 12,
    backgroundColor: '#f8efdf',
    padding: 7,
    borderWidth: 1,
    borderColor: '#e5d8c1',
  },
  artifactImage: {
    width: '100%',
    height: 92,
    borderRadius: 8,
    backgroundColor: '#dfd2bd',
  },
  artifactImageFallback: {
    width: '100%',
    height: 92,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eadcc6',
  },
  artifactImageFallbackText: {
    color: '#6d6458',
    fontWeight: '700',
  },
  artifactName: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#2a241b',
  },
  artifactYear: {
    marginTop: 2,
    fontSize: 11,
    color: '#7a7063',
  },
  emptyExhibitionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyExhibitionTitle: {
    fontSize: 20,
    color: '#2a241b',
    fontWeight: '800',
  },
  emptyExhibitionHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#72695c',
    textAlign: 'center',
  },
  exhibitionList: {
    paddingHorizontal: 12,
    paddingBottom: 120,
    gap: 10,
  },
  exhibitionCard: {
    borderRadius: 16,
    backgroundColor: '#fff9ef',
    borderWidth: 1,
    borderColor: '#e9dcc7',
    overflow: 'hidden',
  },
  exhibitionCoverWrap: {
    height: 140,
    backgroundColor: '#e8dcc7',
  },
  exhibitionCover: {
    width: '100%',
    height: '100%',
  },
  exhibitionCoverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exhibitionCoverFallbackText: {
    color: '#6b6256',
    fontWeight: '700',
  },
  exhibitionInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  exhibitionName: {
    fontSize: 16,
    color: '#2a241b',
    fontWeight: '800',
  },
  exhibitionMeta: {
    color: '#756c60',
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1f1b13',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#f4efe2',
  },
  addButtonText: {
    color: '#fff8ea',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '500',
    marginTop: -2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  entrySheet: {
    backgroundColor: '#fff9ef',
    borderRadius: 20,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#eadcc6',
  },
  entryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2a241b',
    marginBottom: 4,
  },
  entryAction: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7d9c4',
    backgroundColor: '#fdf5e8',
    paddingVertical: 12,
    alignItems: 'center',
  },
  entryActionText: {
    fontSize: 15,
    color: '#312a1e',
    fontWeight: '700',
  },
  composerRoot: {
    flex: 1,
    backgroundColor: '#f7f0e5',
    paddingTop: 56,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  composerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2a241b',
  },
  composerCancel: {
    fontSize: 15,
    color: '#5c5245',
    fontWeight: '700',
  },
  composerContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  fieldLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#2c261c',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#deceb5',
    backgroundColor: '#fff9ef',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#272117',
  },
  multilineInput: {
    minHeight: 110,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exhibitionChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e0d0b8',
    backgroundColor: '#fbf2e3',
  },
  exhibitionChipActive: {
    borderColor: '#262116',
    backgroundColor: '#262116',
  },
  exhibitionChipText: {
    color: '#554c40',
    fontWeight: '700',
    fontSize: 12,
  },
  exhibitionChipTextActive: {
    color: '#f9f4ea',
  },
  dynastyChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8c7ad',
    backgroundColor: '#f9efdd',
  },
  dynastyChipActive: {
    borderColor: '#5a3f28',
    backgroundColor: '#5a3f28',
  },
  dynastyChipText: {
    color: '#5f5344',
    fontSize: 12,
    fontWeight: '700',
  },
  dynastyChipTextActive: {
    color: '#fcf8f0',
  },
  smallHint: {
    fontSize: 12,
    color: '#766d62',
  },
  photoPreviewWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#deceb5',
    backgroundColor: '#fff9ef',
    padding: 8,
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#e5d7c1',
  },
  photoRemoveButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#ece0cd',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoRemoveText: {
    color: '#5d5244',
    fontSize: 12,
    fontWeight: '700',
  },
  photoHint: {
    color: '#7a7265',
    fontSize: 12,
  },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 22,
    borderRadius: 14,
    backgroundColor: '#1f1b13',
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#f9f4ea',
    fontSize: 16,
    fontWeight: '800',
  },
});
