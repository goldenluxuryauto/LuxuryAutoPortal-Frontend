import { useRef, useState } from "react";
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
import { CheckCircle2, Loader2, Wand2 } from "lucide-react";
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

const sampleFormData: FormData = {
  firstName: "Jane",
  lastName: "Smith",
  middleName: "Marie",
  email: "jane.smith@example.com",
  birthday: "1995-03-15",
  maritalStatus: "single",
  street: "100 Sample Lane",
  city: "Denver",
  state: "CO",
  country: "USA",
  zipCode: "80202",
  telephone: "555-0102",
  mobileNumber: "555-0101",
  motherName: "Mary Smith",
  fatherName: "Robert Smith",
  homeContact: "555-0103",
  homeAddress: "100 Sample Lane, Denver, CO 80202",
  emergencyContactPerson: "Robert Smith",
  emergencyRelationship: "Father",
  emergencyAddress: "100 Sample Lane, Denver, CO 80202",
  emergencyNumber: "555-0103",
  ssnEin: "XXX-XX-1234",
  shirtSize: "Medium",
};

export default function EmployeeFormPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "").toString().trim();
  const shouldShowRecaptcha = siteKey.length > 0;

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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-primary">Success!</h1>
            <p className="text-muted-foreground text-sm">
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
    <div className="min-h-screen bg-background text-foreground flex items-start justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <img src="/logo.svg" alt="Golden Luxury Auto" className="h-10 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-serif text-primary italic">Employee Onboarding</h1>
          <p className="text-muted-foreground text-sm mt-1">Please complete your personal information.</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-8">
            <form
              onSubmit={handleSubmit((values) => {
                if (shouldShowRecaptcha) {
                  const token = recaptchaRef.current?.getValue()?.trim();
                  if (!token) {
                    toast({
                      title: "Verification required",
                      description: "Please complete the reCAPTCHA before submitting.",
                      variant: "destructive",
                    });
                    return;
                  }
                }
                mutation.mutate(values);
              })}
              className="space-y-8"
            >
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-primary border-b border-primary/30 pb-2">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">First Name *</Label>
                    <Input {...register("firstName")} className="bg-card border-border text-foreground" />
                    {errors.firstName && <p className="text-red-700 text-xs">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Last Name *</Label>
                    <Input {...register("lastName")} className="bg-card border-border text-foreground" />
                    {errors.lastName && <p className="text-red-700 text-xs">{errors.lastName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Middle Name</Label>
                    <Input {...register("middleName")} className="bg-card border-border text-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Email *</Label>
                    <Input {...register("email")} type="email" className="bg-card border-border text-foreground" />
                    {errors.email && <p className="text-red-700 text-xs">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Birthday *</Label>
                    <Input 
                      {...register("birthday")} 
                      type="date" 
                      className="bg-card border-border text-foreground [&::-webkit-calendar-picker-indicator]:invert [&::-moz-calendar-picker-indicator]:invert" 
                    />
                    {errors.birthday && <p className="text-red-700 text-xs">{errors.birthday.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Marital Status *</Label>
                    <Select
                      value={watch("maritalStatus")}
                      onValueChange={(v) => setValue("maritalStatus", v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="annulled">Annulled</SelectItem>
                        <SelectItem value="legally separated">Legally Separated</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.maritalStatus && <p className="text-red-700 text-xs">{errors.maritalStatus.message}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-primary border-b border-primary/30 pb-2">Address & Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground">Street *</Label>
                    <Input {...register("street")} className="bg-card border-border text-foreground" />
                    {errors.street && <p className="text-red-700 text-xs">{errors.street.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">City *</Label>
                    <Input {...register("city")} className="bg-card border-border text-foreground" />
                    {errors.city && <p className="text-red-700 text-xs">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">State *</Label>
                    <Input {...register("state")} className="bg-card border-border text-foreground" />
                    {errors.state && <p className="text-red-700 text-xs">{errors.state.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Country *</Label>
                    <Input {...register("country")} className="bg-card border-border text-foreground" />
                    {errors.country && <p className="text-red-700 text-xs">{errors.country.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">ZIP *</Label>
                    <Input {...register("zipCode")} className="bg-card border-border text-foreground" />
                    {errors.zipCode && <p className="text-red-700 text-xs">{errors.zipCode.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Mobile # *</Label>
                    <Input {...register("mobileNumber")} className="bg-card border-border text-foreground" />
                    {errors.mobileNumber && <p className="text-red-700 text-xs">{errors.mobileNumber.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Telephone #</Label>
                    <Input {...register("telephone")} className="bg-card border-border text-foreground" />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-primary border-b border-primary/30 pb-2">Family Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Mother's Name *</Label>
                    <Input {...register("motherName")} className="bg-card border-border text-foreground" />
                    {errors.motherName && <p className="text-red-700 text-xs">{errors.motherName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Father's Name *</Label>
                    <Input {...register("fatherName")} className="bg-card border-border text-foreground" />
                    {errors.fatherName && <p className="text-red-700 text-xs">{errors.fatherName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Home Contact # *</Label>
                    <Input {...register("homeContact")} className="bg-card border-border text-foreground" />
                    {errors.homeContact && <p className="text-red-700 text-xs">{errors.homeContact.message}</p>}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground">Home Address *</Label>
                    <Textarea {...register("homeAddress")} className="bg-card border-border text-foreground min-h-[80px]" />
                    {errors.homeAddress && <p className="text-red-700 text-xs">{errors.homeAddress.message}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-primary border-b border-primary/30 pb-2">Emergency Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Emergency Contact Person *</Label>
                    <Input {...register("emergencyContactPerson")} className="bg-card border-border text-foreground" />
                    {errors.emergencyContactPerson && <p className="text-red-700 text-xs">{errors.emergencyContactPerson.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Relationship *</Label>
                    <Input {...register("emergencyRelationship")} className="bg-card border-border text-foreground" />
                    {errors.emergencyRelationship && <p className="text-red-700 text-xs">{errors.emergencyRelationship.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Contact # *</Label>
                    <Input {...register("emergencyNumber")} className="bg-card border-border text-foreground" />
                    {errors.emergencyNumber && <p className="text-red-700 text-xs">{errors.emergencyNumber.message}</p>}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground">Address *</Label>
                    <Textarea {...register("emergencyAddress")} className="bg-card border-border text-foreground min-h-[80px]" />
                    {errors.emergencyAddress && <p className="text-red-700 text-xs">{errors.emergencyAddress.message}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-primary border-b border-primary/30 pb-2">Other</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">SSN / EIN *</Label>
                    <Input {...register("ssnEin")} className="bg-card border-border text-foreground" />
                    {errors.ssnEin && <p className="text-red-700 text-xs">{errors.ssnEin.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Shirt Size *</Label>
                    <Select
                      value={watch("shirtSize")}
                      onValueChange={(v) => setValue("shirtSize", v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {["Small", "Medium", "Large", "XLarge", "XXLarge"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.shirtSize && <p className="text-red-700 text-xs">{errors.shirtSize.message}</p>}
                  </div>
                </div>
              </section>

              {shouldShowRecaptcha && (
                <div className="pt-2 space-y-1 flex flex-col items-center justify-center">
                  <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} />
                  <p className="text-muted-foreground text-xs">
                    Please complete the verification above before submitting.
                  </p>
                </div>
              )}
              {!shouldShowRecaptcha && (
                <p className="text-muted-foreground text-xs italic">
                  reCAPTCHA is not configured. For production, set VITE_RECAPTCHA_SITE_KEY (frontend) and RECAPTCHA_SECRET_KEY (backend).
                </p>
              )}

              <div className="flex flex-row justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border text-primary hover:bg-card hover:text-primary"
                  onClick={() => form.reset(sampleFormData)}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Auto-fill
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/80 font-medium"
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

