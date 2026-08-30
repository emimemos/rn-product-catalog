import {useDispatch, useSelector} from 'react-redux';

import type {AppDispatch, RootState} from './store';

/** Nunca se usa `useDispatch`/`useSelector` crudos en la app: siempre estos. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
