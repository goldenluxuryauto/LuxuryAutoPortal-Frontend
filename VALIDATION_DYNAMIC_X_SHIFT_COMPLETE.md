# Form Validation + Dynamic X-Shift for Owner Name - Implementation Complete

## Feature
Comprehensive Zod validation for all contract form fields with real-time error messages, and dynamic X-coordinate shifting for Owner Name field when text exceeds 15 characters.

## Implementation

### 1. Zod Validation Schema

```tsx
const contractFormSchema = z.object({
  owner: z.string().min(1, "Owner name is required").max(30, "Owner name must be 30 characters or less"),
  firstName: z.string().min(1, "First name is required").max(50, "First name must be 50 characters or less"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be 50 characters or less"),
  phone: z.string().min(1, "Phone number is required").max(20, "Phone number must be 20 characters or less"),
  email: z.string().min(1, "Email is required").email("Invalid email format").max(100, "Email must be 100 characters or less"),
  vehicleMake: z.string().min(1, "Vehicle make is required").max(50, "Vehicle make must be 50 characters or less"),
  vehicleModel: z.string().min(1, "Vehicle model is required").max(50, "Vehicle model must be 50 characters or less"),
  vehicleTrim: z.string().max(50, "Vehicle trim must be 50 characters or less").optional().or(z.literal("")),
  exteriorColor: z.string().min(1, "Exterior color is required").max(30, "Exterior color must be 30 characters or less"),
  interiorColor: z.string().max(30, "Interior color must be 30 characters or less").optional().or(z.literal("")),
  licensePlate: z.string().min(1, "License plate is required").max(20, "License plate must be 20 characters or less"),
  vin: z.string().min(1, "VIN number is required").max(17, "VIN must be 17 characters or less"),
  modelYear: z.string().min(1, "Year is required").max(4, "Year must be 4 characters or less"),
  fuelType: z.string().max(20, "Fuel type must be 20 characters or less").optional().or(z.literal("")),
  expectedStartDate: z.string().optional().or(z.literal("")),
  vehicleMileage: z.string().max(10, "Mileage must be 10 characters or less").optional().or(z.literal("")),
  contractDate: z.string().min(1, "Contract date is required"),
  vehicleOwner: z.string().min(1, "Vehicle owner is required").max(50, "Vehicle owner must be 50 characters or less"),
});

type ContractFormData = z.infer<typeof contractFormSchema>;
```

**Key Features**:
- **Required fields**: min(1) ensures field is not empty
- **Max lengths**: Specific limits per field (e.g., Owner Name max 30 chars)
- **Email validation**: Built-in email format checking
- **Optional fields**: Using `.optional().or(z.literal(""))` for fields that can be empty

### 2. FormField Interface with Error Property

```tsx
interface FormField {
  name: string;
  label: string;
  value: string;
  required: boolean;
  type?: "text" | "email" | "tel" | "date";
  error?: string;        // ← NEW: Stores validation error message
  maxLength?: number;     // ← NEW: HTML maxLength attribute
}
```

### 3. Field-Level Validation (On Blur)

```tsx
const validateField = (name: string, value: string): string | undefined => {
  try {
    const fieldSchema = contractFormSchema.shape[name as keyof ContractFormData];
    if (fieldSchema) {
      fieldSchema.parse(value);
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message;
    }
    return undefined;
  }
};

const handleFieldBlur = (name: string, value: string) => {
  const error = validateField(name, value);
  setFormFields((prev) =>
    prev.map((field) => (field.name === name ? { ...field, error } : field))
  );
};
```

**Triggers**:
- When user leaves a field (onBlur event)
- Validates individual field against Zod schema
- Updates error state for that specific field

### 4. Form-Level Validation (On Submit)

```tsx
const validateForm = (): boolean => {
  // Validate all fields with Zod
  const formData: Record<string, string> = {};
  formFields.forEach((field) => {
    formData[field.name] = field.value;
  });

  try {
    contractFormSchema.parse(formData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Update form fields with errors
      const errorMap = new Map(error.errors.map((err) => [err.path[0] as string, err.message]));
      setFormFields((prev) =>
        prev.map((field) => ({
          ...field,
          error: errorMap.get(field.name),
        }))
      );

      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return false;
    }
  }

  // Check signature and agreement...
  return true;
};
```

