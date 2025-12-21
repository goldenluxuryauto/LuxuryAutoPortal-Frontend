import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  FileText,
  LogOut,
  User,
  Navigation,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// Tutorial step interface
export interface TutorialStep {
  id: number;
  title: string;
  description: string;
  videoUrl?: string;
  videoPlaceholder?: string;
  instructions: string[];
  actionButton?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// Tutorial context
interface TutorialContextType {
  isOpen: boolean;
  currentStep: number;
  completedSteps: Set<number>;
  openTutorial: () => void;
  closeTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  resetTutorial: () => void;
  hasCompletedTutorial: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Tutorial steps configuration
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "Complete the Onboarding Form",
    description: "Learn how to complete the onboarding form when returning your vehicle to the GLA office.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    videoPlaceholder: "Step 1: Complete the onboarding form when returning the vehicle to the GLA office.",
    instructions: [
      "Navigate to the Forms page from the main menu",
      "Select the 'Onboarding' tab",
      "Fill in all required vehicle information",
      "Select your vehicle from the dropdown",
      "Enter the drop-off date and time",
      "Submit the form to notify GLA office",
    ],
    actionButton: {
      label: "Forms",
      href: "/admin/forms",
    },
  },
  {
    id: 2,
    title: "Complete the Offboarding Form",
    description: "Learn how to complete the offboarding form when picking up your vehicle from GLA.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    videoPlaceholder: "Step 2: Complete the offboarding form when picking up the vehicle from GLA.",
    instructions: [
      "Navigate to the Forms page from the main menu",
      "Select the 'Offboarding' tab",
      "Fill in all required vehicle information",
      "Select your vehicle from the dropdown",
      "Enter the pick-up date and time",
      "Submit the form to notify GLA office",
    ],
    actionButton: {
      label: "Forms",
      href: "/admin/forms",
    },
  },
  {
    id: 3,
    title: "Access Your Profile",
    description: "Learn how to check your user information, contract copy, and shortcut links in your profile.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    videoPlaceholder: "Step 3: You can check your user information, contract copy, and shortcut links in your profile.",
    instructions: [
      "Navigate to your Profile page from the main menu",
      "View your personal information and account details",
      "Access your signed contract documents",
      "Use Quick Links for quick navigation",
      "Download contract copies when needed",
      "Update your information if necessary",
    ],
    actionButton: {
      label: "Profile",
      href: "/admin/profile",
    },
  },
  {
    id: 4,
    title: "In-Vehicle Navigation",
    description: "This feature will be available soon. Stay tuned for updates!",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    videoPlaceholder: "Step 4: (To be added once the in-vehicle navigation function is completed)",
    instructions: [
      "This feature is currently under development",
      "In-vehicle navigation functionality will be added soon",
      "You'll receive a notification when this feature is available",
      "Check back later for updates",
    ],
    actionButton: {
      label: "Coming Soon",
    },
  },
];

