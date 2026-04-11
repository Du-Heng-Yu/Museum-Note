import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { saveCameraPhotoToAlbum } from '../utils/photo';
import { setPendingPhoto } from '../utils/pendingPhoto';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_HEIGHT = (SCREEN_WIDTH / 3) * 4; // 4:3

export default function CameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Camera'>>();
  const fromEdit = route.params?.fromEdit === true;

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [taking, setTaking] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>需要相机权限才能拍照</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        setCapturedUri(photo.uri);
      }
    } catch (e) {
      Alert.alert('拍照失败', String(e));
    } finally {
      setTaking(false);
    }
  }

  function handleRetake() {
    setCapturedUri(null);
  }

  async function handleConfirm() {
    if (!capturedUri || confirming) return;
    setConfirming(true);
    try {
      try {
        await saveCameraPhotoToAlbum(capturedUri);
      } catch (e) {
        console.warn('[Camera] 保存到相册失败:', e);
      }
      if (fromEdit) {
        setPendingPhoto(capturedUri);
        navigation.goBack();
      } else {
        navigation.replace('ArtifactEdit', { photos: [capturedUri] });
      }
    } catch (e) {
      Alert.alert('操作失败', String(e));
      setConfirming(false);
    }
  }

  // 预览确认界面
  if (capturedUri) {
    return (
      <View style={styles.container}>
        <View style={styles.previewArea}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.textBtn} onPress={handleRetake}>
            <Text style={styles.textBtnLabel}>重拍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, confirming && styles.shutterDisabled]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            <Text style={styles.confirmBtnText}>使用照片</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 拍摄界面
  return (
    <View style={styles.container}>
      <View style={styles.cameraArea}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash="auto"
          {...(Platform.OS === 'android' ? { ratio: '4:3' } : {})}
        />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.textBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.textBtnLabel}>取消</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutterOuter, taking && styles.shutterDisabled]}
          onPress={takePicture}
          activeOpacity={0.7}
          disabled={taking}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ width: 70 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: SCREEN_WIDTH,
    height: PREVIEW_HEIGHT,
  },
  previewArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: PREVIEW_HEIGHT,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  permText: { color: '#fff', fontSize: 16, marginBottom: 16 },
  permBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4A90D9',
    borderRadius: 8,
  },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  textBtn: { width: 70, alignItems: 'center' },
  textBtnLabel: { color: '#fff', fontSize: 17 },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  confirmBtn: {
    width: 70,
    alignItems: 'center',
    backgroundColor: '#4A90D9',
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