**Triggers**:
- When user clicks "Sign & Submit"
- Validates entire form at once
- Maps all errors back to form fields
- Shows toast notification if validation fails

### 5. Dynamic X-Shift for Owner Name

```tsx
const calculateOwnerNameX = (ownerName: string): number => {
  const baseX = 350;
  const length = ownerName.length;
  if (length <= 15) {
    return baseX;
  }
  // Shift left by 8px per character over 15
  const shift = (length - 15) * 8;
  return baseX - shift;
};
```

**Logic**:
- **Base X**: 350 (standard starting position)
- **Threshold**: 15 characters
- **Shift Rate**: 8 pixels per character
- **Formula**: `x = 350 - ((length - 15) * 8)`

**Examples**:
- 10 chars → x = 350 (no shift)
- 15 chars → x = 350 (no shift)
- 20 chars → x = 350 - (5 * 8) = 310 (shift left 40px)
- 25 chars → x = 350 - (10 * 8) = 270 (shift left 80px)
- 30 chars → x = 350 - (15 * 8) = 230 (shift left 120px)

### 6. Real-Time Overlay with Dynamic X

```tsx
{formFields.map((field) => {
  const coords = PDF_FIELD_COORDINATES[field.name];
  if (!coords || coords.page !== pageNumber || !field.value) return null;
  
  // Calculate dynamic X for owner name
  const dynamicX = field.name === "owner" ? calculateOwnerNameX(field.value) : coords.x;
  const screenCoords = pdfToScreenCoords(dynamicX, coords.y, pageNumber);
  
  return (
    <div
      key={field.name}
      className="absolute pointer-events-none"
      style={{
        left: `${screenCoords.x}px`,
        top: `${screenCoords.y}px`,
        fontSize: `${11 * scale}px`,
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: 'black',
        whiteSpace: 'nowrap',
        transform: 'translateY(-50%)',
      }}
    >
      {field.value}
    </div>
  );
})}
```

### 7. Final PDF Embedding with Dynamic X

```tsx
for (const field of formFields) {
  if (field.value && PDF_FIELD_COORDINATES[field.name]) {
    const coords = PDF_FIELD_COORDINATES[field.name];
    const page = pages[coords.page - 1] || pages[pages.length - 1];

    // Calculate dynamic X for owner name
    const dynamicX = field.name === "owner" ? calculateOwnerNameX(field.value) : coords.x;

    page.drawText(field.value, {
      x: dynamicX,
      y: coords.y,
      size: 11,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  }
}
```

### 8. Enhanced UI with Error Messages

```tsx
{formFields.map((field) => {
  const hasError = !!field.error;
  const isEmpty = field.required && !field.value.trim();
  
  return (
    <div key={field.name} className="space-y-1">
      <Label htmlFor={field.name} className="text-gray-300 text-sm">
        {field.label}
        {field.required && <span className="text-[#EAEB80] ml-1">*</span>}
        {field.name === "owner" && (
          <span className="text-xs text-gray-400 ml-2">(Max 30 chars)</span>
        )}
      </Label>
      <Input
        id={field.name}
        type={field.type || "text"}
        value={field.value}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        onBlur={(e) => handleFieldBlur(field.name, e.target.value)}
        required={field.required}
        maxLength={field.name === "owner" ? 30 : undefined}
        className={`bg-[#2a2a2a] border text-white focus:border-[#EAEB80] transition-colors ${
          hasError || isEmpty ? "border-red-500 focus:border-red-500" : "border-[#EAEB80]/30"
        }`}
      />
      {field.error && (
        <p className="text-xs text-red-500 mt-1">{field.error}</p>
      )}
      {field.name === "owner" && field.value.length > 15 && !field.error && (
        <p className="text-xs text-[#EAEB80] mt-1">
          Long name detected - text will auto-shift left ({field.value.length} chars)
        </p>
      )}
    </div>
  );
})}
```

**UI Features**:
- **Red border**: Shows on error or if required field is empty
- **Error message**: Displays below input (e.g., "Required", "Max 30 chars")
- **Max length indicator**: Shows "(Max 30 chars)" label for Owner Name
- **HTML maxLength**: Prevents typing beyond 30 characters for Owner Name
- **Auto-shift indicator**: Gold text shows when name >15 chars: "Long name detected - text will auto-shift left (20 chars)"

