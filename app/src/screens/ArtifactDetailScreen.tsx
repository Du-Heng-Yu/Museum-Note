import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Artifact, Exhibition } from '../types';
import { getArtifactById, deleteArtifact, getExhibitionById } from '../db';
import { parseJsonArray } from '../utils/json';
import { DYNASTIES } from '../constants/dynasties';
import { FONT_KAITI } from '../constants/fonts';
import { Radius, Spacing, FontSize } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ArtifactDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SECTION_FLEX = 2;
const INFO_SECTION_FLEX = 1;
const DEFAULT_PHOTO_HEIGHT = SCREEN_WIDTH * 0.78;

function formatYear(year: number): string {
  if (year < 0) return `BC${Math.abs(year)}`;
  return `${year}`;
}

export default function ArtifactDetailScreen({ route, navigation }: Props) {
  const { artifactId } = route.params;
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [photoSizes, setPhotoSizes] = useState<Record<number, { width: number; height: number }>>({});
  const [infoViewportHeight, setInfoViewportHeight] = useState(0);
  const [isInfoScrollable, setIsInfoScrollable] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const a = getArtifactById(artifactId);
      setArtifact(a);
      if (a) {
        setExhibition(getExhibitionById(a.exhibition_id));
      } else {
        setExhibition(null);
      }
    }, [artifactId]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: '#000000' },
      headerShadowVisible: false,
      headerTintColor: '#e2c79d',
      headerTitleStyle: {
        color: '#e2c79d',
        fontFamily: FONT_KAITI,
        fontSize: 18,
      },
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ArtifactEdit', { artifactId })}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: '#c0392b' }]}>删除</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, artifactId]);

  function handleDelete() {
    Alert.alert('确认删除', '删除后文物记录及照片将无法恢复，确认删除？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteArtifact(artifactId);
          navigation.goBack();
        },
      },
    ]);
  }

  const dynastyRangeText = useMemo(() => {
    if (!artifact) return '';

    const matchedDynasty = DYNASTIES.find((d) => d.name === artifact.dynasty);
    if (matchedDynasty) {
      return `${formatYear(matchedDynasty.startYear)}-${formatYear(matchedDynasty.endYear)}`;
    }

    return formatYear(artifact.year);
  }, [artifact]);

  const handleInfoLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const nextHeight = event.nativeEvent.layout.height;
    setInfoViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const handleInfoContentSizeChange = useCallback(
    (_contentWidth: number, contentHeight: number) => {
      if (infoViewportHeight <= 0) return;

      const nextScrollable = contentHeight > infoViewportHeight + 1;
      setIsInfoScrollable((prev) =>
        prev === nextScrollable ? prev : nextScrollable,
      );
    },
    [infoViewportHeight],
  );

  if (!artifact) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>文物不存在或已被删除</Text>
      </View>
    );
  }

  const photos = parseJsonArray(artifact.photos);
  const isSinglePhoto = photos.length === 1;

  return (
    <View style={styles.container}>
      <View style={styles.photoSection}>
        {photos.length > 0 ? (
          <ScrollView
            style={styles.photoScroller}
            contentContainerStyle={[
              styles.photoScrollerContent,
              isSinglePhoto ? styles.photoScrollerSingle : styles.photoScrollerMultiple,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {photos.map((uri, i) => (
              <Image
                key={`${uri}-${i}`}
                source={{ uri }}
                style={[
                  styles.photo,
                  {
                    width: photoSizes[i]
                      ? Math.min(SCREEN_WIDTH, photoSizes[i].width)
                      : SCREEN_WIDTH,
                    height: photoSizes[i]
                      ? photoSizes[i].height *
                        (Math.min(SCREEN_WIDTH, photoSizes[i].width) /
                          photoSizes[i].width)
                      : DEFAULT_PHOTO_HEIGHT,
                  },
                ]}
                resizeMode="contain"
                onLoad={(event) => {
                  const { width, height } = event.nativeEvent.source;
                  if (width > 0 && height > 0) {
                    setPhotoSizes((prev) => {
                      const existing = prev[i];
                      if (
                        existing &&
                        existing.width === width &&
                        existing.height === height
                      ) {
                        return prev;
                      }
                      return { ...prev, [i]: { width, height } };
                    });
                  }
                }}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyPhotoArea}>
            <Text style={styles.emptyPhotoText}>暂无照片</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.92)', '#000000']}
          style={styles.infoTopFade}
        />

        <ScrollView
          style={styles.infoScroll}
          contentContainerStyle={styles.infoContent}
          onLayout={handleInfoLayout}
          onContentSizeChange={handleInfoContentSizeChange}
          scrollEnabled={isInfoScrollable}
          bounces={isInfoScrollable}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={isInfoScrollable}
        >
          <Text style={styles.artifactName}>{artifact.name}</Text>

          <Text style={styles.metaLine}>
            年代：{artifact.dynasty}（{dynastyRangeText}）
          </Text>

          {artifact.description ? (
            <Text style={styles.descriptionText}>文物介绍：{artifact.description}</Text>
          ) : null}

          {exhibition && (
            <TouchableOpacity
              style={styles.exhibitionCard}
              activeOpacity={0.78}
              onPress={() =>
                navigation.navigate('ExhibitionDetail', {
                  exhibitionId: exhibition.id,
                })
              }
            >
              <View style={styles.exhibitionTextWrap}>
                <Text style={styles.exhibitionLabel}>展览信息</Text>
                <Text style={styles.exhibitionName} numberOfLines={1}>
                  {exhibition.name}
                </Text>
                <Text style={styles.exhibitionMuseum} numberOfLines={1}>
                  {exhibition.museum}
                </Text>
              </View>

              <View style={styles.exhibitionArrowWrap}>
                <View style={styles.exhibitionChevronIcon} />
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  emptyText: { fontSize: 16, color: '#8f8f8f' },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  headerBtn: { paddingHorizontal: Spacing.xs },
  headerBtnText: { fontSize: 16, fontWeight: '600', color: '#e2c79d' },

  // 照片区（2/3）
  photoSection: {
    flex: PHOTO_SECTION_FLEX,
    backgroundColor: '#000000',
  },
  photoScroller: {
    flex: 1,
  },
  photoScrollerContent: {
    alignItems: 'center',
  },
  photoScrollerSingle: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  photoScrollerMultiple: {},
  photo: {
    alignSelf: 'center',
    marginBottom: 0,
    backgroundColor: '#000000',
  },
  emptyPhotoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPhotoText: {
    fontSize: FontSize.body,
    color: '#8f8f8f',
    fontFamily: FONT_KAITI,
  },

  // 信息区（1/3）
  infoSection: {
    flex: INFO_SECTION_FLEX,
    backgroundColor: '#000000',
    position: 'relative',
  },
  infoTopFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -56,
    height: 56,
  },
  infoScroll: { flex: 1 },
  infoContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 0,
    paddingBottom: Spacing.lg,
  },
  artifactName: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: '#e2c79d',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: Spacing.sm,
  },
  metaLine: {
    fontSize: 17,
    color: '#d7c29b',
    fontFamily: FONT_KAITI,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  descriptionText: {
    fontSize: 15,
    color: '#ddd5c5',
    lineHeight: 24,
    fontFamily: FONT_KAITI,
    marginBottom: Spacing.md,
  },

  exhibitionCard: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(226,199,157,0.45)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  exhibitionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  exhibitionLabel: {
    fontSize: 12,
    color: '#9f9077',
    fontFamily: FONT_KAITI,
    marginBottom: 2,
  },
  exhibitionName: {
    fontSize: 19,
    color: '#e2c79d',
    fontFamily: FONT_KAITI,
  },
  exhibitionMuseum: {
    marginTop: 1,
    fontSize: 13,
    color: '#b8aa92',
    fontFamily: FONT_KAITI,
  },
  exhibitionArrowWrap: {
    width: 12,
    marginLeft: Spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  exhibitionChevronIcon: {
    width: 8,
    height: 8,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#d7c29b',
    transform: [{ rotate: '225deg' }],
  },
});
