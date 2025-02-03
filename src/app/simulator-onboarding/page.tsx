"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { saveTranscript } from "@/lib/supabase/supabase-utils";

export default function SimulatorOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [customerProfile, setCustomerProfile] = useState("");
  const [learningObjectives, setLearningObjectives] = useState(["", "", ""]);
  const [session_id] = useState(() => uuidv4());

  const hasRequiredFields = customerProfile.trim() && learningObjectives.some(obj => obj.trim());

  const handleLearningObjectiveChange = (index: number, value: string) => {
    setLearningObjectives(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasRequiredFields || !user) return;

    try {
      const transcriptData = {
        id: session_id,
        user_id: user.id,
        session_id,
        customer_profile: customerProfile.trim(),
        objectives: learningObjectives.filter(obj => obj.trim()),
      };

      await saveTranscript(transcriptData);
      router.push(`/simulator?session_id=${session_id}`);
    } catch (error) {
      console.error('Error saving transcript data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-12">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Customer Profile</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Provide details about the customer you'll be interviewing
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile">Profile Description</Label>
              <Textarea
                id="profile"
                placeholder="Ex: Copy paste their linkedin profile here"
                className="min-h-[150px]"
                value={customerProfile}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomerProfile(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Learning Objectives</h2>
              <p className="text-sm text-muted-foreground mb-4">
                What do you want to learn from this interview?
              </p>
            </div>
            <div className="space-y-4">
              {learningObjectives.map((objective, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`objective-${index}`}>
                    Objective {index + 1} {index === 0 && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id={`objective-${index}`}
                    placeholder={[
                      "How often did X problem occur last week",
                      "How much did Y cost the business last month",
                      "Which customers are impacted by Z the most"
                    ][index]}
                    value={objective}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleLearningObjectiveChange(index, e.target.value)
                    }
                    required={index === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              type="submit" 
              size="lg"
              className="w-32"
              disabled={!customerProfile.trim()}
            >
              Start
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
