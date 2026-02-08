'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// Mock Auth Service for now
export async function loginAction(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // TODO: Replace with real DB check
    if (email === 'admin@tea.com' && password === 'admin') {
        // Set session cookie
        const cookieStore = await cookies()
        cookieStore.set('session', 'mock-session-token', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        })

        // Redirect to dashboard
        redirect('/dashboard')
    }

    return {
        message: 'Invalid credentials',
    }
}

export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    redirect('/login')
}
