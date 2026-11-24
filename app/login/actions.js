'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, makeToken, passwordOk } from '@/lib/auth';

export async function login(formData) {
  if (!passwordOk(formData.get('password'))) redirect('/login?err=1');
  cookies().set(COOKIE, makeToken(14), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 14 * 86400,
    secure: process.env.NODE_ENV === 'production',
  });
  redirect('/');
}

export async function logout() {
  cookies().delete(COOKIE);
  redirect('/login');
}
