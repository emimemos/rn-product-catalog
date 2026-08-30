import {useCallback} from 'react';

import {useAppDispatch, useAppSelector} from '@/app/hooks';

import {useLoginMutation} from './sessionApi';
import {signOut as signOutThunk} from './sessionSlice';

export function useSession() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(state => state.session.status);
  const user = useAppSelector(state => state.session.user);
  const [login, {isLoading: isSigningIn, error}] = useLoginMutation();

  const signIn = useCallback(
    (email: string, password: string) => login({email, password}).unwrap(),
    [login],
  );

  const signOut = useCallback(() => {
    dispatch(signOutThunk());
  }, [dispatch]);

  return {status, user, signIn, signOut, isSigningIn, error};
}
