import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const supabase = inject(SupabaseService).getClient();

  const { data } = await supabase.auth.getUser();

  if (data.user) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const publicGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const supabase = inject(SupabaseService).getClient();

  const { data } = await supabase.auth.getUser();

  if (data.user) {
    router.navigate(['/chat']);
    return false;
  }

  return true;
};
