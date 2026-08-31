import {baseApi} from '@/services/api/baseApi';
import type {LoginRequest, LoginResponse} from '@/services/api/types';

export const sessionApi = baseApi.injectEndpoints({
  endpoints: build => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: body => ({url: '/auth/login', method: 'POST', body}),
    }),
  }),
});

export const {useLoginMutation} = sessionApi;
