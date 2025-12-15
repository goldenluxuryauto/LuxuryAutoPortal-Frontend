# Dynamic Owner Name Fill Validation with X Position Adjustment - Implementation Complete

## Feature
Owner Name field with max 20 characters validation and dynamic X-position adjustment for long names (>15 chars) using 8pt character width calculation.

## Implementation

### 1. Updated Zod Validation Schema

```tsx
const contractFormSchema = z.object({
  owner: z.string().min(1, "Owner name is required").max(20, "Max 20 characters"),
  // ... other fields
});
```

**Validation Rules**:
- **Required**: Must have at least 1 character
- **Max length**: 20 characters (reduced from 30)
- **Error message**: "Max 20 characters" (clear and concise)

### 2. Dynamic X-Shift Calculation (Updated)

```tsx
// Calculate dynamic X position for Owner Name based on length
// Character width: ~8pt for Arial 12pt font
const calculateOwnerNameX = (ownerName: string): number => {
  const baseX = 340; // Standard starting position
  const length = ownerName.length;
  const charWidth = 8; // 8pt character width for Arial 12pt
  
  if (length <= 15) {
    return baseX;
  }
  // Shift left by charWidth (8pt) per character over 15
  const shift = (length - 15) * charWidth;
  return baseX - shift;
};
```

**Key Parameters**:
- **Base X**: 340 (standard starting position)
- **Threshold**: 15 characters (no shift if ≤15)
- **Character Width**: 8pt (for Arial 12pt font)
- **Shift Formula**: `shift = (length - 15) * 8`

**Examples**:
| Length | Calculation | X Position | Shift |
|--------|-------------|------------|-------|
| 10 chars | baseX (≤15) | 340 | 0pt |
| 15 chars | baseX (≤15) | 340 | 0pt |
| 18 chars | 340 - ((18-15) * 8) | 316 | 24pt left |
| 20 chars | 340 - ((20-15) * 8) | 300 | 40pt left |

### 3. Form Field Configuration

```tsx
const [formFields, setFormFields] = useState<FormField[]>([
  { 
    name: "owner", 
    label: "Owner Name", 
    value: onboardingData 
      ? `${onboardingData.firstNameOwner || ""} ${onboardingData.lastNameOwner || ""}`.trim() 
      : "", 
    required: true, 
    maxLength: 20  // Updated from 30
  },
  // ... other fields
]);
```

**Field Properties**:
- **Max length**: 20 characters (HTML maxLength attribute)
- **Pre-fill**: From database (firstNameOwner + lastNameOwner)
- **Required**: Yes (Zod validation)

### 4. UI Updates

```tsx
<Label htmlFor="owner" className="text-gray-300 text-sm">
  Owner Name
  <span className="text-[#EAEB80] ml-1">*</span>
  <span className="text-xs text-gray-400 ml-2">(Max 20 chars)</span>
</Label>
<Input
  id="owner"
  type="text"
  value={ownerFieldValue}
  onChange={(e) => handleFieldChange("owner", e.target.value)}
  onBlur={(e) => handleFieldBlur("owner", e.target.value)}
  required={true}
  maxLength={20}  // Updated from 30
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
```

**UI Features**:
- **Max length indicator**: "(Max 20 chars)" label
- **HTML maxLength**: Prevents typing beyond 20 characters
- **Auto-shift indicator**: Shows when >15 chars
- **Error display**: Red border + "Max 20 characters" message

### 5. Real-Time Preview with Dynamic X

```tsx
{formFields.map((field) => {
  const coords = PDF_FIELD_COORDINATES[field.name];
  if (!coords || coords.page !== pageNumber || !field.value) return null;
  
  // Calculate dynamic X for owner name
  const dynamicX = field.name === "owner" ? calculateOwnerNameX(field.value) : coords.x;
  
  // Wrap text if longer than 20 characters (but owner max is 20, so no wrap)
  const lines = wrapText(field.value, 20);
  const lineHeight = 14; // 14pt line height for 12pt font
  
  return (
    <div key={field.name}>
      {lines.map((line, lineIndex) => {
        const screenCoords = pdfToScreenCoords(
          dynamicX, 
          coords.y - (lineIndex * lineHeight), 
          pageNumber
        );
        
        return (
          <div
            key={`${field.name}-line-${lineIndex}`}
            className="absolute pointer-events-none"
            style={{
              left: `${screenCoords.x}px`,
              top: `${screenCoords.y}px`,
              fontSize: `${12 * scale}px`, // 12pt font
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: 'black',
              whiteSpace: 'nowrap',
              transform: 'translateY(-50%)',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
})}
```

**Real-Time Display**:
- **Dynamic X**: Calculated based on length (340 or shifted)
- **Font**: Arial/Helvetica 12pt black
- **Position**: Page 1, x=dynamicX, y=620
- **Updates**: Instantly on input change (no debounce needed for overlay)

### 6. Final PDF Embedding with Dynamic X

