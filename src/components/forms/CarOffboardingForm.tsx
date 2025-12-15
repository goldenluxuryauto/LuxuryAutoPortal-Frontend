import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import { Loader2, LogOut } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const carOffboardingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().min(1, "Name is required").max(255),
  carMakeModelYear: z.string().min(1, "Car Make/Model/Year is required").max(255),
  plateNumber: z.string().min(1, "Plate number is required").max(50),
  dropOffDate: z.string().min(1, "Drop-off date is required"),
});

type CarOffboardingFormData = z.infer<typeof carOffboardingSchema>;

export default function CarOffboardingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<CarOffboardingFormData>({
    resolver: zodResolver(carOffboardingSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      name: "",
      carMakeModelYear: "",
      plateNumber: "",
      dropOffDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: CarOffboardingFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(buildApiUrl("/api/car-offboarding/submit"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(error.error || "Failed to submit form");
      }

      const result = await response.json();
      
      toast({
        title: "✅ Form Submitted Successfully",
        description: "Your car offboarding request has been submitted. We'll notify you once it's processed.",
        duration: 5000,
      });

      // Reset form
      form.reset({
        date: new Date().toISOString().split('T')[0],
        name: "",
        carMakeModelYear: "",
        plateNumber: "",
        dropOffDate: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-[#111111] border-[#EAEB80]/20">
      <CardHeader>
        <CardTitle className="text-[#EAEB80] flex items-center gap-2">
          <LogOut className="w-5 h-5" />
          Car Off-boarding Form
        </CardTitle>
        <CardDescription className="text-gray-400">
          Submit this form when requesting your car back from GLA (end of rental or off-boarding from the fleet).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Your full name"
                        className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="carMakeModelYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Car Make/Model/Year *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., BMW X5 2023"
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Plate Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="License plate number"
                        className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80] uppercase"
                        style={{ textTransform: "uppercase" }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dropOffDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Drop-off Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Form"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

