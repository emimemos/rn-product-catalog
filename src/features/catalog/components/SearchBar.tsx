import React, {useEffect, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';

import {useAppDispatch} from '@/app/hooks';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {queryChanged} from '../catalogSlice';
import {useDebouncedValue} from '../hooks/useDebouncedValue';

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchBar() {
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    dispatch(queryChanged(debounced));
  }, [debounced, dispatch]);

  return (
    <View style={styles.container}>
      <TextInput
        testID="search-input"
        accessibilityLabel="Buscar productos"
        placeholder="Buscar productos"
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {paddingHorizontal: spacing.md, paddingTop: spacing.sm},
  input: {
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
});
