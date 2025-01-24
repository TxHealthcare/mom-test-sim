'use client'

import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function GoogleSignIn() {
  const supabase = createClient()
  const router = useRouter()
  const buttonRef = useRef<HTMLDivElement>(null)

  const initializeAndRender = () => {
    if (!window.google?.accounts?.id || !buttonRef.current) return
    
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: async (response) => {
        try {
          const { error: signInError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          })
          if (signInError) throw signInError
          router.push('/')
        } catch (err) {
          console.error('Sign in error:', err)
        }
      },
      use_fedcm_for_prompt: false,
      auto_select: false,
    })

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'center',
      width: '300',
    })
  }

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/')
    }
    checkSession()
  }, [router])

  useEffect(() => {
    const handleScriptLoad = () => {
      if (window.google?.accounts?.id) {
        initializeAndRender()
      }
    }

    window.addEventListener('google-loaded', handleScriptLoad)
    handleScriptLoad()

    return () => {
      window.removeEventListener('google-loaded', handleScriptLoad)
    }
  }, [])

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event('google-loaded'))
        }}
      />
      <div className="flex items-center justify-center w-full">
        <div 
          ref={buttonRef}
          className="h-[40px] w-[300px]"
        />
      </div>
    </>
  )
}