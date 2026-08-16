'use server';

import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export async function signUp(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}
