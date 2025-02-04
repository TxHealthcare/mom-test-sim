'use client'

import GoogleSignIn from '@/components/GoogleSignIn'
import Link from 'next/link'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { AuthButton } from '@/components/AuthHeader'

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="font-sans">
              <h1 className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-2xl font-bold text-transparent">
                Mom Test Simulator
              </h1>
            </Link>
            <div className="flex items-center gap-8">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="/#features"
                      className={navigationMenuTriggerStyle()}
                    >
                      Features
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white/80 px-8 py-12 shadow-xl ring-1 ring-gray-900/5 backdrop-blur-sm">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold text-gray-900">Welcome</h2>
              <p className="mt-4 text-gray-600">
                Sign in to practice customer interviews and get feedback
              </p>
            </div>
            <div className="space-y-8">
              <GoogleSignIn />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 