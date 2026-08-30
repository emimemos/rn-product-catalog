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
    errors.email = 'Ingresá un email válido';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return errors;
}

/**
 * El error de red y el de credenciales se distinguen por la forma del error de
 * fetchBaseQuery: un 401 trae `status: 401`; una caída de red trae
 * `status: 'FETCH_ERROR'`. Mostrar "credenciales inválidas" ante un problema de
 * red es uno de los bugs de UX más comunes en apps móviles.
 */
function messageFor(error: unknown): string | null {
  if (error == null || typeof error !== 'object' || !('status' in error)) {
    return null;
  }
  const {status} = error as {status: unknown};
  if (status === 401) {
    return 'Email o contraseña incorrectos';
  }
  return 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo';
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
    // El estado de sesión lo actualiza sessionSlice al resolverse la mutación; acá
    // solo se ignora el rechazo, que ya se refleja en `error`.
    signIn(email.trim(), password).catch(() => {});
  }, [email, password, signIn]);

  const serverError = messageFor(error);

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text style={styles.title}>Catálogo</Text>

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
          label="Contraseña"
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
          label="Ingresar"
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
