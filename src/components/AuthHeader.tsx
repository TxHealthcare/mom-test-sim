'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

export function AuthButton() {
  const { user } = useAuth()
  const supabase = createClient()
  const pathname = usePathname()

  // Hide button on login page
  if (pathname === '/login') return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/' // Redirect to home after sign out
  }

  if (user) {
    return (
      <Button 
        variant="outline" 
        className="font-medium" 
        onClick={handleSignOut}
      >
        Sign Out
      </Button>
    )
  }

  return (
    <Button asChild variant="outline" className="font-medium">
      <Link href="/login">
        Log In
      </Link>
    </Button>
  )
} 