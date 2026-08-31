import React, {memo, useCallback, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {Screen} from '@/components/ui';
import {colors, radius, spacing, typography} from '@/theme/tokens';

const ROWS = Array.from({length: 8}, (_, index) => ({
  id: index,
  label: `Row ${index + 1}`,
}));

interface RowProps {
  label: string;
  index: number;
  variant: 'plain' | 'memo';
  onPress: (index: number) => void;
}

/**
 * The counter lives in a ref that's incremented during render. It's impure
 * on purpose: it's the only way to count renders without causing another
 * render. Under StrictMode with double rendering the numbers would double —
 * worth knowing and saying before someone asks.
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

  // Left column: handler recreated on every render. `Row` isn't memoized,
  // so it always re-renders.
  const onPressPlain = (_index: number) => {};

  // Right column: stable handler + memoized row. That's all it takes;
  // `ROWS` is a module-level constant and its identity can no longer
  // change, so wrapping it in a `useMemo` wouldn't make it any more
  // stable — that would be exactly the reflexive memoization this screen
  // exists to dismantle.
  const onPressMemo = useCallback((_index: number) => {}, []);

  return (
    <Screen>
      <View style={styles.header}>
        <TextInput
          testID="lab-input"
          placeholder="Type to force parent re-renders"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <Text style={styles.caption}>
          Parent renders:{' '}
          <Text testID="lab-parent-renders" style={styles.badgeInline}>
            {parentRenders.current}
          </Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.columns} horizontal={false}>
        <View style={styles.columnsRow}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Not memoized</Text>
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
            <Text style={styles.columnTitle}>Memoized</Text>
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
          Here the rows are mapped directly, with no `FlatList` in between: the
          stability of the props — `onPress` included — is the only thing that
          decides whether a memoized row re-renders. That's why the left column
          climbs and the right one stays still. That result doesn't generalize:
          inside the catalog's `FlatList` we measured that `useCallback` on
          `renderItem` changed nothing (10 renders with and without memoizing
          while typing), because `FlatList`'s `PureComponent` cell already
          blocks the re-render on equal props; there, what did matter was
          memoizing each row's `onPress`.
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
