'use server';

import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export async function signIn(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}
