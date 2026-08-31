import {createAction} from '@reduxjs/toolkit';

/**
 * services/ cannot import from features/ (`import/no-restricted-paths` in
 * eslint.config.js declares that zone, same as the one separating one
 * feature from another), but it needs to signal that the session expired on
 * receiving a 401. This neutral action creator inverts the dependency:
 * services dispatches it, sessionSlice listens for it.
 */
export const unauthorized = createAction('session/unauthorized');
