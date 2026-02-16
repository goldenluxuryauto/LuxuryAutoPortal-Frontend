import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingTutorial, useTutorial } from "@/components/onboarding/OnboardingTutorial";
import { buildApiUrl } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, Video, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  videoUrl?: string;
  videoPlaceholder?: string;
  instructions?: string[];
  actionButton?: { label: string; href?: string };
}

interface TutorialModule {
  id: number;
  moduleOrder: number;
  title: string;
  description?: string;
  steps?: TutorialStep[];
}

export default function StaffTrainingManual() {
  const { resetTutorial } = useTutorial();
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [stepVideoState, setStepVideoState] = useState<Record<number, { loading: boolean; error: boolean }>>({});

  const { data: modulesData, isLoading: modulesLoading } = useQuery<{ success: boolean; data: TutorialModule[] }>({
    queryKey: ["/api/tutorial/modules", "employee"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/tutorial/modules?role=employee"), { credentials: "include" });
      if (!res.ok) return { success: false, data: [] };
      return res.json();
    },
    retry: false,
  });

  const { data: stepsData, isLoading: stepsLoading } = useQuery<{
    success: boolean;
    data: { modules: (TutorialModule & { steps: TutorialStep[] })[] };
  }>({
    queryKey: ["/api/tutorial/steps", "employee", "with-modules"],
    queryFn: async () => {
      const res = await fetch(
        buildApiUrl("/api/tutorial/steps?role=employee&includeModules=true"),
        { credentials: "include" }
      );
      if (!res.ok) return { success: false, data: { modules: [] } };
      return res.json();
    },
    retry: false,
  });

  const modules = (stepsData?.data?.modules ?? []) as (TutorialModule & { steps: TutorialStep[] })[];
  const isLoading = modulesLoading || stepsLoading;

  const toggleModule = (id: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartTutorial = () => {
    resetTutorial();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">System Tutorial</h1>
          <p className="text-muted-foreground">Learn how to use the GLA portal with our guided tutorial.</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-primary text-xl">Help & Tutorials</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Follow the step-by-step tutorial to learn procedures and best practices. You can start the guided walkthrough or browse modules below.
            </p>
            <button
              type="button"
              onClick={handleStartTutorial}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <PlayCircle className="w-4 h-4" />
              Start Tutorial
            </button>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : modules.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              No tutorial modules for employees yet. Check back later.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Expand a module to view its steps, videos, and instructions.
            </p>
            {modules.map((mod) => {
              const steps = mod.steps ?? [];
              const isExpanded = expandedModules.has(mod.id);
              return (
                <Card key={mod.id} className="bg-card border-border">
                  <CardHeader
                    className="cursor-pointer pb-3"
                    onClick={() => toggleModule(mod.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                      <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Module {mod.moduleOrder}
                      </span>
                      <CardTitle className="text-lg">{mod.title}</CardTitle>
                    </div>
                    {mod.description && (
                      <p className="text-sm text-muted-foreground pl-6">{mod.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground pl-6">
                      {steps.length} step{steps.length !== 1 ? "s" : ""}
                    </p>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">
                        {steps.map((step) => (
                          <Card key={step.id} className="bg-card border-border">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  Step {step.id}
                                </span>
                                <h3 className="font-semibold">{step.title}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                              {(step.videoUrl || step.videoPlaceholder) && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Video className="h-4 w-4" />
                                    Video
                                  </div>
                                  {step.videoUrl ? (
                                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
                                      {stepVideoState[step.id]?.loading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                      )}
                                      {stepVideoState[step.id]?.error ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
                                          <AlertCircle className="h-8 w-8 mb-2" />
                                          {step.videoPlaceholder || "Video unavailable"}
                                          <a
                                            href={step.videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 text-primary hover:underline"
                                          >
                                            Open in new tab
                                          </a>
                                        </div>
                                      ) : (
                                        <video
                                          src={step.videoUrl}
                                          className="w-full h-full object-contain"
                                          controls
                                          muted
                                          playsInline
                                          onLoadStart={() =>
                                            setStepVideoState((s) => ({ ...s, [step.id]: { loading: true, error: false } }))
                                          }
                                          onLoadedData={() =>
                                            setStepVideoState((s) => ({ ...s, [step.id]: { loading: false, error: false } }))
                                          }
                                          onError={() =>
                                            setStepVideoState((s) => ({ ...s, [step.id]: { loading: false, error: true } }))
                                          }
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center p-4 text-sm text-muted-foreground">
                                      {step.videoPlaceholder || "No video"}
                                    </div>
                                  )}
                                </div>
                              )}
                              {step.instructions && step.instructions.length > 0 && (
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {step.instructions.map((inst, i) => (
                                    <li key={i}>{inst}</li>
                                  ))}
                                </ul>
                              )}
                              {step.actionButton?.label && (
                                <div className="text-sm">
                                  <span className="font-medium text-muted-foreground">Action: </span>
                                  {step.actionButton.href ? (
                                    <a
                                      href={step.actionButton.href}
                                      className="text-primary hover:underline"
                                    >
                                      {step.actionButton.label}
                                    </a>
                                  ) : (
                                    <span>{step.actionButton.label}</span>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <OnboardingTutorial autoPlay={false} />
      </div>
    </AdminLayout>
  );
}