```tsx
const generateSignedPdf = async (): Promise<Blob> => {
  if (!pdfBytes) throw new Error("PDF not loaded");

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const fontSize = 12;
  const lineHeight = 14;
  const textColor = rgb(0, 0, 0);

  for (const field of formFields) {
    if (field.value && PDF_FIELD_COORDINATES[field.name]) {
      const pos = PDF_FIELD_COORDINATES[field.name];
      const pageIndex = pos.page - 1;

      if (pageIndex >= 0 && pageIndex < pages.length) {
        const targetPage = pages[pageIndex];
        
        // Calculate dynamic X for owner name
        const dynamicX = field.name === "owner" ? calculateOwnerNameX(field.value) : pos.x;
        
        // Wrap text if longer than 20 characters
        const lines = wrapText(field.value.trim(), 20);
        
        lines.forEach((line, index) => {
          targetPage.drawText(line, {
            x: dynamicX,
            y: pos.y - (index * lineHeight),
            size: fontSize,
            font: helveticaFont,
            color: textColor,
          });
        });
      }
    }
  }
  
  // ... signature and date embedding
};
```

**Final PDF Embedding**:
- **Dynamic X**: Calculated using same formula
- **Font**: Helvetica 12pt (PDF standard)
- **Color**: Black (rgb(0, 0, 0))
- **Position**: Page 1, x=dynamicX, y=620

## Character Width Calculation

### Arial 12pt Font Metrics
- **Average character width**: ~8pt for standard characters
- **Monospace assumption**: Simplified calculation using 8pt per character
- **Actual width varies**: By character (e.g., 'i' vs 'W'), but 8pt is a good average

### Shift Calculation Examples

**Example 1: 10 characters**
```
Length: 10
Threshold: 15
Shift: 0 (10 ≤ 15)
X Position: 340
```

**Example 2: 18 characters**
```
Length: 18
Threshold: 15
Characters over threshold: 18 - 15 = 3
Shift: 3 * 8pt = 24pt
X Position: 340 - 24 = 316
```

**Example 3: 20 characters (max)**
```
Length: 20
Threshold: 15
Characters over threshold: 20 - 15 = 5
Shift: 5 * 8pt = 40pt
X Position: 340 - 40 = 300
```

## Validation Flow

### On Input Change
```
User types in Owner Name input
      ↓
handleFieldChange("owner", newValue)
      ↓
Update formFields state
      ↓
If length > 20: HTML maxLength prevents typing
      ↓
Real-time overlay updates with dynamic X
      ↓
If length > 15: Show gold indicator
```

### On Blur (Field Validation)
```
User leaves Owner Name field
      ↓
handleFieldBlur("owner", value)
      ↓
validateField("owner", value)
      ↓
Zod schema validation
      ↓
If invalid:
  - Set error: "Max 20 characters"
  - Show red border
  - Display error message
If valid:
  - Clear error
  - Show normal border
```

### On Submit (Form Validation)
```
User clicks "Sign & Submit"
      ↓
validateForm()
      ↓
Zod schema.parse(formData)
      ↓
If owner name > 20 chars:
  - Error: "Max 20 characters"
  - Red border on input
  - Toast: "Validation Error"
  - Form does not submit
If valid:
  - Generate PDF with dynamic X
  - Submit successfully
```

## Result
✅ Max length: 20 characters (reduced from 30)
✅ Zod validation: "Max 20 characters" error message
✅ HTML maxLength: Prevents typing beyond 20
✅ Dynamic X-shift: Base 340, threshold 15, 8pt per char
✅ Character width: 8pt for Arial 12pt font
✅ Real-time preview: Updates instantly with shifted X
✅ Final PDF: Embedded at calculated dynamic X position
✅ UI indicators: "(Max 20 chars)" label + auto-shift message
✅ Smooth UX: No lag, clear validation feedback

## Testing

### Test Short Name (No Shift)
1. Go to contract signing page
2. Type Owner Name: "John Doe" (8 chars)
3. **You should see**:
   - Text at x=340 (base position)
   - No shift indicator
   - No validation errors

### Test Long Name (With Shift)
1. Type Owner Name: "Christopher Smith" (17 chars)
2. **You should see**:
   - Text shifted to x=340 - ((17-15) * 8) = 324
   - Gold indicator: "Long name detected - text will auto-shift left (17 chars)"
   - No validation errors (≤20)

### Test Max Length (20 chars)
1. Type Owner Name: "Christopher Alexander" (22 chars)
2. **You should see**:
   - Input stops at 20 characters (HTML maxLength)
   - Cannot type beyond 20
   - If somehow 21+ chars entered: Error "Max 20 characters"

### Test Validation Error
1. Try to paste 25 characters into Owner Name
2. **You should see**:
   - Input accepts only 20 characters (maxLength)
   - If validation runs: Error "Max 20 characters"
   - Red border on input
   - Error message below input

### Test Dynamic X Calculation
1. Type: "John" (4 chars) → x=340
2. Type: "John Smith" (10 chars) → x=340
3. Type: "John Smith Anderson" (18 chars) → x=316 (shifted 24pt)
4. Type: "John Smith Anderson Jr" (22 chars) → maxLength stops at 20
5. **Verify**: Each step shows correct X position in preview

Perfect dynamic X-shift validation with 20 character limit! ✅🎯

