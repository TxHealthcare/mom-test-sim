'use client';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { AuthButton } from '@/components/AuthHeader';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function NavigationHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
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
                {user && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="/dashboard"
                      className={navigationMenuTriggerStyle()}
                    >
                      Dashboard
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
} 