// Tutorial Provider Component
export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  // Save tutorial state to localStorage
  const saveState = (updates: {
    isOpen?: boolean;
    currentStep?: number;
    completedSteps?: Set<number>;
    completed?: boolean;
  }) => {
    const currentState = {
      completed: hasCompletedTutorial,
      currentStep,
      completedSteps: Array.from(completedSteps),
    };

    const newState = {
      ...currentState,
      ...updates,
      completedSteps: updates.completedSteps
        ? Array.from(updates.completedSteps)
        : currentState.completedSteps,
    };

    localStorage.setItem("gla_tutorial_state", JSON.stringify(newState));
  };

  // Load tutorial state from localStorage
  useEffect(() => {
    // Check if this is a new signup
    const isNewSignup = localStorage.getItem("gla_new_signup") === "true";
    
    if (isNewSignup) {
      // New signup - reset tutorial state and show tutorial
      setCurrentStep(1);
      setCompletedSteps(new Set());
      setHasCompletedTutorial(false);
      setIsOpen(true);
      localStorage.removeItem("gla_new_signup"); // Clear the flag
      saveState({
        currentStep: 1,
        completedSteps: new Set(),
        completed: false,
        isOpen: true,
      });
    } else {
      // Load saved state for existing users
      const savedState = localStorage.getItem("gla_tutorial_state");
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setHasCompletedTutorial(parsed.completed || false);
          setCompletedSteps(new Set(parsed.completedSteps || []));
          if (parsed.currentStep) {
            setCurrentStep(parsed.currentStep);
          }
        } catch (e) {
          console.error("Error loading tutorial state:", e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTutorial = () => {
    // Always start from Step 1 when opening tutorial
    setCurrentStep(1);
    setIsOpen(true);
    saveState({ currentStep: 1, isOpen: true });
  };

  const closeTutorial = () => {
    setIsOpen(false);
    saveState({ isOpen: false });
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      saveState({ currentStep: newStep });
    } else {
      // Tutorial completed
      setHasCompletedTutorial(true);
      saveState({ completed: true, currentStep: TUTORIAL_STEPS.length });
      closeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      saveState({ currentStep: newStep });
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= TUTORIAL_STEPS.length) {
      setCurrentStep(step);
      saveState({ currentStep: step });
    }
  };

  const markStepComplete = (step: number) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(step);
    setCompletedSteps(newCompleted);
    saveState({ completedSteps: newCompleted });
  };

  const resetTutorial = () => {
    setCurrentStep(1);
    setCompletedSteps(new Set());
    setHasCompletedTutorial(false);
    setIsOpen(true);
    saveState({
      currentStep: 1,
      completedSteps: new Set(),
      completed: false,
      isOpen: true,
    });
  };

  return (
    <TutorialContext.Provider
      value={{
        isOpen,
        currentStep,
        completedSteps,
        openTutorial,
        closeTutorial,
        nextStep,
        previousStep,
        goToStep,
        markStepComplete,
        resetTutorial,
        hasCompletedTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

// Hook to use tutorial context
export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}

// Main Tutorial Component
interface OnboardingTutorialProps {
  isOpen?: boolean;
  onClose?: () => void;
  autoStart?: boolean;
}

export function OnboardingTutorial({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  autoStart = false,
}: OnboardingTutorialProps) {
  const [, setLocation] = useLocation();
  const {
    isOpen: contextIsOpen,
    currentStep,
    completedSteps,
    closeTutorial,
    nextStep,
    previousStep,
    goToStep,
    markStepComplete,
    hasCompletedTutorial,
    openTutorial: contextOpenTutorial,
  } = useTutorial();

  // Use controlled props if provided, otherwise use context
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : contextIsOpen;
  const handleClose = controlledOnClose || closeTutorial;

  // Note: Auto-start is now handled by TutorialProvider for new signups only
  // This component no longer auto-starts on its own

  const currentStepData = TUTORIAL_STEPS[currentStep - 1];
  const progress = (currentStep / TUTORIAL_STEPS.length) * 100;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TUTORIAL_STEPS.length;

  const handleActionClick = () => {
    if (currentStepData.actionButton?.href) {
      setLocation(currentStepData.actionButton.href);
      handleClose();
    } else if (currentStepData.actionButton?.onClick) {
      currentStepData.actionButton.onClick();
    }
  };

  const handleStepClick = (stepNumber: number) => {
    goToStep(stepNumber);
  };

  const getStepIcon = (stepId: number) => {
    switch (stepId) {
      case 1:
        return <FileText className="w-5 h-5" />;
      case 2:
        return <LogOut className="w-5 h-5" />;
      case 3:
        return <User className="w-5 h-5" />;
      case 4:
        return <Navigation className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col bg-[#0a0a0a] border-[#1a1a1a] text-white">
        <DialogHeader className="space-y-2 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-[#EAEB80] flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Welcome Tutorial
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-gray-400">
            Step {currentStep} of {TUTORIAL_STEPS.length}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-1 pb-2">
          <Progress value={progress} className="h-2 bg-gray-800" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{Math.round(progress)}% Complete</span>
            <span>
              {currentStep} / {TUTORIAL_STEPS.length}
            </span>
          </div>
        </div>

        {/* Current Step Content */}
        <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col min-h-0">
           {/* Video Section */}
           <div className="relative h-[400px] bg-gray-900 rounded-lg overflow-hidden border border-gray-800 flex-shrink-0">
             <video
               key={currentStep}
               src={currentStepData.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
               className="w-full h-full object-contain"
               controls
               autoPlay
               loop
               muted
               playsInline
             >
               Your browser does not support the video tag.
             </video>
           </div>

          {/* Step Title and Description */}
          <div className="space-y-1 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white">{currentStepData.title}</h3>
            <p className="text-sm text-gray-400">{currentStepData.description}</p>
          </div>

          {/* Instructions List - Two Columns */}
          <div className="space-y-2 flex-1 min-h-0">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Instructions:
            </h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {currentStepData.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-300">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#EAEB80]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#EAEB80] text-xs font-bold">{index + 1}</span>
                  </div>
                  <span className="flex-1 leading-relaxed">{instruction}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-800 flex-shrink-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Skip Tutorial
            </Button>
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={previousStep}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStepData.actionButton && currentStepData.actionButton.label !== "Coming Soon" && (
              <Button
                onClick={handleActionClick}
                variant="outline"
                className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10"
              >
                <Play className="w-4 h-4 mr-2" />
                {currentStepData.actionButton.label}
              </Button>
            )}
            {!isLastStep ? (
              <Button
                onClick={() => {
                  markStepComplete(currentStep);
                  nextStep();
                }}
                className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  markStepComplete(currentStep);
                  nextStep(); // This will complete the tutorial
                }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Tutorial
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
