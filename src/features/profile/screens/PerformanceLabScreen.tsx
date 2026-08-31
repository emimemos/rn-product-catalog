import React, {memo, useCallback, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {Screen} from '@/components/ui';
import {colors, radius, spacing, typography} from '@/theme/tokens';

const ROWS = Array.from({length: 8}, (_, index) => ({
  id: index,
  label: `Fila ${index + 1}`,
}));

interface RowProps {
  label: string;
  index: number;
  variant: 'plain' | 'memo';
  onPress: (index: number) => void;
}

/**
 * El contador vive en un ref que se incrementa durante el render. Es impuro a
 * propósito: es la única forma de contar renders sin provocar otro render.
 * En StrictMode con doble render los números se duplicarían — vale la pena
 * saberlo y decirlo antes de que lo pregunten.
 */
function Row({label, index, variant, onPress}: RowProps) {
  const renders = useRef(0);
  renders.current += 1;

  return (
    <View style={styles.row} onTouchEnd={() => onPress(index)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        testID={`lab-render-count-${variant}-${index}`}
        style={styles.badge}>
        {renders.current}
      </Text>
    </View>
  );
}

const MemoRow = memo(Row);

export function PerformanceLabScreen() {
  const [text, setText] = useState('');
  const parentRenders = useRef(0);
  parentRenders.current += 1;

  // Columna izquierda: handler recreado en cada render. `Row` no está memoizada,
  // así que re-renderiza siempre.
  const onPressPlain = (_index: number) => {};

  // Columna derecha: handler estable + fila memoizada. Eso es todo lo que hace
  // falta; `ROWS` es una constante de módulo y su identidad ya no puede
  // cambiar, así que envolverla en un `useMemo` no la haría más estable —
  // sería exactamente la memoización refleja que esta pantalla existe para
  // desarmar.
  const onPressMemo = useCallback((_index: number) => {}, []);

  return (
    <Screen>
      <View style={styles.header}>
        <TextInput
          testID="lab-input"
          placeholder="Escribí para forzar renders del padre"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <Text style={styles.caption}>
          Renders del padre:{' '}
          <Text testID="lab-parent-renders" style={styles.badgeInline}>
            {parentRenders.current}
          </Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.columns} horizontal={false}>
        <View style={styles.columnsRow}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Sin memoizar</Text>
            {ROWS.map(row => (
              <Row
                key={row.id}
                index={row.id}
                label={row.label}
                variant="plain"
                onPress={onPressPlain}
              />
            ))}
          </View>

          <View style={styles.column}>
            <Text style={styles.columnTitle}>Memoizada</Text>
            {ROWS.map(row => (
              <MemoRow
                key={row.id}
                index={row.id}
                label={row.label}
                variant="memo"
                onPress={onPressMemo}
              />
            ))}
          </View>
        </View>

        <Text style={styles.explainer}>
          Acá las filas se mapean directas, sin `FlatList` de por medio: la
          estabilidad de las props —`onPress` incluido— es lo único que decide
          si una fila memoizada re-renderiza. Por eso la columna izquierda sube
          y la derecha se queda quieta. Ese resultado no se generaliza: dentro
          del `FlatList` del catálogo medimos que `useCallback` en `renderItem`
          no cambiaba nada (10 renders con y sin memoizar al tipear), porque la
          celda `PureComponent` de `FlatList` ya bloquea el re-render por props
          iguales; ahí lo que sí importaba era memoizar el `onPress` de cada
          fila.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {padding: spacing.md, gap: spacing.sm},
  input: {
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  caption: {...typography.caption, color: colors.textMuted},
  columns: {padding: spacing.md, gap: spacing.lg},
  columnsRow: {flexDirection: 'row', gap: spacing.md},
  column: {flex: 1, gap: spacing.sm},
  columnTitle: {...typography.heading, color: colors.text},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  rowLabel: {...typography.caption, color: colors.text},
  badge: {...typography.caption, color: colors.primary, fontWeight: '700'},
  badgeInline: {color: colors.primary, fontWeight: '700'},
  explainer: {...typography.caption, color: colors.textMuted, lineHeight: 19},
});
