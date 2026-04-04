import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  createExhibition,
  getAllExhibitions,
  getExhibitionById,
  updateExhibition,
  deleteExhibition,
  getExhibitionArtifactCount,
  createArtifact,
  getAllArtifacts,
  getArtifactById,
  getArtifactsByExhibitionId,
  updateArtifact,
  deleteArtifact,
} from '../db';
import { toJsonString, parseJsonArray } from '../utils';
import { ensurePhotosDirectory } from '../utils/photo';

export default function DevTestScreen() {
  const [logs, setLogs] = useState<string[]>([]);

  function log(msg: string) {
    console.log('[DevTest]', msg);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  function clearLogs() {
    setLogs([]);
  }

  /** 完整测试流程 */
  async function runFullTest() {
    clearLogs();
    try {
      // 0. 确保照片目录
      await ensurePhotosDirectory();
      log('✅ 照片目录已确保存在');

      // 1. 创建展览
      const ex1 = createExhibition({
        name: '青铜时代特展',
        museum: '国家博物馆',
        visit_date: '2026-04-04',
        description: '测试展览描述',
      });
      log(`✅ 创建展览: id=${ex1.id}, name=${ex1.name}, created_at=${ex1.created_at}`);

      const ex2 = createExhibition({
        name: '瓷器精品展',
        museum: '故宫博物院',
        visit_date: '2026-03-15',
        description: null,
      });
      log(`✅ 创建展览2: id=${ex2.id}, name=${ex2.name}`);

      // 2. 查询全部展览
      const allEx = getAllExhibitions();
      log(`✅ 查询全部展览: ${allEx.length} 条, 排序: [${allEx.map((e) => e.name).join(', ')}]`);

      // 3. 查询单条展览
      const exById = getExhibitionById(ex1.id);
      log(`✅ 按ID查展览: ${exById?.name ?? 'null'}`);

      // 4. 展览文物数量（应为0）
      const count0 = getExhibitionArtifactCount(ex1.id);
      log(`✅ 展览1文物数量: ${count0}`);

      // 5. 创建文物（关联展览1）
      const tags = toJsonString(['青铜器', '礼器']);
      const a1 = createArtifact({
        name: '后母戊鼎',
        year: -1300,
        dynasty: '商',
        exhibition_id: ex1.id,
        photos: null,
        description: '商代青铜重器',
        note: '非常震撼',
        tags: tags,
      });
      log(`✅ 创建文物1: id=${a1.id}, name=${a1.name}, year=${a1.year}, tags=${a1.tags}`);

      const a2 = createArtifact({
        name: '利簋',
        year: -1046,
        dynasty: '西周',
        exhibition_id: ex1.id,
        photos: toJsonString(['/fake/photo1.jpg', '/fake/photo2.jpg']),
        description: '武王伐纣的实物证据',
        note: null,
        tags: toJsonString(['青铜器']),
      });
      log(`✅ 创建文物2: id=${a2.id}, name=${a2.name}, year=${a2.year}`);

      const a3 = createArtifact({
        name: '汝窑天青釉洗',
        year: 1100,
        dynasty: '北宋',
        exhibition_id: ex2.id,
        photos: null,
        description: null,
        note: null,
        tags: toJsonString(['瓷器', '汝窑']),
      });
      log(`✅ 创建文物3: id=${a3.id}, name=${a3.name}, exhibition_id=${a3.exhibition_id}`);

      // 6. 查询全部文物（按 year ASC）
      const allArt = getAllArtifacts();
      log(`✅ 查询全部文物: ${allArt.length} 条, 年份排序: [${allArt.map((a) => `${a.name}(${a.year})`).join(', ')}]`);

      // 7. 按展览查询文物
      const ex1Arts = getArtifactsByExhibitionId(ex1.id);
      log(`✅ 展览1文物: ${ex1Arts.length} 条: [${ex1Arts.map((a) => a.name).join(', ')}]`);

      // 8. 展览文物数量（应为2）
      const count2 = getExhibitionArtifactCount(ex1.id);
      log(`✅ 展览1文物数量: ${count2}`);

      // 9. 更新展览
      updateExhibition(ex1.id, { name: '青铜时代特展（已更新）' });
      const exUpdated = getExhibitionById(ex1.id);
      log(`✅ 更新展览: name=${exUpdated?.name}, museum=${exUpdated?.museum}（museum 未变）`);

      // 10. 更新文物
      updateArtifact(a1.id, { note: '更新后的备注', year: -1250 });
      const a1Updated = getArtifactById(a1.id);
      log(`✅ 更新文物: note=${a1Updated?.note}, year=${a1Updated?.year}, name=${a1Updated?.name}（name 未变）`);

      // 11. 解析 JSON 字段
      const parsedTags = parseJsonArray(a1Updated?.tags ?? null);
      log(`✅ 解析tags: [${parsedTags.join(', ')}]`);
      const parsedPhotos = parseJsonArray(a2.photos);
      log(`✅ 解析photos: [${parsedPhotos.join(', ')}]`);
      const parsedNull = parseJsonArray(null);
      log(`✅ 解析null: [${parsedNull.join(', ')}] (应为空)`);

      // 12. 删除单条文物
      await deleteArtifact(a2.id);
      const a2Deleted = getArtifactById(a2.id);
      log(`✅ 删除文物2: 查询结果=${a2Deleted === null ? 'null（已删除）' : '仍存在！'}`);

      // 13. 级联删除展览1（应一并删除文物1）
      await deleteExhibition(ex1.id);
      const exDeleted = getExhibitionById(ex1.id);
      const ex1ArtsAfter = getArtifactsByExhibitionId(ex1.id);
      log(`✅ 级联删除展览1: 展览=${exDeleted === null ? 'null' : '仍存在！'}, 剩余文物=${ex1ArtsAfter.length}`);

      // 14. 确认展览2和文物3还在
      const ex2Still = getExhibitionById(ex2.id);
      const a3Still = getArtifactById(a3.id);
      log(`✅ 展览2: ${ex2Still?.name ?? 'null'}, 文物3: ${a3Still?.name ?? 'null'}（应仍存在）`);

      // 15. 清理：删除展览2
      await deleteExhibition(ex2.id);
      const finalAll = getAllArtifacts();
      const finalEx = getAllExhibitions();
      log(`✅ 最终清理: 展览=${finalEx.length}条, 文物=${finalAll.length}条（应都为0）`);

      log('🎉 全部测试通过！');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`❌ 测试失败: ${msg}`);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>数据层测试</Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btn} onPress={runFullTest}>
            <Text style={styles.btnText}>运行完整测试</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnClear]}
            onPress={clearLogs}
          >
            <Text style={styles.btnText}>清除日志</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.logArea}>
        {logs.map((line, i) => (
          <Text key={i} style={styles.logLine}>
            {line}
          </Text>
        ))}
        {logs.length === 0 && (
          <Text style={styles.hint}>点击"运行完整测试"开始验收</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, paddingTop: 8, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 12 },
  btn: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnClear: { backgroundColor: '#999' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  logArea: { flex: 1, padding: 12 },
  logLine: { fontSize: 12, lineHeight: 20, fontFamily: 'monospace', color: '#333' },
  hint: { fontSize: 14, color: '#aaa', textAlign: 'center', marginTop: 40 },
});
