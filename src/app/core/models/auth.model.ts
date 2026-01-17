import {
  User as SupabaseUser,
  Session as SupabaseSession,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

export interface User extends SupabaseUser {}

export interface Session extends SupabaseSession {}

export interface AuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: Error | null;
}

export interface UserResponse {
  data: {
    user: User | null;
  };
  error: Error | null;
}

export interface SignOutResponse {
  error: Error | null;
}

export interface GenericResponse {
  data: {};
  error: Error | null;
}

export interface Profile {
  id: string;
  username: string;
}

export type ProfileResponse = PostgrestSingleResponse<Profile>;
