# Owner Name Auto-Fill at Exact Coordinates - Implementation Complete

## Feature
Automatic pre-fill of Owner Name field from database with real-time display at exact PDF coordinates (Page 1, x: 340, y: 620) using Arial/Helvetica 12pt black font.

## Implementation

### 1. PDF Field Coordinates - Owner Name

```tsx
const PDF_FIELD_COORDINATES: Record<string, { page: number; x: number; y: number }> = {
  // Owner information - exact coordinates as specified
  owner: { page: 1, x: 340, y: 620 },
  firstName: { page: 1, x: 144, y: 388 },
  lastName: { page: 1, x: 360, y: 388 },
  // ... other fields
};
```

**Owner Name Coordinates**:
- **Page**: 1 (first page)
- **X**: 340 (exact position specified)
- **Y**: 620 (PDF coordinate system, bottom-left origin)

### 2. Form Field Pre-fill from Database

```tsx
const [formFields, setFormFields] = useState<FormField[]>([
  // Owner information
  { 
    name: "owner", 
    label: "Owner Name", 
    value: onboardingData 
      ? `${onboardingData.firstNameOwner || ""} ${onboardingData.lastNameOwner || ""}`.trim() 
      : "", 
    required: true, 
    maxLength: 30 
  },
  // ... other fields
]);
```

**Pre-fill Logic**:
- Combines `firstNameOwner` and `lastNameOwner` from `onboardingData`
- Trims whitespace to avoid leading/trailing spaces
- Falls back to empty string if no data available
- Max length: 30 characters

### 3. Dynamic X-Shift Calculation (Updated Base X)

```tsx
const calculateOwnerNameX = (ownerName: string): number => {
  const baseX = 340; // Updated to match exact coordinate specification
  const length = ownerName.length;
  if (length <= 15) {
    return baseX;
  }
  // Shift left by 8px per character over 15
  const shift = (length - 15) * 8;
  return baseX - shift;
};
```

**Updated Base X**: 340 (previously 350)

**Examples**:
- 10 chars → x = 340 (no shift)
- 15 chars → x = 340 (no shift)
- 20 chars → x = 340 - (5 * 8) = 300 (shift left 40px)
- 30 chars → x = 340 - (15 * 8) = 220 (shift left 120px)

### 4. Real-Time Overlay Display

