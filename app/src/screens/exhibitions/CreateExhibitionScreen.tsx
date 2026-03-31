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
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createExhibition } from '../../db';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { persistImageAsync } from '../../utils/imageStore';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

function formatCoordinateLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function CreateExhibitionScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [preface, setPreface] = useState('');
  const [epilogue, setEpilogue] = useState('');
  const [exhibitionType, setExhibitionType] = useState('');
  const [notes, setNotes] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const onPickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '需要相册权限才能选择封面图。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const onUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '需要定位权限以自动填充展览地点。');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLatitude = position.coords.latitude;
      const nextLongitude = position.coords.longitude;
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);

      const geocoded = await Location.reverseGeocodeAsync({ latitude: nextLatitude, longitude: nextLongitude });
      if (geocoded.length > 0) {
        const first = geocoded[0];
        const composed = [first.city, first.district, first.street, first.name].filter(Boolean).join(' ');
        setLocationName(composed || formatCoordinateLabel(nextLatitude, nextLongitude));
      } else {
        setLocationName(formatCoordinateLabel(nextLatitude, nextLongitude));
      }
    } catch {
      Alert.alert('定位失败', '暂时无法获取当前位置，你可以手动填写地点。');
    } finally {
      setLocating(false);
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('无法保存', '展览标题为必填项。');
      return;
    }
    if (!locationName.trim()) {
      Alert.alert('无法保存', '展览地点为必填项。');
      return;
    }

    setSubmitting(true);
    try {
      const persistedCover = coverUri ? await persistImageAsync(coverUri) : null;
      const exhibitionId = await createExhibition({
        title,
        locationName,
        latitude,
        longitude,
        preface,
        epilogue,
        exhibitionType,
        coverImageUri: persistedCover,
        notes,
      });
      navigation.replace('ExhibitionDetail', { exhibitionId });
    } catch {
      Alert.alert('保存失败', '请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>新建展览</Text>
        <Text style={styles.subtitle}>先记录展览基本信息，再继续添加展品和文字板。</Text>

        <View style={styles.section}>
          <Text style={styles.label}>展览标题 *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="例如: 千年遗珍特展"
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>展览地点 *</Text>
            <Pressable style={styles.secondaryButton} onPress={onUseCurrentLocation}>
              {locating ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.secondaryButtonText}>使用定位</Text>}
            </Pressable>
          </View>
          <TextInput
            value={locationName}
            onChangeText={setLocationName}
            placeholder="例如: 上海博物馆东馆"
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
          {latitude !== null && longitude !== null ? (
            <Text style={styles.tipText}>坐标: {formatCoordinateLabel(latitude, longitude)}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>展览类型</Text>
          <TextInput
            value={exhibitionType}
            onChangeText={setExhibitionType}
            placeholder="例如: 历史文物 / 艺术展"
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>封面图</Text>
            <Pressable style={styles.secondaryButton} onPress={onPickCover}>
              <Text style={styles.secondaryButtonText}>选择图片</Text>
            </Pressable>
          </View>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>未选择封面图</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>展览前言</Text>
          <TextInput
            value={preface}
            onChangeText={setPreface}
            placeholder="可手动输入，后续可补充 OCR 内容"
            multiline
            style={[styles.input, styles.multilineInput]}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>展览尾声</Text>
          <TextInput
            value={epilogue}
            onChangeText={setEpilogue}
            placeholder="记录总结或收获"
            multiline
            style={[styles.input, styles.multilineInput]}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>备注</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="其他你想记录的信息"
            multiline
            style={[styles.input, styles.multilineInput]}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <Pressable style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>保存并进入展览</Text>}
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
  },
  title: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  secondaryButton: {
    backgroundColor: colors.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  coverImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  placeholderBox: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
