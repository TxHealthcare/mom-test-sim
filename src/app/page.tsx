"use client";

import React from 'react';
import { ArrowRight, MessageCircle, BarChart3, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import NavigationHeader from '@/components/NavigationHeader';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen bg-white">
      <NavigationHeader />

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
                      if (user) {
                        router.push('/simulator-onboarding');
                      } else {
                        router.push('/login');
                      }
                    }}
                  >
                    Try it now <ArrowRight />
                  </Button>
                </div>
              </div>
              
              {/* Right side - Chat Interface */}
              <div id="gif-section" className="relative">
                <DotLottieReact
                  src="https://lottie.host/4b9084a6-6cff-4f13-a31d-a9d914e45fb4/ljH5zlmQrY.lottie"
                  loop
                  autoplay
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What you get</h2>
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
                <a href="/login">Get Started Free</a>
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                asChild
              >
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mt-12 pt-8 text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Mom Test Simulator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}