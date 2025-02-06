"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import NavigationHeader from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileAudio, FileText, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchInterviews, downloadTranscript, downloadAudio } from "@/lib/supabase/supabase-utils";
import Image from "next/image";
import { ExpandableText } from "./components/ExpandableText";

interface Interview {
  id: string;
  session_id: string;
  customer_profile: string;
  objectives: string[];
  recording_blob_url?: string;
  entries?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  created_at: string;
  updated_at: string;
}

interface UserIdentity {
  name: string;
  picture: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // If user is authenticated, fetch data
    if (!loading && user) {
      loadInterviews();
      fetchUserIdentity();
    }
  }, [user, loading, router]);

  const loadInterviews = async () => {
    try {
      if (!user?.id) return;
      const data = await fetchInterviews(user.id);
      setInterviews(data || []);
      setTotalInterviews(data?.length || 0);
    } catch (error) {
      console.error('Error loading interviews:', error);
    }
  };

  const handleDownloadTranscript = async (interview: Interview) => {
    try {
      await downloadTranscript(interview);
    } catch (error) {
      console.error('Error downloading transcript:', error);
    }
  };

  const handleDownloadAudio = async (interview: Interview) => {
    try {
      if (!user?.id) return;
      await downloadAudio(interview, user.id);
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  };

  const fetchUserIdentity = async () => {
    try {
      const { data: { user: userData }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (userData?.user_metadata) {
        setUserIdentity({
          name: userData.user_metadata.full_name || userData.user_metadata.name || user?.email,
          picture: userData.user_metadata.avatar_url || userData.user_metadata.picture || '/default-avatar.png'
        });
      } else {
        // Fallback to email if no metadata
        setUserIdentity({
          name: user?.email || '',
          picture: '/default-avatar.png'
        });
      }
    } catch (error) {
      console.error('Error fetching user identity:', error);
      // Fallback to email if identity fetch fails
      setUserIdentity({
        name: user?.email || '',
        picture: '/default-avatar.png'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <main className="container mx-auto px-4 py-8">
        {/* User Profile Section */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start gap-6">
              {userIdentity?.picture ? (
                <div className="flex-shrink-0">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden">
                    <Image
                      src={userIdentity.picture}
                      alt="Profile"
                      fill
                      sizes="64px"
                      priority
                      className="object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-shrink-0">
                  <UserCircle className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Welcome, {userIdentity?.name || user.email}
                </h2>
                <p className="text-gray-600 mb-4">
                  You have completed {totalInterviews} interview{totalInterviews !== 1 ? 's' : ''}.
                </p>
                <Button 
                  onClick={() => router.push('/simulator-onboarding')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base px-4 py-2 flex items-center"
                  >
                  Start New Interview <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Interview History Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Interview History</h3>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objectives</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transcript</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recording</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(interview.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <ExpandableText text={interview.customer_profile || ''} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <ul className="list-disc list-inside">
                          {interview.objectives?.map((objective, index) => (
                            <li key={index} className="truncate max-w-xs">
                              {objective}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {interview.entries ? (
                          <button
                            onClick={() => handleDownloadTranscript(interview)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">Not available</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {interview.recording_blob_url ? (
                          <button
                            onClick={() => handleDownloadAudio(interview)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                          >
                            <FileAudio className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">Not available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 