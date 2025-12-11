import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import { Loader2, Save, Slack } from "lucide-react";

interface SlackChannelConfig {
  id: number;
  formType: "lyc" | "car_onboarding" | "car_offboarding";
  channelId: string;
  channelName: string | null;
  updatedAt: string;
}

const formTypeLabels: Record<string, string> = {
  lyc: "Client Onboarding Form (LYC)",
  car_onboarding: "Car On-boarding",
  car_offboarding: "Car Off-boarding",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingChannels, setEditingChannels] = useState<Record<string, string>>({});

  // Fetch Slack channel configurations
  const { data: channelsData, isLoading } = useQuery<{
    success: boolean;
    data: SlackChannelConfig[];
  }>({
    queryKey: ["/api/settings/slack-channels"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/settings/slack-channels"), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch Slack channel configurations");
      }
      return response.json();
    },
  });

  // Update channel mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { formType: string; channelId: string; channelName?: string }) => {
      const response = await fetch(buildApiUrl("/api/settings/slack-channels"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update Slack channel");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/slack-channels"] });
      toast({
        title: "Success",
        description: "Slack channel configuration updated successfully",
      });
      setEditingChannels({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Slack channel configuration",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (formType: string, currentChannelId: string) => {
    setEditingChannels((prev) => ({
      ...prev,
      [formType]: currentChannelId,
    }));
  };

  const handleSave = (config: SlackChannelConfig) => {
    const newChannelId = editingChannels[config.formType] || config.channelId;
    if (newChannelId === config.channelId) {
      setEditingChannels((prev) => {
        const updated = { ...prev };
        delete updated[config.formType];
        return updated;
      });
      return;
    }
    updateMutation.mutate({
      formType: config.formType,
      channelId: newChannelId,
      channelName: config.channelName || undefined,
    });
  };

  const handleCancel = (formType: string) => {
    setEditingChannels((prev) => {
      const updated = { ...prev };
      delete updated[formType];
      return updated;
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
        </div>
      </AdminLayout>
    );
  }

  const channels = channelsData?.data || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Configure Slack channel notifications for different form types</p>
        </div>

        <Card className="bg-[#111111] border-[#EAEB80]/20">
          <CardHeader>
            <CardTitle className="text-[#EAEB80] flex items-center gap-2">
              <Slack className="w-5 h-5" />
              Slack Channel Configuration
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure which Slack channels receive notifications for each form type. Each form type can have its own dedicated channel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {channels.map((config) => {
              const isEditing = editingChannels.hasOwnProperty(config.formType);
              const editingValue = editingChannels[config.formType] || config.channelId;

              return (
                <div
                  key={config.formType}
                  className="p-4 border border-[#2a2a2a] rounded-lg bg-[#1a1a1a]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Label className="text-white font-medium text-lg">
                        {formTypeLabels[config.formType] || config.formType}
                      </Label>
                      {config.channelName && (
                        <p className="text-sm text-gray-400 mt-1">{config.channelName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`channel-${config.formType}`} className="text-gray-300 text-sm">
                        Slack Channel ID
                      </Label>
                      {isEditing ? (
                        <div className="flex gap-2 mt-2">
                          <Input
                            id={`channel-${config.formType}`}
                            value={editingValue}
                            onChange={(e) =>
                              setEditingChannels((prev) => ({
                                ...prev,
                                [config.formType]: e.target.value,
                              }))
                            }
                            className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="C1234567890"
                          />
                          <Button
                            onClick={() => handleSave(config)}
                            disabled={updateMutation.isPending}
                            className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                            size="sm"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => handleCancel(config.formType)}
                            variant="outline"
                            size="sm"
                            className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a]"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={config.channelId}
                            readOnly
                            className="bg-[#0a0a0a] border-[#2a2a2a] text-gray-400"
                          />
                          <Button
                            onClick={() => handleEdit(config.formType, config.channelId)}
                            variant="outline"
                            size="sm"
                            className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a]"
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(config.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}

            {channels.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>No Slack channel configurations found.</p>
                <p className="text-sm mt-2">Channels will be initialized on first use.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-[#EAEB80]/20">
          <CardHeader>
            <CardTitle className="text-[#EAEB80]">How to Get Slack Channel ID</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open Slack and navigate to the channel you want to use</li>
              <li>Click on the channel name at the top</li>
              <li>Scroll down to find the "Channel ID" (starts with "C")</li>
              <li>Copy the Channel ID and paste it in the field above</li>
            </ol>
            <p className="text-sm text-gray-400 mt-4">
              Note: Make sure your Slack bot has been invited to the channel before notifications can be sent.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

