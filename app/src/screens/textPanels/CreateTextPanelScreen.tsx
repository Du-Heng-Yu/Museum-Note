import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { createTextPanel } from '../../db';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { persistImageAsync } from '../../utils/imageStore';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type CreateTextPanelRoute = RouteProp<RootStackParamList, 'CreateTextPanel'>;

export function CreateTextPanelScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<CreateTextPanelRoute>();
  const exhibitionId = route.params.exhibitionId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onAddImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '需要相机权限才能拍照添加文字板。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onAddImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '需要相册权限才能导入图片。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('无法保存', '文字板标题为必填项。');
      return;
    }

    setSubmitting(true);
    try {
      const persistedImage = imageUri ? await persistImageAsync(imageUri) : null;
      await createTextPanel({
        exhibitionId,
        title,
        description,
        imageUri: persistedImage,
      });

      navigation.goBack();
    } catch {
      Alert.alert('保存失败', '请稍后再试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>添加文字板</Text>
        <Text style={styles.subtitle}>记录章节说明、导览文字或其他非实物信息。</Text>

        <View style={styles.section}>
          <Text style={styles.label}>文字板标题 *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="例如: 第一单元导语"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>文字板说明</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="可手动输入，后续接入 OCR 可自动识别图片文字"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>文字板照片</Text>
            <View style={styles.rowButtons}>
              <Pressable style={styles.secondaryButton} onPress={onAddImageFromCamera}>
                <Text style={styles.secondaryButtonText}>拍照</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={onAddImageFromLibrary}>
                <Text style={styles.secondaryButtonText}>相册导入</Text>
              </Pressable>
            </View>
          </View>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>未添加图片</Text>
            </View>
          )}
        </View>

        <Pressable style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>保存文字板</Text>}
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
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
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
    minHeight: 120,
    textAlignVertical: 'top',
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
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 190,
    borderRadius: 10,
  },
  placeholderBox: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  placeholderText: {
    color: colors.textSecondary,
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
