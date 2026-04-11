import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import {
  createExhibition,
  getExhibitionById,
  updateExhibition,
  deleteExhibition,
} from '../db';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ExhibitionEdit'>;

export default function ExhibitionEditScreen({ route, navigation }: Props) {
  const exhibitionId = route.params?.exhibitionId;
  const fromArtifactEdit = route.params?.fromArtifactEdit === true;
  const isEdit = exhibitionId !== undefined;

  const [name, setName] = useState('');
  const [museum, setMuseum] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (isEdit && exhibitionId != null) {
      const ex = getExhibitionById(exhibitionId);
      if (ex) {
        setName(ex.name);
        setMuseum(ex.museum);
        setDescription(ex.description ?? '');
        setVisitDate(ex.visit_date);
      }
    }
  }, [exhibitionId, isEdit]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? '编辑展览' : '新建展览',
      headerRight: () => (
        <TouchableOpacity onPress={handleSave}>
          <Text style={{ color: Colors.accent, fontSize: 16, fontWeight: '600' }}>保存</Text>
        </TouchableOpacity>
      ),
    });
  });

  function validateDate(str: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('提示', '请输入展览名称');
      return;
    }
    if (!museum.trim()) {
      Alert.alert('提示', '请输入博物馆名称');
      return;
    }
    if (!validateDate(visitDate)) {
      Alert.alert('提示', '参观日期格式不正确（YYYY-MM-DD）');
      return;
    }

    if (isEdit && exhibitionId != null) {
      updateExhibition(exhibitionId, {
        name: name.trim(),
        museum: museum.trim(),
        visit_date: visitDate,
        description: description.trim() || null,
      });
    } else {
      createExhibition({
        name: name.trim(),
        museum: museum.trim(),
        visit_date: visitDate,
        description: description.trim() || null,
      });
    }

    navigation.goBack();
  }

  function handleDeleteExhibition() {
    Alert.alert(
      '确认删除',
      '删除后该展览下的所有文物也将一并删除，此操作不可撤销',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteExhibition(exhibitionId!);
            // 返回到展览列表（MainTabs）
            navigation.navigate('MainTabs');
          },
        },
      ],
    );
  }

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
      <Text style={styles.label}>展览名称 *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="例如：青铜时代特展"
        autoFocus={!isEdit}
      />

      <Text style={styles.label}>博物馆 *</Text>
      <TextInput
        style={styles.input}
        value={museum}
        onChangeText={setMuseum}
        placeholder="例如：国家博物馆"
      />

      <Text style={styles.label}>参观日期 *</Text>
      <TouchableOpacity
        style={[styles.input, styles.pickerBtn]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.pickerText}>{visitDate}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={(() => {
            const d = new Date(visitDate);
            return isNaN(d.getTime()) ? new Date() : d;
          })()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          locale="zh-CN"
          onChange={(_event: any, selectedDate?: Date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const d = String(selectedDate.getDate()).padStart(2, '0');
              setVisitDate(`${y}-${m}-${d}`);
            }
          }}
        />
      )}

      <Text style={styles.label}>展览说明</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="选填"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {isEdit && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteExhibition}>
          <Text style={styles.deleteBtnText}>删除展览</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg },
  label: { fontSize: FontSize.body, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: Colors.inputBg,
  },
  pickerBtn: { justifyContent: 'center' },
  pickerText: { fontSize: 15, color: Colors.text },
  multiline: { minHeight: 100 },
  deleteBtn: {
    marginTop: 40,
    marginBottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.danger,
  },
  deleteBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
