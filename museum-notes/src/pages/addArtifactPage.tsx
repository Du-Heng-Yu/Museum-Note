import { useCallback, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  createArtifact,
  createExhibition,
  getLastUsedExhibitionId,
  listExhibitions,
  type Exhibition,
} from '../db';
import { DYNASTY_SEGMENTS, findDynastyByYear, getDynastyByLabel } from '../constants/dynasties';
import type { RootStackParamList } from '../navigation/types';
import { serializeArtifactPhotoUris } from '../utils/artifactPhotos';

type ArtifactDraft = {
  name: string;
  note: string;
  yearText: string;
  dynasty: string;
  selectedExhibitionId: number | null;
  newExhibitionName: string;
  photoUris: string[];
};

function createEmptyDraft(): ArtifactDraft {
  return {
    name: '',
    note: '',
    yearText: '',
    dynasty: '',
    selectedExhibitionId: null,
    newExhibitionName: '',
    photoUris: [],
  };
}

function normalizePhotoUriList(photoUris: string[] | undefined): string[] {
  if (!photoUris) {
    return [];
  }

  return photoUris.map((uri) => uri.trim()).filter((uri) => uri.length > 0);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误';
}

type Props = NativeStackScreenProps<RootStackParamList, 'addArtifactPage'>;

export default function AddArtifactPage({ navigation, route }: Props) {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ArtifactDraft>(createEmptyDraft);
  const nameInputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadExhibitions = async () => {
        try {
          const [rows, lastUsedExhibitionId] = await Promise.all([
            listExhibitions(),
            getLastUsedExhibitionId(),
          ]);

          if (!active) {
            return;
          }

          setExhibitions(rows);

          setDraft((previous) => {
            if (previous.selectedExhibitionId !== null) {
              return previous;
            }

            return {
              ...previous,
              selectedExhibitionId: lastUsedExhibitionId ?? rows[0]?.id ?? null,
            };
          });
        } catch (error) {
          Alert.alert('加载失败', toErrorMessage(error));
        }
      };

      void loadExhibitions();

      return () => {
        active = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const incomingPhotoUris = normalizePhotoUriList(route.params?.initialPhotoUris);
      if (incomingPhotoUris.length > 0) {
        setDraft((previous) => ({
          ...previous,
          photoUris: incomingPhotoUris,
        }));
      }

      if (!route.params?.focusNameInput) {
        return;
      }

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 120);

      return () => {
        clearTimeout(timer);
      };
    }, [route.params?.focusNameInput, route.params?.initialPhotoUris])
  );

  const clearDraftAndGoBack = useCallback(() => {
    setDraft(createEmptyDraft());
    navigation.goBack();
  }, [navigation]);

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
        photoUri: serializeArtifactPhotoUris(draft.photoUris),
        exhibitionId,
        year: parsedYear,
        dynasty,
        note: draft.note.trim() || null,
      });

      setDraft(createEmptyDraft());
      navigation.goBack();
    } catch (error) {
      Alert.alert('保存失败', toErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [draft, isSaving, navigation]);

  return (
    <View style={styles.pageRoot}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>新增文物</Text>
        <Pressable
          onPress={() => {
            if (isSaving) {
              return;
            }

            clearDraftAndGoBack();
          }}
        >
          <Text style={styles.cancelText}>取消</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.composerContent}>
        <Text style={styles.fieldLabel}>名称（必填）</Text>
        <TextInput
          ref={nameInputRef}
          style={styles.input}
          value={draft.name}
          onChangeText={(text) => setDraft((previous) => ({ ...previous, name: text }))}
          placeholder="例如：鎏金铜灯"
          placeholderTextColor="#a7a9a7"
        />

        <Text style={styles.fieldLabel}>照片（选填）</Text>
        {draft.photoUris.length > 0 ? (
          <View style={styles.photoPreviewWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoPreviewList}
            >
              {draft.photoUris.map((uri, index) => (
                <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photoPreview} />
              ))}
            </ScrollView>

            {draft.photoUris.length > 1 ? (
              <Text style={styles.smallHint}>已选择 {draft.photoUris.length} 张，保存后首张会作为列表封面展示。</Text>
            ) : null}

            <Pressable
              style={styles.photoRemoveButton}
              onPress={() => setDraft((previous) => ({ ...previous, photoUris: [] }))}
            >
              <Text style={styles.photoRemoveText}>移除照片</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.photoHint}>请在首页点击 + 后选择“从相册选择”或“相机”来带入照片。</Text>
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

        <Text style={styles.smallHint}>当前识别朝代：{draft.dynasty || '未匹配'}</Text>

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
  );
}

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
    backgroundColor: '#f7f0e5',
    paddingTop: 56,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2a241b',
  },
  cancelText: {
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
  photoPreviewList: {
    gap: 8,
    paddingRight: 2,
  },
  photoPreview: {
    width: 150,
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