## User Flow

### Validation on Blur
1. User types in a field
2. User clicks outside the field (blur event)
3. Field is validated against Zod schema
4. If invalid:
   - Red border appears
   - Error message shows below input
5. User corrects the error
6. On next blur, error clears if valid

### Validation on Submit
1. User fills form and clicks "Sign & Submit"
2. Entire form validated
3. If any field is invalid:
   - All error messages appear
   - Red borders highlight invalid fields
   - Toast notification: "Validation Error - Please fix the errors in the form"
   - Form does not submit
4. User fixes all errors
5. Clicks "Sign & Submit" again
6. Form submits successfully

### Dynamic X-Shift for Long Owner Names
1. User types Owner Name: "John Smith" (10 chars)
   - Text appears at x=350 in PDF preview
2. User continues typing: "John Smith Anderson" (20 chars)
   - Text automatically shifts to x=310 (40px left)
   - Gold message appears: "Long name detected - text will auto-shift left (20 chars)"
3. User adds more: "John Smith Anderson Jr" (23 chars)
   - Text shifts to x=286 (64px left)
   - Gold message updates: "Long name detected - text will auto-shift left (23 chars)"
4. HTML maxLength prevents typing beyond 30 characters
5. On submit, PDF is generated with text at calculated X position

## Validation Rules Summary

| Field | Required | Min | Max | Type | Notes |
|-------|----------|-----|-----|------|-------|
| Owner Name | Yes | 1 | 30 | string | Dynamic X-shift >15 chars |
| First Name | Yes | 1 | 50 | string | |
| Last Name | Yes | 1 | 50 | string | |
| Phone | Yes | 1 | 20 | string | |
| Email | Yes | 1 | 100 | email | Format validation |
| Vehicle Make | Yes | 1 | 50 | string | |
| Vehicle Model | Yes | 1 | 50 | string | |
| Vehicle Trim | No | - | 50 | string | Optional |
| Exterior Color | Yes | 1 | 30 | string | |
| Interior Color | No | - | 30 | string | Optional |
| License Plate | Yes | 1 | 20 | string | |
| VIN | Yes | 1 | 17 | string | |
| Year | Yes | 1 | 4 | string | |
| Fuel Type | No | - | 20 | string | Optional |
| Expected Start Date | No | - | - | date | mm/dd/yyyy |
| Vehicle Mileage | No | - | 10 | string | Optional |
| Contract Date | Yes | 1 | - | string | Auto-filled |
| Vehicle Owner | Yes | 1 | 50 | string | |

## Result
✅ Zod validation for all form fields
✅ Real-time validation on blur
✅ Form-wide validation on submit
✅ Red borders and error messages for invalid fields
✅ Owner Name max 30 characters (HTML maxLength)
✅ Dynamic X-shift for Owner Name when length >15
✅ Auto-shift indicator message in gold
✅ Real-time preview with shifted text
✅ Final PDF embedded with correct shifted X position
✅ Smooth UX with clear error feedback

## Testing

### Test Validation
1. Go to contract signing page
2. Leave required fields empty
3. Click "Sign & Submit"
4. **You should see**:
   - Red borders on all empty required fields
   - Error messages: "Owner name is required", etc.
   - Toast: "Validation Error - Please fix the errors in the form"
5. Fill Owner Name with 35 characters
6. **You should see**:
   - Input stops at 30 characters (HTML maxLength)
7. Type invalid email (e.g., "notanemail")
8. Click outside email field
9. **You should see**:
   - Red border on email field
   - Error: "Invalid email format"

### Test Dynamic X-Shift
1. Type Owner Name: "John" (4 chars)
2. **You should see**:
   - Text at x=350 in PDF preview
   - No shift message
3. Type: "John Smith Anderson" (20 chars)
4. **You should see**:
   - Text shifts left to x=310 in PDF preview
   - Gold message: "Long name detected - text will auto-shift left (20 chars)"
5. Zoom in/out - text should scale and maintain shifted position
6. Sign and submit
7. Open signed PDF
8. **You should see**:
   - Owner name embedded at x=310 (shifted position)

Perfect validation and dynamic positioning! 🎯✅

