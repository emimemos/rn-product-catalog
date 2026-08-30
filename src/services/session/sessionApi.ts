import {baseApi} from '@/services/api/baseApi';
import type {LoginRequest, LoginResponse, User} from '@/services/api/types';

export const sessionApi = baseApi.injectEndpoints({
  endpoints: build => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: body => ({url: '/auth/login', method: 'POST', body}),
    }),
    me: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
  }),
});

export const {useLoginMutation, useMeQuery} = sessionApi;
