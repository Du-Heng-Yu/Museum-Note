import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Alert,
  Modal,
  FlatList,
  Platform,
  Animated as RNAnimated,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Paths } from 'expo-file-system';
import type { RootStackParamList, Exhibition } from '../types';
import {
  DYNASTIES,
  YEAR_MIN,
  YEAR_MAX,
  matchDynastiesByYear,
} from '../constants/dynasties';
import type { DynastyMatchResult } from '../constants/dynasties';
import {
  createArtifact,
  getArtifactById,
  updateArtifact,
  getAllExhibitions,
} from '../db';
import { parseJsonArray, toJsonString } from '../utils/json';
import { copyPhotosToPrivateDir, deletePhotoFiles } from '../utils/photo';
import { consumePendingPhoto } from '../utils/pendingPhoto';

type Props = NativeStackScreenProps<RootStackParamList, 'ArtifactEdit'>;

const MODE_KEY = 'artifact_edit_mode';
type EditMode = 'auto_dynasty' | 'auto_year';

export default function ArtifactEditScreen({ route, navigation }: Props) {
  const artifactId = route.params?.artifactId;
  const initialPhotos = route.params?.photos ?? [];
  const isEdit = artifactId !== undefined;

  // Form state
  const [name, setName] = useState('');
  const [yearText, setYearText] = useState('');
  const [dynasty, setDynasty] = useState('');
  const [exhibitionId, setExhibitionId] = useState<number | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>(initialPhotos);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Mode & UI state
  const [mode, setMode] = useState<EditMode>('auto_dynasty');
  const [yearError, setYearError] = useState('');
  const [alternatives, setAlternatives] = useState<DynastyMatchResult['alternatives']>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [showExhibitionPicker, setShowExhibitionPicker] = useState(false);
  const [showDynastyPicker, setShowDynastyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const nameInputRef = useRef<TextInput>(null);
  const originalPhotos = useRef<string[]>([]);
  const photoSize = useRef(new RNAnimated.Value(80)).current;
  const waitingForNewExhibition = useRef(false);

  // Load persisted mode
  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((v) => {
      if (v === 'auto_dynasty' || v === 'auto_year') setMode(v);
    });
  }, []);

  // 从 Camera 页面 goBack 回来后，消费 pending photo
  useFocusEffect(
    useCallback(() => {
      const uri = consumePendingPhoto();
      if (uri) {
        setPhotoUris((prev) => prev.includes(uri) ? prev : [...prev, uri]);
      }
    }, [])
  );

  // Keyboard-aware photo shrink
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, () => {
      RNAnimated.spring(photoSize, { toValue: 40, useNativeDriver: false, damping: 15, stiffness: 150 }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      RNAnimated.spring(photoSize, { toValue: 80, useNativeDriver: false, damping: 15, stiffness: 150 }).start();
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [photoSize]);

  // Load artifact data in edit mode
  useEffect(() => {
    if (isEdit && artifactId != null) {
      const a = getArtifactById(artifactId);
      if (a) {
        setName(a.name);
        setYearText(String(a.year));
        setDynasty(a.dynasty);
        setExhibitionId(a.exhibition_id);
        const photos = parseJsonArray(a.photos);
        setPhotoUris(photos);
        originalPhotos.current = photos;
        setDescription(a.description ?? '');
        setNote(a.note ?? '');
        setTags(parseJsonArray(a.tags));
      }
    }
  }, [artifactId, isEdit]);

  // Load exhibitions on focus (picks up newly created ones)
  useFocusEffect(
    useCallback(() => {
      const list = getAllExhibitions();
      setExhibitions(list);
      // Auto-select newest exhibition after returning from ExhibitionEdit
      if (waitingForNewExhibition.current && list.length > 0) {
        const newest = list.reduce((a, b) => (a.id > b.id ? a : b));
        setExhibitionId(newest.id);
        waitingForNewExhibition.current = false;
      } else if (exhibitionId == null && list.length > 0 && !isEdit) {
        // First load: auto-select newest if none selected
        if (list.length > exhibitions.length && exhibitions.length > 0) {
          const newest = list.reduce((a, b) => (a.id > b.id ? a : b));
          setExhibitionId(newest.id);
        }
      }
    }, [exhibitionId, isEdit, exhibitions.length]),
  );

  // Header save button
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? '编辑文物' : '添加文物',
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={{ color: saving ? '#ccc' : '#4A90D9', fontSize: 16, fontWeight: '600' }}>
            保存
          </Text>
        </TouchableOpacity>
      ),
    });
  });

  // --- Year-Dynasty Linking ---
  function handleYearChange(text: string) {
    // Allow only digits, negative sign, filter others
    const filtered = text.replace(/[^0-9-]/g, '');
    setYearText(filtered);

    if (mode !== 'auto_dynasty') return;

    const parsed = parseInt(filtered, 10);
    if (isNaN(parsed) || filtered === '-' || filtered === '') {
      setDynasty('');
      setAlternatives([]);
      setYearError('');
      return;
    }

    if (parsed < YEAR_MIN || parsed > YEAR_MAX) {
      setYearError(`年份超出范围（${YEAR_MIN} ~ ${YEAR_MAX}）`);
      setDynasty('');
      setAlternatives([]);
      return;
    }

    setYearError('');
    const result = matchDynastiesByYear(parsed);
    setDynasty(result.primary.name);
    setAlternatives(result.alternatives);
  }

  function handleAlternativePress(altName: string) {
    // Swap: clicked alternative becomes primary, current primary goes to alternatives
    const currentPrimary = dynasty;
    setDynasty(altName);
    const newAlts = alternatives
      .filter((a) => a.name !== altName)
      .concat(DYNASTIES.filter((d) => d.name === currentPrimary));
    newAlts.sort((a, b) => a.order - b.order);
    setAlternatives(newAlts);
  }

  function handleDynastySelect(d: typeof DYNASTIES[0]) {
    setDynasty(d.name);
    if (mode === 'auto_year') {
      setYearText(String(d.startYear));
      setYearError('');
    }
    setShowDynastyPicker(false);
  }

  function handleModeChange(newMode: EditMode) {
    setMode(newMode);
    AsyncStorage.setItem(MODE_KEY, newMode);
    // Reset linking state
    setAlternatives([]);
    setYearError('');
    if (newMode === 'auto_dynasty' && yearText) {
      // Re-trigger year → dynasty matching
      const parsed = parseInt(yearText, 10);
      if (!isNaN(parsed) && parsed >= YEAR_MIN && parsed <= YEAR_MAX) {
        const result = matchDynastiesByYear(parsed);
        setDynasty(result.primary.name);
        setAlternatives(result.alternatives);
      }
    }
  }

  // --- Photos ---
  async function handleAddPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function handleRemovePhoto(index: number) {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCameraAdd() {
    navigation.navigate('Camera', { fromEdit: true });
  }

  // --- Tags ---
  function handleAddTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput('');
  }

  // --- Save ---
  async function handleSave() {
    // Validation
    if (!name.trim()) {
      Alert.alert('提示', '请输入文物名称');
      return;
    }
    const yearParsed = parseInt(yearText, 10);
    if (isNaN(yearParsed)) {
      Alert.alert('提示', '请输入有效年份');
      return;
    }
    if (yearParsed < YEAR_MIN || yearParsed > YEAR_MAX) {
      Alert.alert('提示', `年份超出范围（${YEAR_MIN} ~ ${YEAR_MAX}）`);
      return;
    }
    if (!dynasty) {
      Alert.alert('提示', '请选择朝代');
      return;
    }
    if (exhibitionId == null) {
      Alert.alert('提示', '请选择所属展览');
      return;
    }

    setSaving(true);
    try {
      const docUri = Paths.document.uri;

      if (isEdit && artifactId != null) {
        // --- Edit mode ---
        const oldPhotos = originalPhotos.current;
        const removed = oldPhotos.filter((p) => !photoUris.includes(p));
        const newTemps = photoUris.filter((p) => !p.startsWith(docUri));
        const keptPrivate = photoUris.filter((p) => p.startsWith(docUri));

        if (removed.length > 0) {
          await deletePhotoFiles(removed);
        }

        let finalPhotos = [...keptPrivate];
        if (newTemps.length > 0) {
          const copied = await copyPhotosToPrivateDir(newTemps, artifactId);
          finalPhotos = [...finalPhotos, ...copied];
        }

        updateArtifact(artifactId, {
          name: name.trim(),
          year: yearParsed,
          dynasty,
          exhibition_id: exhibitionId,
          photos: toJsonString(finalPhotos),
          description: description.trim() || null,
          note: note.trim() || null,
          tags: toJsonString(tags),
        });
      } else {
        // --- Create mode ---
        const artifact = createArtifact({
          name: name.trim(),
          year: yearParsed,
          dynasty,
          exhibition_id: exhibitionId,
          photos: null,
          description: description.trim() || null,
          note: note.trim() || null,
          tags: toJsonString(tags),
        });

        if (photoUris.length > 0) {
          const privatePaths = await copyPhotosToPrivateDir(photoUris, artifact.id);
          updateArtifact(artifact.id, { photos: toJsonString(privatePaths) });
        }
      }

      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('保存失败', msg);
    } finally {
      setSaving(false);
    }
  }

  const selectedExhibition = exhibitions.find((e) => e.id === exhibitionId);
  const canSave =
    name.trim() !== '' &&
    yearText !== '' &&
    !isNaN(parseInt(yearText, 10)) &&
    yearError === '' &&
    dynasty !== '' &&
    exhibitionId != null &&
    !saving;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      {/* 照片 */}
      <ScrollView horizontal style={styles.photoRow} showsHorizontalScrollIndicator={false}>
        {photoUris.map((uri, i) => (
          <TouchableOpacity key={`${uri}-${i}`} activeOpacity={0.8} onPress={() => setPreviewUri(uri)}>
            <RNAnimated.View style={[styles.photoThumb, { width: photoSize, height: photoSize }]}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <TouchableOpacity style={styles.photoRemove} onPress={() => handleRemovePhoto(i)}>
                <Text style={styles.photoRemoveText}>×</Text>
              </TouchableOpacity>
            </RNAnimated.View>
          </TouchableOpacity>
        ))}
        <RNAnimated.View style={[styles.photoAdd, { width: photoSize, height: photoSize, marginRight: 8 }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleAddPhotos}>
            <View style={styles.photoAddInner}>
              <Text style={styles.photoAddText}>+</Text>
            </View>
          </TouchableOpacity>
        </RNAnimated.View>
        <RNAnimated.View style={[styles.photoAdd, { width: photoSize, height: photoSize }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleCameraAdd}>
            <View style={styles.photoAddInner}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
        </RNAnimated.View>
      </ScrollView>

      {/* 文物名称 */}
      <Text style={styles.label}>文物名称 *</Text>
      <TextInput
        ref={nameInputRef}
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="例如：后母戊鼎"
      />

      {/* 文物笔记 */}
      <Text style={styles.label}>文物笔记</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="输入正文"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <View style={styles.divider} />

      {/* 年份 & 朝代 并排 */}
      <Text style={styles.label}>文物年代 *</Text>
      <View style={styles.yearDynastyRow}>
        <View style={styles.yearDynastyCol}>
          <Text style={styles.label}>年份（-表示公元前）</Text>
          <TextInput
            style={[
              styles.input,
              yearError ? styles.inputError : null,
            ]}
            value={yearText}
            onChangeText={handleYearChange}
            onFocus={() => { if (mode !== 'auto_dynasty') handleModeChange('auto_dynasty'); }}
            placeholder="-1300"
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />
          {yearError ? <Text style={styles.errorText}>{yearError}</Text> : null}
        </View>
        <View style={styles.yearDynastyCol}>
          <Text style={styles.label}>中国史时期</Text>
          <TouchableOpacity
            style={[styles.input, styles.pickerBtn]}
            onPress={() => {
              Keyboard.dismiss();
              if (mode !== 'auto_year') handleModeChange('auto_year');
              setShowDynastyPicker(true);
            }}
          >
            <Text style={dynasty ? styles.pickerText : styles.pickerPlaceholder}>
              {dynasty || '选择朝代'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 备选朝代提示 */}
      {mode === 'auto_dynasty' && alternatives.length > 0 && (
        <View style={styles.altRow}>
          <Text style={styles.altLabel}>也可能是：</Text>
          {alternatives.map((alt) => (
            <TouchableOpacity key={alt.id} onPress={() => handleAlternativePress(alt.name)}>
              <Text style={styles.altItem}>{alt.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 所属展览 */}
      <Text style={styles.label}>所属展览 *</Text>
      <TouchableOpacity
        style={[styles.input, styles.pickerBtn]}
        onPress={() => setShowExhibitionPicker(true)}
      >
        <Text style={selectedExhibition ? styles.pickerText : styles.pickerPlaceholder}>
          {selectedExhibition
            ? `${selectedExhibition.name} · ${selectedExhibition.museum}`
            : '请选择展览'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Exhibition Picker Modal */}
      <Modal visible={showExhibitionPicker} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setShowExhibitionPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>选择展览</Text>
                <FlatList
                  data={exhibitions}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setExhibitionId(item.id);
                        setShowExhibitionPicker(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.name} · {item.museum}</Text>
                      {item.id === exhibitionId && <Text style={styles.modalCheck}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setShowExhibitionPicker(false);
                        waitingForNewExhibition.current = true;
                        navigation.navigate('ExhibitionEdit', { fromArtifactEdit: true });
                      }}
                    >
                      <Text style={[styles.modalItemText, { color: '#4A90D9' }]}>+ 新建展览</Text>
                    </TouchableOpacity>
                  }
                />
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowExhibitionPicker(false)}>
                  <Text style={styles.modalCloseText}>取消</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Dynasty Picker Modal */}
      <Modal visible={showDynastyPicker} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setShowDynastyPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>选择朝代</Text>
                <Text style={styles.modalHint}>将自动填入所选朝代的起始年份</Text>
                <FlatList
                  data={DYNASTIES}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => handleDynastySelect(item)}
                    >
                      <Text style={styles.modalItemText}>
                        {item.name}（{item.startYear} ~ {item.endYear}）
                      </Text>
                      {item.name === dynasty && <Text style={styles.modalCheck}>✓</Text>}
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowDynastyPicker(false)}>
                  <Text style={styles.modalCloseText}>取消</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>

    {/* 照片全屏预览 */}
    <Modal visible={previewUri !== null} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={() => setPreviewUri(null)}>
        <View style={styles.fullscreenOverlay}>
          {previewUri && (
            <Image source={{ uri: previewUri }} style={styles.fullscreenImage} resizeMode="contain" />
          )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  inputDisabled: { backgroundColor: '#eee', color: '#999' },
  inputError: { borderColor: '#e74c3c' },
  multiline: { minHeight: 160 },
  errorText: { color: '#e74c3c', fontSize: 12, marginTop: 4 },

  yearDynastyRow: { flexDirection: 'row', gap: 10, marginTop: 0 },
  yearDynastyCol: { flex: 1 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  modeBtnActive: { borderColor: '#4A90D9', backgroundColor: '#EAF2FD' },
  modeBtnText: { fontSize: 14, color: '#666' },
  modeBtnTextActive: { color: '#4A90D9', fontWeight: '600' },

  pickerBtn: { justifyContent: 'center' },
  pickerText: { fontSize: 15, color: '#333' },
  pickerPlaceholder: { fontSize: 15, color: '#aaa' },

  altRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 },
  altLabel: { fontSize: 13, color: '#888' },
  altItem: { fontSize: 13, color: '#4A90D9', marginLeft: 6, textDecorationLine: 'underline' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e0e0e0', marginTop: 20 },

  photoRow: { marginTop: 4 },
  photoThumb: { marginRight: 8, borderRadius: 8, overflow: 'hidden' },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 14, lineHeight: 16 },
  photoAdd: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoAddInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddText: { fontSize: 28, color: '#ccc' },
  cameraIcon: { fontSize: 22, opacity: 0.4 },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: { width: '100%', height: '100%' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { backgroundColor: '#EAF2FD', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  tagText: { fontSize: 13, color: '#4A90D9' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingTop: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  modalHint: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: -6, marginBottom: 10 },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  modalItemText: { fontSize: 15, color: '#333', flex: 1 },
  modalCheck: { fontSize: 16, color: '#4A90D9', marginLeft: 8 },
  modalClose: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  modalCloseText: { fontSize: 15, color: '#999' },
});