```tsx
{formFields.map((field) => {
  const coords = PDF_FIELD_COORDINATES[field.name];
  if (!coords || coords.page !== pageNumber || !field.value) return null;
  
  // Calculate dynamic X for owner name
  const dynamicX = field.name === "owner" ? calculateOwnerNameX(field.value) : coords.x;
  
  // Wrap text if longer than 20 characters
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
              fontSize: `${12 * scale}px`, // 12pt font as specified
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

**Owner Name Display**:
- **Font**: Arial/Helvetica (web standard)
- **Size**: 12pt (scales with zoom)
- **Color**: Black
- **Position**: (340, 620) or dynamically shifted if >15 chars
- **Wrapping**: Applies if >20 chars (with dynamic X on each line)

### 5. Final PDF Embedding

```tsx
const generateSignedPdf = async (): Promise<Blob> => {
  if (!pdfBytes) throw new Error("PDF not loaded");

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // Font size: 12pt for better readability with wrapping
  const fontSize = 12;
  const lineHeight = 14; // 14pt line height for 12pt font
  const textColor = rgb(0, 0, 0);

  // Fill form fields with text wrapping support
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
            y: pos.y - (index * lineHeight), // Move down for each line
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

**Owner Name Embedding**:
- **Font**: Helvetica (PDF standard, equivalent to Arial)
- **Size**: 12pt
- **Color**: Black (rgb(0, 0, 0))
- **Position**: Dynamic X at y=620
- **Wrapping**: Multi-line if >20 chars

### 6. Form Input UI

```tsx
<Label htmlFor="owner" className="text-gray-300 text-sm">
  Owner Name
  <span className="text-[#EAEB80] ml-1">*</span>
  <span className="text-xs text-gray-400 ml-2">(Max 30 chars)</span>
</Label>
<Input
  id="owner"
  type="text"
  value={ownerFieldValue}
  onChange={(e) => handleFieldChange("owner", e.target.value)}
  onBlur={(e) => handleFieldBlur("owner", e.target.value)}
  required={true}
  maxLength={30}
  className={`bg-[#2a2a2a] border text-white focus:border-[#EAEB80] transition-colors ${
    hasError || isEmpty ? "border-red-500 focus:border-red-500" : "border-[#EAEB80]/30"
  }`}
/>
{error && <p className="text-xs text-red-500 mt-1">{error}</p>}
{ownerFieldValue.length > 15 && !error && (
  <p className="text-xs text-[#EAEB80] mt-1">
    Long name detected - text will auto-shift left ({ownerFieldValue.length} chars)
  </p>
)}
```

**UI Features**:
- **Required field**: Red asterisk (*)
- **Max length indicator**: "(Max 30 chars)"
- **HTML maxLength**: Prevents typing beyond 30 characters
- **Auto-shift indicator**: Shows when >15 chars
- **Validation**: Zod schema ensures required and max 30 chars
- **Error display**: Red border + error message below input

### 7. Validation Schema

```tsx
const contractFormSchema = z.object({
  owner: z.string().min(1, "Owner name is required").max(30, "Owner name must be 30 characters or less"),
  // ... other fields
});
```

**Validation Rules**:
- **Required**: Must have at least 1 character
- **Max length**: 30 characters
- **Error messages**: Clear feedback for validation failures

## Data Flow

### Pre-fill on Page Load
```
Contract signing page loads with token
      ↓
Fetch onboardingData from backend
      ↓
Combine firstNameOwner + lastNameOwner
      ↓
Set as initial value for "owner" field
      ↓
Owner Name appears in input (pre-filled)
      ↓
Real-time overlay shows at (340, 620) on page 1
```

### User Edits Owner Name
```
User types in Owner Name input
      ↓
handleFieldChange("owner", newValue)
      ↓
Update formFields state
      ↓
Real-time overlay updates immediately
      ↓
If length > 15: Calculate dynamic X-shift
      ↓
Display at shifted X position
      ↓
If length > 20: Wrap to multiple lines
      ↓
Show indicator: "Long name detected - text will auto-shift left (23 chars)"
```

### Final PDF Generation
```
User clicks "Sign & Submit"
      ↓
Validate form (including owner name)
      ↓
Generate PDF with pdf-lib
      ↓
Embed owner name at (340, 620) or shifted X
      ↓
If >20 chars: Embed as multiple lines
      ↓
Save signed PDF
      ↓
Update database status
```

## Coordinate System

### PDF Coordinates (Bottom-Left Origin)
```
Page 1
     ↑ Y increases UPWARD
     |
     |  y=620 ← Owner Name position
     |
     |
     └──────────→ X increases RIGHT
   (0,0)          x=340
```

### Screen Coordinates (Top-Left Origin)
```
Page 1
   (0,0)
   ┌──────────→ X increases RIGHT
   |            x=340
   |
   |  Owner Name ← converted from (340, 620)
   |
   ↓
Y increases DOWNWARD
```

## Font Specifications

| Property | Preview (Web) | Final PDF |
|----------|---------------|-----------|
| Font Family | Arial, Helvetica, sans-serif | Helvetica (StandardFonts) |
| Font Size | 12pt | 12pt |
| Line Height | 14pt | 14pt |
| Color | black (#000) | rgb(0, 0, 0) |
| Weight | normal | normal |

## Examples

### Example 1: Short Owner Name (No Shift, No Wrap)
```
Input: "John Doe"
Length: 8 characters
X Position: 340 (base, no shift)
Wrap: No (≤20 chars)
Lines: 1

Preview Display:
  "John Doe" at screen coords from (340, 620)

Final PDF:
  "John Doe" at (340, 620)
```

### Example 2: Long Owner Name (Shift, No Wrap)
```
Input: "Christopher Smith"
Length: 17 characters
X Position: 340 - ((17-15) * 8) = 324 (shift left 16px)
Wrap: No (≤20 chars)
Lines: 1
Indicator: "Long name detected - text will auto-shift left (17 chars)"

Preview Display:
  "Christopher Smith" at screen coords from (324, 620)

Final PDF:
  "Christopher Smith" at (324, 620)
```

### Example 3: Very Long Owner Name (Shift + Wrap)
```
Input: "Christopher Alexander Montgomery"
Length: 33 characters → truncated to 30 by maxLength
Actual: "Christopher Alexander Mont"
Length: 26 characters
X Position: 340 - ((26-15) * 8) = 252 (shift left 88px)
Wrap: Yes (>20 chars)
Lines: ["Christopher", "Alexander Mont"]
Indicator: "Long name detected - text will auto-shift left (26 chars)"

Preview Display:
  Line 1: "Christopher" at screen coords from (252, 620)
  Line 2: "Alexander Mont" at screen coords from (252, 606)

Final PDF:
  Line 1: "Christopher" at (252, 620)
  Line 2: "Alexander Mont" at (252, 606)
```

## Result
✅ Owner Name pre-filled from database (firstNameOwner + lastNameOwner)
✅ Displayed at exact coordinates: Page 1, x: 340, y: 620
✅ Font: Arial/Helvetica 12pt black (matches body)
✅ Real-time overlay updates on input change
✅ Dynamic X-shift for names >15 characters (base 340, shift 8px/char)
✅ Text wrapping for names >20 characters (word-aware)
✅ HTML maxLength=30 prevents over-typing
✅ Zod validation: required, max 30 chars
✅ Clear UI indicators for long names
✅ Final PDF embeds at exact/shifted position

## Testing

### Test Pre-fill
1. Go to contract signing page with valid token
2. **You should see**:
   - Owner Name input pre-filled with "FirstName LastName" from database
   - Text displayed at (340, 620) on page 1 in PDF preview
   - Font: Arial 12pt black

### Test Short Name (No Shift)
1. Clear Owner Name input
2. Type: "John Doe" (8 chars)
3. **You should see**:
   - Text at x=340 (base position)
   - No shift indicator
   - Single line

### Test Long Name (With Shift)
1. Type: "Christopher Smith" (17 chars)
2. **You should see**:
   - Text shifted left to x=324
   - Gold indicator: "Long name detected - text will auto-shift left (17 chars)"
   - Single line

### Test Very Long Name (Shift + Wrap)
1. Type: "Christopher Alexander" (21 chars)
2. **You should see**:
   - Line 1: "Christopher" at shifted X
   - Line 2: "Alexander" below
   - Gold indicator showing shift
   - Both lines in preview

### Test Max Length
1. Try typing 35 characters
2. **You should see**:
   - Input stops at 30 characters (HTML maxLength)
   - Cannot type beyond limit

### Test Validation
1. Clear Owner Name input
2. Click "Sign & Submit"
3. **You should see**:
   - Red border on Owner Name input
   - Error: "Owner name is required"
   - Toast: "Validation Error"

Perfect Owner Name auto-fill with exact positioning! ✅🎯

