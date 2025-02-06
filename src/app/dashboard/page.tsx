"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import NavigationHeader from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileAudio, FileText, UserCircle, Star, Download } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchInterviews, downloadTranscript, downloadAudio } from "@/lib/supabase/supabase-utils";
import Image from "next/image";
import { ExpandableText } from "./components/ExpandableText";
import { Interview, EvaluationData } from "@/types/interview";


interface UserIdentity {
  name: string;
  picture: string;
}

// Modify EvaluationDisplay to be simpler
function EvaluationDisplay({ evaluation, isProcessing }: { evaluation?: EvaluationData, isProcessing?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isProcessing) {
    return <span className="text-gray-500 text-sm">Processing...</span>;
  }

  if (!evaluation) {
    return <span className="text-gray-400 text-sm">Not available yet</span>;
  }

  const handleDownloadEvaluation = () => {
    const evaluationText = `Mom Test Interview Evaluation

GENERAL ANALYSIS
${evaluation.generalAnalysis}

RUBRIC ANALYSIS
${evaluation.rubricAnalysis}

Evaluated At: ${new Date(evaluation.evaluatedAt).toLocaleString()}
`;

    const blob = new Blob([evaluationText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation-${new Date(evaluation.evaluatedAt).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-.5 ">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-sm p-0 h-auto font-normal hover:bg-transparent"
          >
            {isExpanded ? 'Hide Feedback' : 'View Feedback'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadEvaluation}
            className="text-blue-600 hover:text-blue-800 p-0 h-6 w-6 hover:bg-blue-100"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-w-xl">
          <div>
            <h3 className="font-semibold mb-2">General Analysis</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {evaluation.generalAnalysis}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Rubric Analysis</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {evaluation.rubricAnalysis}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Evaluated at: {new Date(evaluation.evaluatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [processingInterviewId, setProcessingInterviewId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user?.id) return;

    // Set up realtime subscription for transcript evaluations
    const transcriptsChannel = supabase
      .channel('transcripts-evaluations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transcripts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedTranscript = payload.new as Interview;
          
          // Update the interviews list with the new evaluation
          setInterviews(prevInterviews => 
            prevInterviews.map(interview => 
              interview.id === updatedTranscript.id
                ? { ...interview, evaluation: updatedTranscript.evaluation }
                : interview
            )
          );

          // Clear processing state if this was the interview being processed
          if (updatedTranscript.id === processingInterviewId && updatedTranscript.evaluation) {
            setProcessingInterviewId(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transcriptsChannel);
    };
  }, [user?.id, processingInterviewId]);

  const loadInterviews = async () => {
    try {
      if (!user?.id) return;
      const data = await fetchInterviews(user.id);
      setInterviews(data || []);
      
      // Check if the most recent interview needs processing
      const mostRecent = data?.[0];
      if (mostRecent?.id && mostRecent.entries?.length && !mostRecent.evaluation) {
        setProcessingInterviewId(mostRecent.id);
      }
    } catch (error) {
      console.error('Error loading interviews:', error);
    }
  };

  const handleDownloadTranscript = async (interview: Interview) => {
    try {
      if (!interview.id) {
        console.error('Interview has no id');
        return;
      }
      await downloadTranscript({
        id: interview.id,
        entries: interview.entries
      });
    } catch (error) {
      console.error('Error downloading transcript:', error);
    }
  };

  const handleDownloadAudio = async (interview: Interview) => {
    try {
      if (!user?.id) {
        console.error('User has no id');
        return;
      }
      if (!interview.session_id || !interview.id) {
        console.error('Interview has no session_id or id');
        return;
      }
      await downloadAudio({
        session_id: interview.session_id,
        id: interview.id
      }, user.id);
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
                  You have completed {interviews.length} interview{interviews.length !== 1 ? 's' : ''}.
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Evaluation</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Transcript</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Recording</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(interview?.created_at || '')}
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
                      <td className="px-4 py-4 text-center">
                        <div className="inline-block">
                          <EvaluationDisplay 
                            evaluation={interview.evaluation} 
                            isProcessing={interview.id === processingInterviewId}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm">
                        {interview.entries ? (
                          <button
                            onClick={() => handleDownloadTranscript(interview)}
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">Not available yet</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm">
                        {interview.recording_blob_url ? (
                          <button
                            onClick={() => handleDownloadAudio(interview)}
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mx-auto"
                          >
                            <FileAudio className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">Not available yet</span>
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