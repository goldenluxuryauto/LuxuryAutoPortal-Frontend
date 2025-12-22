import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { OnboardingTutorial, useTutorial } from "@/components/onboarding/OnboardingTutorial";

export default function TrainingManualPage() {
  const { isOpen: tutorialOpen, openTutorial, closeTutorial, resetTutorial } = useTutorial();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-2">System Tutorial</h1>
          <p className="text-gray-400 text-sm">Learn how to use the GLA portal with our guided tutorial</p>
        </div>

        {/* Help & Tutorials Section */}
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-[#EAEB80] text-xl">Help & Tutorials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">System Tutorial</p>
                <p className="text-gray-400 text-sm">
                  Learn how to use the GLA portal with our guided tutorial
                </p>
              </div>
              <Button
                onClick={resetTutorial}
                className="bg-[#EAEB80] text-black hover:bg-[#EAEB80]/90"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Tutorial
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tutorial Modal */}
        <OnboardingTutorial isOpen={tutorialOpen} onClose={closeTutorial} />
      </div>
    </AdminLayout>
  );
}

