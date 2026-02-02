import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  middleName: z.string().optional().default(""),
  email: z.string().email("Invalid email").min(1, "Required"),
  birthday: z.string().min(1, "Required"),
  maritalStatus: z.string().min(1, "Required"),
  street: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
  zipCode: z.string().min(1, "Required"),
  telephone: z.string().optional().default(""),
  mobileNumber: z.string().min(1, "Required"),
  motherName: z.string().min(1, "Required"),
  fatherName: z.string().min(1, "Required"),
  homeContact: z.string().min(1, "Required"),
  homeAddress: z.string().min(1, "Required"),
  emergencyContactPerson: z.string().min(1, "Required"),
  emergencyRelationship: z.string().min(1, "Required"),
  emergencyAddress: z.string().min(1, "Required"),
  emergencyNumber: z.string().min(1, "Required"),
  ssnEin: z.string().min(1, "Required"),
  shirtSize: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

export default function EmployeeFormPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  const shouldShowRecaptcha = useMemo(() => !!siteKey && siteKey.trim() !== "", [siteKey]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      email: "",
      birthday: "",
      maritalStatus: "",
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      telephone: "",
      mobileNumber: "",
      motherName: "",
      fatherName: "",
      homeContact: "",
      homeAddress: "",
      emergencyContactPerson: "",
      emergencyRelationship: "",
      emergencyAddress: "",
      emergencyNumber: "",
      ssnEin: "",
      shirtSize: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormData) => {
      const captchaValue = shouldShowRecaptcha ? recaptchaRef.current?.getValue() || "" : "";
      const payload = {
        ...values,
        captchaValue: captchaValue || undefined,
        link: window.location.origin,
      };

      const response = await fetch(buildApiUrl("/api/employees/onboarding/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || json?.message || "Failed to submit employee onboarding form");
      }
      return json;
    },
    onSuccess: () => {
      recaptchaRef.current?.reset();
      setSubmitted(true);
    },
    onError: (e: any) => {
      recaptchaRef.current?.reset();
      toast({
        title: "Submission Failed",
        description: e.message || "Please check the form and try again.",
        variant: "destructive",
      });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <Card className="bg-[#111111] border-[#2a2a2a] max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-[#EAEB80]">Success!</h1>
            <p className="text-gray-400 text-sm">
              Your employee onboarding form has been submitted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { register, handleSubmit, formState, setValue, watch } = form;
  const { errors } = formState;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-start justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <img src="/logo.svg" alt="Golden Luxury Auto" className="h-10 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-serif text-[#EAEB80] italic">Employee Onboarding</h1>
          <p className="text-gray-400 text-sm mt-1">Please complete your personal information.</p>
        </div>

        <Card className="bg-[#111111] border-[#2a2a2a]">
          <CardContent className="p-6 space-y-8">
            <form
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
              className="space-y-8"
            >
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-400">First Name *</Label>
                    <Input {...register("firstName")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.firstName && <p className="text-red-400 text-xs">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Last Name *</Label>
                    <Input {...register("lastName")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.lastName && <p className="text-red-400 text-xs">{errors.lastName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Middle Name</Label>
                    <Input {...register("middleName")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Email *</Label>
                    <Input {...register("email")} type="email" className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Birthday *</Label>
                    <Input {...register("birthday")} type="date" className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.birthday && <p className="text-red-400 text-xs">{errors.birthday.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Marital Status *</Label>
                    <Select
                      value={watch("maritalStatus")}
                      onValueChange={(v) => setValue("maritalStatus", v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="annulled">Annulled</SelectItem>
                        <SelectItem value="legally separated">Legally Separated</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.maritalStatus && <p className="text-red-400 text-xs">{errors.maritalStatus.message}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">Address & Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-gray-400">Street *</Label>
                    <Input {...register("street")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.street && <p className="text-red-400 text-xs">{errors.street.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">City *</Label>
                    <Input {...register("city")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.city && <p className="text-red-400 text-xs">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">State *</Label>
                    <Input {...register("state")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.state && <p className="text-red-400 text-xs">{errors.state.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Country *</Label>
                    <Input {...register("country")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.country && <p className="text-red-400 text-xs">{errors.country.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">ZIP *</Label>
                    <Input {...register("zipCode")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.zipCode && <p className="text-red-400 text-xs">{errors.zipCode.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Mobile # *</Label>
                    <Input {...register("mobileNumber")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.mobileNumber && <p className="text-red-400 text-xs">{errors.mobileNumber.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Telephone #</Label>
                    <Input {...register("telephone")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">Family Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-400">Mother's Name *</Label>
                    <Input {...register("motherName")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.motherName && <p className="text-red-400 text-xs">{errors.motherName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Father's Name *</Label>
                    <Input {...register("fatherName")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.fatherName && <p className="text-red-400 text-xs">{errors.fatherName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Home Contact # *</Label>
                    <Input {...register("homeContact")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.homeContact && <p className="text-red-400 text-xs">{errors.homeContact.message}</p>}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-gray-400">Home Address *</Label>
                    <Textarea {...register("homeAddress")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white min-h-[80px]" />
                    {errors.homeAddress && <p className="text-red-400 text-xs">{errors.homeAddress.message}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">Emergency Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-400">Emergency Contact Person *</Label>
                    <Input {...register("emergencyContactPerson")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.emergencyContactPerson && <p className="text-red-400 text-xs">{errors.emergencyContactPerson.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Relationship *</Label>
                    <Input {...register("emergencyRelationship")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.emergencyRelationship && <p className="text-red-400 text-xs">{errors.emergencyRelationship.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Contact # *</Label>
                    <Input {...register("emergencyNumber")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.emergencyNumber && <p className="text-red-400 text-xs">{errors.emergencyNumber.message}</p>}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-gray-400">Address *</Label>
                    <Textarea {...register("emergencyAddress")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white min-h-[80px]" />
                    {errors.emergencyAddress && <p className="text-red-400 text-xs">{errors.emergencyAddress.message}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-[#EAEB80] border-b border-[#EAEB80]/30 pb-2">Other</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-400">SSN / EIN *</Label>
                    <Input {...register("ssnEin")} className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                    {errors.ssnEin && <p className="text-red-400 text-xs">{errors.ssnEin.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400">Shirt Size *</Label>
                    <Select
                      value={watch("shirtSize")}
                      onValueChange={(v) => setValue("shirtSize", v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        {["Small", "Medium", "Large", "XLarge", "XXLarge"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.shirtSize && <p className="text-red-400 text-xs">{errors.shirtSize.message}</p>}
                  </div>
                </div>
              </section>

              {shouldShowRecaptcha && (
                <div className="pt-2">
                  <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey!} />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

