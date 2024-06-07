// app/login/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import ky from 'ky'

export async function generateJWT(ethereumAddress: string, signature: string, nonce: string) {
  try {
    const response = await ky.post('https://supabase-auth.zach-greco.workers.dev/jwt', {
      json: { ethereumAddress, signature, nonce },
    }).json<{ token: string }>()

    if (!response.token) {
      throw new Error('Failed to generate JWT')
    }

    // Set the JWT cookie
    const headers = new Headers()
    headers.append('Set-Cookie', `userJWT=${response.token}; Path=/`)

    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error) {
    redirect('/error')
  }
}
