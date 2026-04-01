import { StyleSheet, Text, View } from 'react-native';

export default function ExhibitionDetail() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>展览详情页占位</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4efe2',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2a241b',
  },
});
