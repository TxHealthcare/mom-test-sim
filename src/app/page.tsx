"use client";

import React from 'react';
import { ArrowRight, Check, MessageCircle, BarChart3, Settings2 } from 'lucide-react';
import RealtimeChat from '../components/RealtimeChat'
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { AuthButton } from '@/components/AuthHeader'

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-2xl font-bold text-transparent">
              Mom Test Simulator
            </h1>
            <div className="flex items-center gap-8">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#features"
                      className={navigationMenuTriggerStyle()}
                    >
                      Features
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#about"
                      className={navigationMenuTriggerStyle()}
                    >
                      About
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#get-started"
                      className={navigationMenuTriggerStyle()}
                    >
                      Get Started
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
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left side - Text content */}
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Master Customer Interviews with
                  <span className="block text-blue-600">AI-Powered Practice</span>
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Practice and perfect your customer interview skills with our AI-driven simulator.
                  Get real-time feedback and improve your technique with The Mom Test principles.
                </p>
                <div className="flex gap-4">
                  <Button 
                    size="lg"
                    onClick={() => {
                      const chatSection = document.getElementById('chat-section');
                      chatSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Try it now <ArrowRight />
                  </Button>
                </div>
              </div>
              
              {/* Right side - Chat Interface */}
              <div id="chat-section" className="relative">
                <div className="bg-white rounded-2xl shadow-xl p-1">
                  <RealtimeChat />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Features</h2>
              <p className="text-lg text-gray-600">Everything you need to improve your interview skills</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Conversations</h3>
                <p className="text-gray-600">
                  Practice with realistic AI personas that respond naturally to your questions
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
                <p className="text-gray-600">
                  Get instant feedback on your interview technique and track your progress
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Settings2 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Customizable Scenarios</h3>
                <p className="text-gray-600">
                  Practice with different customer types and business scenarios
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About Mom Test Simulator</h2>
              <p className="text-lg text-gray-600 mb-8">
                The Mom Test Simulator combines cutting-edge AI technology with proven interview
                techniques to help entrepreneurs and product managers conduct better customer interviews.
                Practice in a safe environment and get actionable feedback to improve your skills.
              </p>
              <ul className="space-y-4 text-left">
                {[
                  'Practice interviews without risk',
                  'Get instant feedback on your technique',
                  'Learn from AI-powered analysis',
                  'Track your progress over time'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="get-started" className="py-20 bg-blue-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to improve your customer interview skills?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Start practicing with our AI simulator today
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="secondary" 
                size="lg"
                asChild
              >
                <a href="/signup">Get Started Free</a>
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                asChild
              >
                <a href="/learn-more">Learn More</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Button variant="link" asChild><a href="#">Features</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Pricing</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Demo</a></Button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Button variant="link" asChild><a href="#">Documentation</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Guides</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Support</a></Button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Button variant="link" asChild><a href="#">About</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Blog</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Careers</a></Button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Button variant="link" asChild><a href="#">Privacy</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Terms</a></Button></li>
                <li><Button variant="link" asChild><a href="#">Security</a></Button></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Mom Test Simulator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}