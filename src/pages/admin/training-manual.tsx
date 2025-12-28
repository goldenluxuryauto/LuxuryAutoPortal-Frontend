import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlayCircle, Edit, Trash2, Plus, Loader2, Save, X, Video, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OnboardingTutorial, useTutorial, TutorialStep } from "@/components/onboarding/OnboardingTutorial";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Check if user is admin
function useIsAdmin() {
  const { data: userData } = useQuery<{ user?: { isAdmin?: boolean } }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  return userData?.user?.isAdmin === true;
}

// Form schema for tutorial step
const tutorialStepSchema = z.object({
  role: z.enum(['admin', 'client', 'employee']),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  videoPlaceholder: z.string().optional(),
  instructions: z.array(z.string().min(1, "Instruction cannot be empty")).min(1, "At least one instruction is required"),
  actionButtonLabel: z.string().optional(),
  actionButtonHref: z.string().optional(),
});

type TutorialStepFormData = z.infer<typeof tutorialStepSchema>;

export default function TrainingManualPage() {
  const { isOpen: tutorialOpen, openTutorial, closeTutorial, resetTutorial } = useTutorial();
  
  // Handler for Start Tutorial button
  const handleStartTutorial = () => {
    // Reset tutorial - this sets isOpen to true in context
    resetTutorial();
  };
  const isAdmin = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingStep, setEditingStep] = useState<TutorialStep | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [instructionInput, setInstructionInput] = useState("");
  const [deletingStepId, setDeletingStepId] = useState<number | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoValid, setVideoValid] = useState<boolean | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'client' | 'employee'>('client');

  // Fetch tutorial steps for selected role
  const { data: tutorialStepsData, isLoading, isError, isFetching } = useQuery<{ success: boolean; data: TutorialStep[] }>({
    queryKey: ["/api/tutorial/steps", selectedRole],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`/api/tutorial/steps?role=${selectedRole}`), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tutorial steps");
      }
      const data = await response.json();
      return data;
    },
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    retry: 1,
    placeholderData: keepPreviousData, // Keep previous data while refetching to prevent empty state
  });

  // Safely extract tutorial steps, handling both response formats
  const tutorialSteps = tutorialStepsData?.success 
    ? (tutorialStepsData?.data || [])
    : (Array.isArray(tutorialStepsData) ? tutorialStepsData : []);

  // Create tutorial step mutation
  const createMutation = useMutation({
    mutationFn: async ({ stepOrder, data }: { stepOrder: number; data: TutorialStepFormData }) => {
      const response = await fetch(buildApiUrl("/api/admin/tutorial/steps"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: data.role || selectedRole,
          stepOrder,
          title: data.title,
          description: data.description,
          videoUrl: data.videoUrl || undefined,
          videoPlaceholder: data.videoPlaceholder || undefined,
          instructions: data.instructions,
          actionButton: data.actionButtonLabel ? {
            label: data.actionButtonLabel,
            href: data.actionButtonHref || undefined,
          } : undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create tutorial step");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial/steps", selectedRole] });
      queryClient.refetchQueries({ queryKey: ["/api/tutorial/steps", selectedRole] }); // Force immediate refetch
      toast({
        title: "Success",
        description: "Tutorial step created successfully",
      });
      setIsEditDialogOpen(false);
      setIsAddingStep(false);
      setEditingStep(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tutorial step",
        variant: "destructive",
      });
    },
  });

  // Delete tutorial step mutation
  const deleteMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const response = await fetch(buildApiUrl(`/api/admin/tutorial/steps/${stepId}?role=${selectedRole}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete tutorial step");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial/steps", selectedRole] });
      queryClient.refetchQueries({ queryKey: ["/api/tutorial/steps", selectedRole] }); // Force immediate refetch
      toast({
        title: "Success",
        description: "Tutorial step deleted successfully",
      });
      setDeletingStepId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tutorial step",
        variant: "destructive",
      });
    },
  });

  // Update tutorial step mutation
  const updateMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: number; data: TutorialStepFormData }) => {
      const response = await fetch(buildApiUrl(`/api/admin/tutorial/steps/${stepId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: data.role || selectedRole, // Include role in request body
          title: data.title,
          description: data.description,
          videoUrl: data.videoUrl || undefined,
          videoPlaceholder: data.videoPlaceholder || undefined,
          instructions: data.instructions,
          actionButton: data.actionButtonLabel ? {
            label: data.actionButtonLabel,
            href: data.actionButtonHref || undefined,
          } : undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update tutorial step");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate queries for both the role used and the original step's role
      const roleUsed = variables.data.role || selectedRole;
      const originalRole = editingStep ? (editingStep as any).role || selectedRole : selectedRole;
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial/steps", roleUsed] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial/steps", originalRole] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial/steps", selectedRole] });
      queryClient.refetchQueries({ queryKey: ["/api/tutorial/steps", selectedRole] }); // Force immediate refetch
      toast({
        title: "Success",
        description: "Tutorial step updated successfully",
      });
      setIsEditDialogOpen(false);
      setIsAddingStep(false);
      setEditingStep(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tutorial step",
        variant: "destructive",
      });
    },
  });

  const form = useForm<TutorialStepFormData>({
    resolver: zodResolver(tutorialStepSchema),
    defaultValues: {
      role: selectedRole,
      title: "",
      description: "",
      videoUrl: "",
      videoPlaceholder: "",
      instructions: [],
      actionButtonLabel: "",
      actionButtonHref: "",
    },
  });

  // Update form role when selectedRole changes (only when not editing)
  useEffect(() => {
    if (!isEditDialogOpen && !editingStep) {
      form.setValue("role", selectedRole);
    }
  }, [selectedRole, isEditDialogOpen, editingStep, form]);

  // Test video URL validity
  const testVideoUrl = async (url: string) => {
    setVideoLoading(true);
    setVideoError(null);
    setVideoValid(null);

    try {
      // Basic URL validation
      new URL(url);
      
      // Try to load the video
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      
      video.oncanplay = () => {
        setVideoLoading(false);
        setVideoValid(true);
        setVideoError(null);
      };
      
      video.onerror = () => {
        setVideoLoading(false);
        setVideoValid(false);
        setVideoError("Video failed to load. Please check the URL is accessible.");
      };
      
      // Set a timeout
      setTimeout(() => {
        if (video.readyState === 0) {
          setVideoLoading(false);
          setVideoValid(false);
          setVideoError("Video is taking too long to load. URL may be invalid or inaccessible.");
        }
      }, 5000);
    } catch (error) {
      setVideoLoading(false);
      setVideoValid(false);
      setVideoError("Invalid URL format. Please enter a valid video URL.");
    }
  };

  const handleEditClick = (step: TutorialStep & { role?: string }) => {
    setEditingStep(step);
    setIsAddingStep(false);
    const videoUrl = step.videoUrl || "";
    form.reset({
      role: (step as any).role || selectedRole, // Get role from step or use selectedRole
      title: step.title,
      description: step.description,
      videoUrl: videoUrl,
      videoPlaceholder: step.videoPlaceholder || "",
      instructions: step.instructions || [],
      actionButtonLabel: step.actionButton?.label || "",
      actionButtonHref: step.actionButton?.href || "",
    });
    setInstructionInput("");
    // Set preview URL if video URL exists
    if (videoUrl) {
      setVideoPreviewUrl(videoUrl);
      testVideoUrl(videoUrl);
    } else {
      setVideoPreviewUrl(null);
      setVideoValid(null);
      setVideoError(null);
    }
    setIsEditDialogOpen(true);
  };

  const handleAddStepClick = () => {
    setEditingStep(null);
    setIsAddingStep(true);
    form.reset({
      role: selectedRole, // Use selectedRole from dropdown
      title: "",
      description: "",
      videoUrl: "",
      videoPlaceholder: "",
      instructions: [],
      actionButtonLabel: "",
      actionButtonHref: "",
    });
    setInstructionInput("");
    setVideoPreviewUrl(null);
    setVideoValid(null);
    setVideoError(null);
    setIsEditDialogOpen(true);
  };

  const handleAddInstruction = () => {
    if (instructionInput.trim()) {
      const currentInstructions = form.getValues("instructions");
      form.setValue("instructions", [...currentInstructions, instructionInput.trim()]);
      setInstructionInput("");
    }
  };

  const handleRemoveInstruction = (index: number) => {
    const currentInstructions = form.getValues("instructions");
    form.setValue("instructions", currentInstructions.filter((_, i) => i !== index));
  };

  const onSubmit = (data: TutorialStepFormData) => {
    if (isAddingStep) {
      // Calculate next step order (highest existing order + 1)
      const maxOrder = tutorialSteps.length > 0 
        ? Math.max(...tutorialSteps.map(step => step.id))
        : 0;
      const nextOrder = maxOrder + 1;
      createMutation.mutate({ stepOrder: nextOrder, data });
    } else if (editingStep) {
      updateMutation.mutate({ stepId: editingStep.id, data });
    }
  };

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
                onClick={handleStartTutorial}
                className="bg-[#EAEB80] text-black hover:bg-[#EAEB80]/90"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Tutorial
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Tutorial Management Section */}
        {isAdmin && (
          <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#EAEB80] text-xl">Tutorial Configuration</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={(value: 'admin' | 'client' | 'employee') => setSelectedRole(value)}>
                    <SelectTrigger className="w-[150px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddStepClick}
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Step
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#EAEB80]" />
                </div>
              ) : isError ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">Error loading tutorial steps. Please try refreshing the page.</p>
                </div>
              ) : (!tutorialStepsData || (tutorialStepsData && !tutorialStepsData.success && !Array.isArray(tutorialStepsData)) || (tutorialSteps.length === 0 && !isFetching && !isLoading)) ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No tutorial steps found. Click "Add New Step" to create tutorial steps.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tutorialSteps.map((step) => (
                    <Card key={step.id} className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#EAEB80]/30 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-4">
                            {/* Step Header */}
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-[#EAEB80]/20 text-[#EAEB80] border-[#EAEB80]/30 text-sm font-semibold px-3 py-1">
                                Step {step.id}
                              </Badge>
                              <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                            </div>

                            {/* Description */}
                            <div>
                              <p className="text-sm font-medium text-gray-300 mb-1">Description:</p>
                              <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                            </div>

                            {/* Video Information */}
                            {(step.videoUrl || step.videoPlaceholder) && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4 text-[#EAEB80]" />
                                  <p className="text-sm font-medium text-gray-300">Video Information:</p>
                                </div>
                                {step.videoUrl && (
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Video URL:</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-400 break-all bg-[#0a0a0a] p-2 rounded border border-[#2a2a2a] flex-1">
                                          {step.videoUrl}
                                        </p>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            window.open(step.videoUrl, "_blank");
                                          }}
                                          className="text-[#EAEB80] hover:text-[#EAEB80] hover:bg-[#EAEB80]/10"
                                          title="Open video in new tab"
                                        >
                                          <PlayCircle className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {step.videoPlaceholder && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Video Placeholder:</p>
                                    <p className="text-xs text-gray-400 bg-[#0a0a0a] p-2 rounded border border-[#2a2a2a]">
                                      {step.videoPlaceholder}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Instructions */}
                            {step.instructions && step.instructions.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-300 mb-2">
                                  Instructions ({step.instructions.length}):
                                </p>
                                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 bg-[#0a0a0a] p-3 rounded border border-[#2a2a2a]">
                                  {step.instructions.map((instruction, idx) => (
                                    <li key={idx} className="leading-relaxed">{instruction}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Action Button */}
                            {step.actionButton && (
                              <div>
                                <p className="text-sm font-medium text-gray-300 mb-1">Action Button:</p>
                                <div className="flex items-center gap-2 bg-[#0a0a0a] p-2 rounded border border-[#2a2a2a]">
                                  <Badge variant="outline" className="bg-[#EAEB80]/10 text-[#EAEB80] border-[#EAEB80]/30">
                                    {step.actionButton.label}
                                  </Badge>
                                  {step.actionButton.href && (
                                    <span className="text-xs text-gray-400">
                                      → {step.actionButton.href}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col items-center gap-2 pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(step)}
                              className="text-[#EAEB80] hover:text-[#EAEB80] hover:bg-[#EAEB80]/10 border border-[#EAEB80]/20"
                              title="Edit Step"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <ConfirmDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-red-500/20"
                                  title="Delete Step"
                                  disabled={deleteMutation.isPending && deletingStepId === step.id}
                                >
                                  {deleteMutation.isPending && deletingStepId === step.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                  )}
                                  Delete
                                </Button>
                              }
                              title="Delete Tutorial Step"
                              description={`Are you sure you want to delete "${step.title}"? This action cannot be undone.`}
                              confirmText="Delete"
                              cancelText="Cancel"
                              variant="destructive"
                              onConfirm={() => {
                                setDeletingStepId(step.id);
                                deleteMutation.mutate(step.id);
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Tutorial Step Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsEditDialogOpen(false);
            setIsAddingStep(false);
            setEditingStep(null);
            setVideoPreviewUrl(null);
            setVideoValid(null);
            setVideoError(null);
            form.reset();
          }
        }}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#EAEB80]">
                {isAddingStep ? "Add New Tutorial Step" : `Edit Tutorial Step ${editingStep?.id}`}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {isAddingStep 
                  ? "Create a new tutorial step with content, video URL, and instructions"
                  : "Update the tutorial step content, video URL, and instructions"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Role *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Title *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="Step title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="Step description"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Video Management Section */}
                <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-5 h-5 text-[#EAEB80]" />
                    <Label className="text-[#EAEB80] font-semibold">Video Management</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 flex items-center gap-2">
                            Video URL
                            {videoValid === true && (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                            {videoValid === false && (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                                {...field}
                                type="url"
                                className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                                placeholder="https://example.com/video.mp4"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const url = e.target.value;
                                  if (url && url.trim()) {
                                    setVideoPreviewUrl(url.trim());
                                    setVideoValid(null);
                                    setVideoError(null);
                                    // Test video URL
                                    testVideoUrl(url.trim());
                                  } else {
                                    setVideoPreviewUrl(null);
                                    setVideoValid(null);
                                    setVideoError(null);
                                  }
                                }}
                              />
                              {videoError && (
                                <p className="text-xs text-red-400 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {videoError}
                                </p>
                              )}
                              {videoValid === true && (
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Video URL is valid and accessible
                                </p>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="videoPlaceholder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Video Placeholder</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                              placeholder="Placeholder text when video is unavailable"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Video Preview */}
                  {videoPreviewUrl && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-gray-400 text-sm">Video Preview</Label>
                      <div className="relative h-64 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                        {videoLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                            <div className="text-center space-y-2">
                              <Loader2 className="w-6 h-6 animate-spin text-[#EAEB80] mx-auto" />
                              <p className="text-sm text-gray-400">Loading video preview...</p>
                            </div>
                          </div>
                        )}
                        {videoError ? (
                          <div className="w-full h-full flex items-center justify-center p-4">
                            <div className="text-center space-y-2">
                              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                              <p className="text-sm text-gray-400">{videoError}</p>
                              <p className="text-xs text-gray-500 break-all">{videoPreviewUrl}</p>
                            </div>
                          </div>
                        ) : (
                          <video
                            key={videoPreviewUrl}
                            src={videoPreviewUrl}
                            className="w-full h-full object-contain"
                            controls
                            muted
                            playsInline
                            onLoadStart={() => setVideoLoading(true)}
                            onLoadedData={() => {
                              setVideoLoading(false);
                              setVideoError(null);
                            }}
                            onError={() => {
                              setVideoLoading(false);
                              setVideoError("Failed to load video. Please check the URL.");
                              setVideoValid(false);
                            }}
                            onCanPlay={() => {
                              setVideoLoading(false);
                              setVideoValid(true);
                              setVideoError(null);
                            }}
                          >
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400">Instructions *</Label>
                  <div className="space-y-2">
                    {form.watch("instructions").map((instruction, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={instruction}
                          onChange={(e) => {
                            const instructions = form.getValues("instructions");
                            instructions[index] = e.target.value;
                            form.setValue("instructions", instructions);
                          }}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder={`Instruction ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInstruction(index)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        value={instructionInput}
                        onChange={(e) => setInstructionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddInstruction();
                          }
                        }}
                        className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                        placeholder="Add new instruction"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddInstruction}
                        className="border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {form.formState.errors.instructions && (
                    <p className="text-sm text-red-400">{form.formState.errors.instructions.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="actionButtonLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Action Button Label</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="Button label"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actionButtonHref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Action Button Link</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="/admin/forms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setIsAddingStep(false);
                      setEditingStep(null);
                      form.reset();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    <Save className="w-4 h-4 mr-2" />
                    {isAddingStep ? "Create Step" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Tutorial Modal - Disable autoplay on system tutorial page */}
        <OnboardingTutorial autoPlay={false} />
      </div>
    </AdminLayout>
  );
}
