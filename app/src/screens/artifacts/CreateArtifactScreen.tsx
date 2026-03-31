import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { DYNASTY_OPTIONS } from '../../constants/dynasties';
import { createArtifact, getExhibitionById } from '../../db';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { inferDynastyByYear, inferStartYearByDynasty, parseYearText } from '../../utils/dynasty';
import { persistImagesAsync } from '../../utils/imageStore';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type CreateArtifactRoute = RouteProp<RootStackParamList, 'CreateArtifact'>;

export function CreateArtifactScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<CreateArtifactRoute>();
  const exhibitionId = route.params.exhibitionId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [yearText, setYearText] = useState('');
  const [dynasty, setDynasty] = useState<string>('');
  const [isAssistant, setIsAssistant] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExhibition, setLoadingExhibition] = useState(true);
  const [exhibitionTitle, setExhibitionTitle] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const exhibition = await getExhibitionById(exhibitionId);
        if (active) {
          setExhibitionTitle(exhibition?.title ?? '');
        }
      } finally {
        if (active) {
          setLoadingExhibition(false);
        }
      }
    };
    void load();

    return () => {
      active = false;
    };
  }, [exhibitionId]);

  const onAddFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '需要相机权限才能拍照添加展品。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      setImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const onAddFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '需要相册权限才能导入图片。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.9,
    });

    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setImageUris((prev) => [...prev, ...uris]);
    }
  };

  const onRemoveImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    if (coverIndex >= index && coverIndex > 0) {
      setCoverIndex(coverIndex - 1);
    }
  };

  const onYearChange = (nextText: string) => {
    setYearText(nextText);
    const parsed = parseYearText(nextText);
    if (parsed === null) {
      return;
    }
    const inferred = inferDynastyByYear(parsed);
    if (inferred) {
      setDynasty(inferred);
    }
  };

  const onDynastyChange = (nextDynasty: string) => {
    setDynasty(nextDynasty);
    if (!nextDynasty) {
      return;
    }
    const mappedYear = inferStartYearByDynasty(nextDynasty);
    if (mappedYear !== null) {
      setYearText(String(mappedYear));
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('无法保存', '展品名称为必填项。');
      return;
    }

    if (imageUris.length === 0) {
      Alert.alert('无法保存', '请至少保留一张图片。');
      return;
    }

    const parsedYear = parseYearText(yearText);

    setSubmitting(true);
    try {
      const persistedUris = await persistImagesAsync(imageUris);
      const safeCoverIndex = Math.max(0, Math.min(coverIndex, persistedUris.length - 1));

      await createArtifact({
        exhibitionId,
        title,
        description,
        year: parsedYear,
        dynasty: dynasty || null,
        isAssistant,
        imageUris: persistedUris,
        coverImageUri: persistedUris[safeCoverIndex],
      });

      navigation.goBack();
    } catch {
      Alert.alert('保存失败', '请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>添加展品</Text>
        <Text style={styles.subtitle}>{loadingExhibition ? '加载展览信息中...' : `所属展览: ${exhibitionTitle || '未知展览'}`}</Text>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>图片库 *</Text>
            <View style={styles.rowButtons}>
              <Pressable style={styles.secondaryButton} onPress={onAddFromCamera}>
                <Text style={styles.secondaryButtonText}>拍照</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={onAddFromLibrary}>
                <Text style={styles.secondaryButtonText}>相册导入</Text>
              </Pressable>
            </View>
          </View>

          {imageUris.length === 0 ? (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>尚未添加图片</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageList}>
              {imageUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.imageItem}>
                  <Pressable onPress={() => setCoverIndex(index)}>
                    <Image source={{ uri }} style={[styles.thumbnail, coverIndex === index && styles.coverSelected]} />
                  </Pressable>
                  <View style={styles.imageFooter}>
                    <Text style={styles.imageFooterText}>{coverIndex === index ? '封面' : '设为封面'}</Text>
                    <Pressable onPress={() => onRemoveImage(index)}>
                      <Text style={styles.removeText}>移除</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>展品名称 *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="例如: 青铜鼎"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>展品说明</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="可手动输入说明，后续可补充 OCR"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <View style={styles.ocrHintBox}>
            <Text style={styles.ocrHintText}>OCR 入口已预留，下一步接入离线识别引擎后可一键识别。</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>年代</Text>
          <TextInput
            style={styles.input}
            value={yearText}
            onChangeText={onYearChange}
            keyboardType="number-pad"
            placeholder="例如: 1368 或 -221"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.tip}>支持输入公元前年份，公元前 221 年请输入 -221</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>朝代</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={dynasty} onValueChange={onDynastyChange}>
              <Picker.Item label="未填写" value="" />
              {DYNASTY_OPTIONS.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>
          <Text style={styles.tip}>填写年代会自动匹配朝代，切换朝代会自动回填该朝代起始年份。</Text>
        </View>

        <View style={[styles.section, styles.switchRow]}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.label}>辅助展品</Text>
            <Text style={styles.tip}>开启后该展品不会出现在文物模式中。</Text>
          </View>
          <Switch value={isAssistant} onValueChange={setIsAssistant} thumbColor="#fff" trackColor={{ false: colors.border, true: colors.accentSoft }} />
        </View>

        <Pressable style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>保存展品</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  title: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: colors.cardMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  placeholderBox: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  imageList: {
    gap: 10,
  },
  imageItem: {
    width: 160,
    gap: 6,
  },
  thumbnail: {
    width: 160,
    height: 120,
    borderRadius: 10,
  },
  coverSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
  imageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
  },
  ocrHintBox: {
    backgroundColor: '#fff6e8',
    borderColor: '#efdbc0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ocrHintText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tip: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  switchTextWrap: {
    flex: 1,
    gap: 4,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
