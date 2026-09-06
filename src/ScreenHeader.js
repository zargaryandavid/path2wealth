import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from './theme';

export default function ScreenHeader({ title, onClose, right = null }) {
  return (
    <View style={styles.head}>
      <TouchableOpacity onPress={onClose} style={styles.btn}><Text style={styles.back}>‹</Text></TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.btn}>{right}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  btn: { minWidth: 44, paddingVertical: 6, alignItems: 'flex-start' },
  back: { fontSize: 30, color: COLORS.text, marginTop: -4 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
});
