# PDF Reload Issue - Fix Complete

## Problem
The contract signing page (`ContractFormFiller.tsx`) was reloading the PDF document on every keystroke in the text input fields, causing a flickering/disappearing effect.

## Root Causes
1. **Callback Recreation**: `updatePdfPreview` was recreated on every keystroke because it depended on `formFields`, `signatureType`, and `typedName` state.
2. **Debounce Dependency**: The debounce `useEffect` depended on `updatePdfPreview`, so it ran on every keystroke.
3. **Blob URL Changes**: New blob URLs were created on each update, causing react-pdf's `Document` component to reload.
4. **react-pdf Options Warning**: The `options` prop wasn't memoized, causing unnecessary reloads.

## Solution Implemented
**HTML/CSS Text Overlays on Static PDF**

The PDF now:
- Loads once from the original `pdfUrl` and stays static
- Never reloads during user input
- Displays user input as HTML text overlays positioned at exact coordinates
- Only generates the filled PDF when the user clicks "Submit"

### Key Changes

1. **Static PDF with no regeneration**:
   ```tsx
   <Document
     file={pdfUrl}  // Always use original URL, never changes
     onLoadSuccess={({ numPages }) => setNumPages(numPages)}
     options={documentOptions}  // Memoized options
   />
   ```

2. **HTML text overlays for real-time preview**:
   - Each page is wrapped in a `relative` positioned div
   - Text overlays are positioned using `absolute` positioning
   - Coordinates are converted from PDF space (bottom-left origin) to screen space (top-left origin)
   - Font size, family, and color match the PDF (11pt Arial/Helvetica, black)

3. **Coordinate conversion function**:
   ```tsx
   const pdfToScreenCoords = (pdfX, pdfY, pageNumber) => {
     const dims = pageDimensions.get(pageNumber);
     const screenX = pdfX * scale;
     const screenY = (dims.height - pdfY) * scale; // Flip Y axis
     return { x: screenX, y: screenY };
   };
   ```

4. **Real-time text rendering**:
   - As user types, the text overlay updates instantly
   - No PDF regeneration or blob URL creation
   - Smooth, flicker-free experience
   - Signature preview for typed signatures using Dancing Script font

5. **Memoized options prop**:
   ```tsx
   const documentOptions = useMemo(() => ({
     cMapPacked: true,
     httpHeaders: { "Accept": "application/pdf" },
   }), []);
   ```

6. **PDF filling only on submit**:
   - The `generateSignedPdf` function generates the actual filled PDF
   - This only runs when the user clicks "Submit"
   - Uses pdf-lib to embed text and signatures at exact coordinates

## Result
- ✅ PDF loads once and never reloads
- ✅ No flickering or disappearing on keystroke
- ✅ Smooth typing experience
- ✅ Real-time preview of input text as overlays
- ✅ No console errors
- ✅ All form validation and submission logic intact
- ✅ Text appears at correct positions matching PDF coordinates

## Advantages of This Approach
1. **Performance**: No PDF regeneration on every keystroke
2. **Reliability**: Static PDF never triggers react-pdf reloads
3. **User Experience**: Immediate visual feedback without lag
4. **Accuracy**: Exact coordinate positioning for text overlays
5. **Scalability**: Works with any zoom level (text scales with PDF)

## Technical Details

### Coordinate System
- **PDF**: Origin (0,0) at bottom-left, Y increases upward
- **Screen**: Origin (0,0) at top-left, Y increases downward
- **Conversion**: `screenY = (pageHeight - pdfY) * scale`

### Text Styling
- Font: Arial/Helvetica (matches PDF body)
- Size: 11pt scaled by zoom level
- Color: Black (#000000)
- Positioning: Absolute with pointer-events disabled

### Page Dimensions
- Captured on `Page` component load using `onLoadSuccess`
- Stored in state as a Map (pageNumber → dimensions)
- Used for accurate coordinate conversion

## Files Modified
- `LuxuryAutoPortal-Frontend/src/components/contract/ContractFormFiller.tsx`

## Testing
1. Navigate to `/sign-contract/:token`
2. Type in any input field
3. **Expected**: 
   - PDF stays static, no flickering or reloading
   - Text appears on the PDF in real-time as you type
   - Text is positioned at the correct coordinates
4. Change zoom level
5. **Expected**: Text overlays scale with the PDF
6. Fill all required fields and click "Submit"
7. **Expected**: Signed PDF is generated with all fields properly embedded

