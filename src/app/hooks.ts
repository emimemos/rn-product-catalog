import {useDispatch, useSelector} from 'react-redux';

import type {AppDispatch, RootState} from './store';

/** Raw `useDispatch`/`useSelector` are never used in the app: always these. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
