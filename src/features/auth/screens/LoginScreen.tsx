import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Button, Screen, TextField} from '@/components/ui';
import {useSession} from '@/services/session';
import {colors, spacing, typography} from '@/theme/tokens';

import {DEMO_EMAIL, DEMO_PASSWORD} from '../demoCredentials';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return errors;
}

/**
 * The network error and the credentials error are told apart by the shape of
 * fetchBaseQuery's error: a 401 carries `status: 401`; a network drop
 * carries `status: 'FETCH_ERROR'`. Showing "invalid credentials" for a
 * network problem is one of the most common UX bugs in mobile apps.
 */
function messageFor(error: unknown): string | null {
  if (error == null || typeof error !== 'object' || !('status' in error)) {
    return null;
  }
  const {status} = error as {status: unknown};
  if (status === 401) {
    return 'Incorrect email or password';
  }
  return "We couldn't connect. Check your connection and try again";
}

export function LoginScreen() {
  const {signIn, isSigningIn, error} = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const onSubmit = useCallback(() => {
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    // The session state is updated by sessionSlice once the mutation
    // resolves; here we just ignore the rejection, which is already
    // reflected in `error`.
    signIn(email.trim(), password).catch(() => {});
  }, [email, password, signIn]);

  const serverError = messageFor(error);

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text style={styles.title}>Catalog</Text>

        <TextField
          testID="login-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextField
          testID="login-password"
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          textContentType="password"
        />

        {serverError != null && (
          <Text testID="login-error" style={styles.serverError}>
            {serverError}
          </Text>
        )}

        <Button
          testID="login-submit"
          label="Sign in"
          onPress={onSubmit}
          loading={isSigningIn}
        />

        {__DEV__ && (
          <Text style={styles.hint}>
            Demo: {DEMO_EMAIL} / {DEMO_PASSWORD}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {gap: spacing.md},
  title: {...typography.title, color: colors.text, marginBottom: spacing.sm},
  serverError: {...typography.body, color: colors.danger},
  hint: {...typography.caption, color: colors.textMuted, textAlign: 'center'},
});
