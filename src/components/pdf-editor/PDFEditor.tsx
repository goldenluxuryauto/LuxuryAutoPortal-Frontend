import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Printer,
  Type,
  PenTool,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  page: number;
  fontSize: number;
  color: string;
}

interface SignatureAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  imageData: string;
}

interface PDFEditorProps {
  pdfUrl: string;
  onSign?: (signedPdfBlob: Blob) => Promise<void>;
  contractId?: number;
  onSignReady?: (signFn: () => Promise<Blob>) => void;
}

// Memoized Text Annotation Component with drag and resize
const TextAnnotationBox = memo(({ 
  annotation, 
  scale, 
  isEditing, 
  onEdit, 
  onChange, 
  onBlur,
  onPositionChange,
  onSizeChange
}: { 
  annotation: TextAnnotation; 
  scale: number; 
  isEditing: boolean;
  onEdit: () => void;
  onChange: (text: string) => void;
  onBlur: () => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - annotation.x * scale,
      y: e.clientY - annotation.y * scale
    };
  }, [isEditing, annotation.x, annotation.y, scale]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      width: annotation.width,
      height: annotation.height,
      mouseX: e.clientX,
      mouseY: e.clientY
    };
  }, [annotation.width, annotation.height]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (isDragging) {
        const newX = (e.clientX - dragStartRef.current.x) / scale;
        const newY = (e.clientY - dragStartRef.current.y) / scale;
        onPositionChange(newX, newY);
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.mouseX;
        const deltaY = e.clientY - resizeStartRef.current.mouseY;
        const newWidth = Math.max(100, resizeStartRef.current.width + deltaX / scale);
        const newHeight = Math.max(30, resizeStartRef.current.height + deltaY / scale);
        onSizeChange(newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, scale, onPositionChange, onSizeChange]);

  return (
    <div
      className={cn(
        "absolute rounded group",
        isEditing 
          ? "border-2 border-blue-600 bg-white/95 shadow-lg" 
          : "border border-transparent bg-transparent hover:border-blue-300 hover:bg-white/10 cursor-move"
      )}
      style={{
        left: `${annotation.x * scale}px`,
        top: `${annotation.y * scale}px`,
        width: `${annotation.width * scale}px`,
        height: `${annotation.height * scale}px`,
        minWidth: "100px",
        minHeight: "30px",
        zIndex: isEditing ? 1000 : 999,
        padding: "1px",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing && !isDragging && !isResizing) {
          onEdit();
        }
      }}
    >
      {isEditing ? (
        <input
          type="text"
          value={annotation.text}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.value);
          }}
          onBlur={(e) => {
            e.stopPropagation();
            onBlur();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              onBlur();
            }
          }}
          className="w-full h-full border-none outline-none bg-transparent font-sans text-center"
          autoFocus
          style={{ 
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: `${annotation.fontSize}pt`,
            color: annotation.color,
            padding: "1px",
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none text-center"
          style={{ 
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: `${annotation.fontSize}pt`,
            color: annotation.color,
            padding: "1px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {annotation.text || ""}
        </div>
      )}
      
      {/* Resize Handle - only visible when hovering and not editing */}
      {!isEditing && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-tl hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={handleResizeMouseDown}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.annotation.id === nextProps.annotation.id &&
    prevProps.annotation.text === nextProps.annotation.text &&
    prevProps.annotation.x === nextProps.annotation.x &&
    prevProps.annotation.y === nextProps.annotation.y &&
    prevProps.annotation.width === nextProps.annotation.width &&
    prevProps.annotation.height === nextProps.annotation.height &&
    prevProps.annotation.fontSize === nextProps.annotation.fontSize &&
    prevProps.scale === nextProps.scale &&
    prevProps.isEditing === nextProps.isEditing
  );
});

TextAnnotationBox.displayName = "TextAnnotationBox";

// Memoized Signature Annotation Component with drag and resize
const SignatureAnnotationBox = memo(({ 
  annotation, 
  scale, 
  tool,
  isSelected,
  onSelect,
  onRemove,
  onPositionChange,
  onSizeChange
}: { 
  annotation: SignatureAnnotation; 
  scale: number; 
  tool: string;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - annotation.x * scale,
      y: e.clientY - annotation.y * scale
    };
  }, [annotation.x, annotation.y, scale, onSelect]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      width: annotation.width,
      height: annotation.height,
      mouseX: e.clientX,
      mouseY: e.clientY
    };
  }, [annotation.width, annotation.height]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (isDragging) {
        const newX = (e.clientX - dragStartRef.current.x) / scale;
        const newY = (e.clientY - dragStartRef.current.y) / scale;
        onPositionChange(newX, newY);
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.mouseX;
        const deltaY = e.clientY - resizeStartRef.current.mouseY;
        const newWidth = Math.max(50, resizeStartRef.current.width + deltaX / scale);
        const newHeight = Math.max(25, resizeStartRef.current.height + deltaY / scale);
        onSizeChange(newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, scale, onPositionChange, onSizeChange]);

  return (
    <div
      className={cn(
        "absolute rounded group",
        isSelected
          ? "border-2 border-green-600 bg-white/95 shadow-lg cursor-move" 
          : "border border-transparent bg-transparent hover:border-green-300 hover:bg-white/10 cursor-move"
      )}
      style={{
        left: `${annotation.x * scale}px`,
        top: `${annotation.y * scale}px`,
        width: `${annotation.width * scale}px`,
        height: `${annotation.height * scale}px`,
        zIndex: isSelected ? 1000 : 999,
        padding: "1px",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <img
        src={annotation.imageData}
        alt="Signature"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      
      {/* Delete button - only visible when selected */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 z-10"
          title="Remove signature"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      {/* Resize Handle - only visible when hovering and selected */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 cursor-se-resize rounded-tl hover:bg-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={handleResizeMouseDown}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.annotation.id === nextProps.annotation.id &&
    prevProps.annotation.x === nextProps.annotation.x &&
    prevProps.annotation.y === nextProps.annotation.y &&
    prevProps.annotation.width === nextProps.annotation.width &&
    prevProps.annotation.height === nextProps.annotation.height &&
    prevProps.scale === nextProps.scale &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.tool === nextProps.tool
  );
});

SignatureAnnotationBox.displayName = "SignatureAnnotationBox";

// Memoized PDF Page Component - prevents re-render when annotations change
const PDFPageWithAnnotations = memo(({ 
  pageNumber,
  scale,
  textAnnotations,
  signatureAnnotations,
  editingTextId,
  selectedSignatureId,
  tool,
  onTextEdit,
  onTextChange,
  onTextBlur,
  onTextPositionChange,
  onTextSizeChange,
  onSignatureSelect,
  onSignatureRemove,
  onSignaturePositionChange,
  onSignatureSizeChange,
  onPageClick
}: {
  pageNumber: number;
  scale: number;
  textAnnotations: TextAnnotation[];
  signatureAnnotations: SignatureAnnotation[];
  editingTextId: string | null;
  selectedSignatureId: string | null;
  tool: string;
  onTextEdit: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onTextBlur: () => void;
  onTextPositionChange: (id: string, x: number, y: number) => void;
  onTextSizeChange: (id: string, width: number, height: number) => void;
  onSignatureSelect: (id: string) => void;
  onSignatureRemove: (id: string) => void;
  onSignaturePositionChange: (id: string, x: number, y: number) => void;
  onSignatureSizeChange: (id: string, width: number, height: number) => void;
  onPageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) => {
  return (
    <div
      className="relative mb-4"
      onClick={onPageClick}
      style={{ cursor: 'inherit' }}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        className="shadow-lg"
      />
      
      {/* Text Annotations Overlay */}
      {textAnnotations
        .filter((ann) => ann.page === pageNumber)
        .map((annotation) => (
          <TextAnnotationBox
            key={annotation.id}
            annotation={annotation}
            scale={scale}
            isEditing={editingTextId === annotation.id}
            onEdit={() => onTextEdit(annotation.id)}
            onChange={(newText) => onTextChange(annotation.id, newText)}
            onBlur={onTextBlur}
            onPositionChange={(x, y) => onTextPositionChange(annotation.id, x, y)}
            onSizeChange={(width, height) => onTextSizeChange(annotation.id, width, height)}
          />
        ))}

      {/* Signature Annotations Overlay */}
      {signatureAnnotations
        .filter((ann) => ann.page === pageNumber)
        .map((annotation) => (
          <SignatureAnnotationBox
            key={annotation.id}
            annotation={annotation}
            scale={scale}
            tool={tool}
            isSelected={selectedSignatureId === annotation.id}
            onSelect={() => onSignatureSelect(annotation.id)}
            onRemove={() => onSignatureRemove(annotation.id)}
            onPositionChange={(x, y) => onSignaturePositionChange(annotation.id, x, y)}
            onSizeChange={(width, height) => onSignatureSizeChange(annotation.id, width, height)}
          />
        ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these specific props change
  return (
    prevProps.pageNumber === nextProps.pageNumber &&
    prevProps.scale === nextProps.scale &&
    prevProps.editingTextId === nextProps.editingTextId &&
    prevProps.tool === nextProps.tool &&
    prevProps.textAnnotations === nextProps.textAnnotations &&
    prevProps.signatureAnnotations === nextProps.signatureAnnotations
  );
});

PDFPageWithAnnotations.displayName = "PDFPageWithAnnotations";

export function PDFEditor({ pdfUrl, onSign, contractId, onSignReady }: PDFEditorProps) {
  const [scale, setScale] = useState(1.0);
  const [numPages, setNumPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "text" | "signature">("select");
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [signatureAnnotations, setSignatureAnnotations] = useState<SignatureAnnotation[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<"type" | "draw" | "upload">("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [signaturePlacementMode, setSignaturePlacementMode] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const signatureCanvasRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<PDFDocument | null>(null);

  // Memoize Document options to prevent reloads (fixes the warning and reload issue)
  const documentOptions = useMemo(() => ({
    cMapPacked: true,
    httpHeaders: { "Accept": "application/pdf" },
  }), []);

  // Memoize callbacks to prevent re-renders
  const handleTextEditCallback = useCallback((id: string) => {
    setEditingTextId(id);
  }, []);

  const handleTextBlurCallback = useCallback(() => {
    setEditingTextId(null);
  }, []);

  // Handle text annotation change with useCallback to prevent re-renders
  const handleTextChange = useCallback((annotationId: string, newText: string) => {
    setTextAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId
          ? { ...ann, text: newText }
          : ann
      )
    );
  }, []);

  // Handle text position change (drag)
  const handleTextPositionChange = useCallback((annotationId: string, x: number, y: number) => {
    setTextAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId
          ? { ...ann, x, y }
          : ann
      )
    );
  }, []);

  // Handle text size change (resize) - also adjust font size proportionally
  const handleTextSizeChange = useCallback((annotationId: string, width: number, height: number) => {
    setTextAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.id === annotationId) {
          // Calculate font size based on box height
          // Use height as the primary factor, ensuring text fills the space
          const newFontSize = Math.max(8, Math.min(48, Math.floor(height * 0.4)));
          return { ...ann, width, height, fontSize: newFontSize };
        }
        return ann;
      })
    );
  }, []);

  // Handle signature removal with useCallback
  const handleSignatureRemove = useCallback((annotationId: string) => {
    setSignatureAnnotations((prev) =>
      prev.filter((ann) => ann.id !== annotationId)
    );
    setSelectedSignatureId(null);
  }, []);

  // Handle signature position change (drag)
  const handleSignaturePositionChange = useCallback((annotationId: string, x: number, y: number) => {
    setSignatureAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId
          ? { ...ann, x, y }
          : ann
      )
    );
  }, []);

  // Handle signature size change (resize)
  const handleSignatureSizeChange = useCallback((annotationId: string, width: number, height: number) => {
    setSignatureAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId
          ? { ...ann, width, height }
          : ann
      )
    );
  }, []);

  // Set initial scale to fit width on mount
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 64;
      const calculatedScale = containerWidth / 612; // Standard PDF page width
      setScale(calculatedScale);
    }
  }, []);

  // PDF load handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setPdfError(error.message);
  };

  // Text tool - simplified (no modal, direct placement)
  const handleTextClick = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (tool !== "text") return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / scale) - 20;
    const y = ((e.clientY - rect.top) / scale) - 10;
    
    const initialHeight = 60;
    const initialFontSize = Math.floor(initialHeight * 0.4); // 24pt for 60px height
    
    const newText: TextAnnotation = {
      id: `text-${Date.now()}`,
      x,
      y,
      text: "",
      width: 200,
      height: initialHeight,
      page: pageNum,
      fontSize: initialFontSize,
      color: "#000000",
    };
    
    setTextAnnotations((prev) => [...prev, newText]);
    setEditingTextId(newText.id);
    setTool("select");
  }, [tool, scale]);

  // Signature tool
  const handleSignatureClick = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    console.log('handleSignatureClick called', { signaturePlacementMode, hasPendingSignature: !!pendingSignature });
    
    if (!signaturePlacementMode || !pendingSignature) {
      console.log('Exiting early - no placement mode or no pending signature');
      return;
    }
    
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / scale) - 75;
    const y = ((e.clientY - rect.top) / scale) - 37.5;
    
    console.log('Creating signature at', { x, y, pageNum });
    
    const newSignature: SignatureAnnotation = {
      id: `sig-${Date.now()}`,
      x,
      y,
      width: 150,
      height: 75,
      page: pageNum,
      imageData: pendingSignature,
    };
    
    setSignatureAnnotations((prev) => [...prev, newSignature]);
    setSelectedSignatureId(newSignature.id);
    setPendingSignature(null);
    setSignaturePlacementMode(false);
    setTool("select");
    document.body.style.cursor = "default";
    
    console.log('Signature created successfully');
  }, [scale, pendingSignature, signaturePlacementMode]);

  // Signature modal handlers
  const handleDrawSignature = () => {
    if (signatureCanvasRef.current && !signatureCanvasRef.current.isEmpty()) {
      const dataUrl = signatureCanvasRef.current.toDataURL();
      console.log('Draw signature confirmed');
      
      // Set states in correct order
      setPendingSignature(dataUrl);
      setSignaturePlacementMode(true);
      setTool("select"); // Make sure tool is NOT "text"
      document.body.style.cursor = "crosshair";
      
      // Close modal after state is set
      setTimeout(() => {
        setSignatureModalOpen(false);
        console.log('Modal closed, placement mode active');
      }, 0);
    }
  };

  const handleTypeSignature = () => {
    if (typedSignature.trim()) {
      console.log('Type signature confirmed');
      
      // Create signature image from text
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 300;
        canvas.height = 100;
        ctx.font = "italic 40px 'Brush Script MT', cursive";
        ctx.fillStyle = "#000000";
        ctx.fillText(typedSignature, 20, 60);
        const dataUrl = canvas.toDataURL();
        
        // Set states in correct order
        setPendingSignature(dataUrl);
        setSignaturePlacementMode(true);
        setTool("select"); // Make sure tool is NOT "text"
        document.body.style.cursor = "crosshair";
        
        // Close modal after state is set
        setTimeout(() => {
          setSignatureModalOpen(false);
          console.log('Modal closed, placement mode active');
        }, 0);
      }
    }
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        console.log('Upload signature confirmed');
        
        // Set states in correct order
        setSignatureImage(dataUrl);
        setPendingSignature(dataUrl);
        setSignaturePlacementMode(true);
        setTool("select"); // Make sure tool is NOT "text"
        document.body.style.cursor = "crosshair";
        
        // Close modal after state is set
        setTimeout(() => {
          setSignatureModalOpen(false);
          console.log('Modal closed, placement mode active');
        }, 0);
      };
      reader.readAsDataURL(file);
    }
  };

  // Download PDF with annotations
  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDocRef.current = pdfDoc;

      const pages = pdfDoc.getPages();
      const helveticaFont = await pdfDoc.embedFont("Helvetica");

      // Add text annotations
      for (const annotation of textAnnotations) {
        const page = pages[annotation.page - 1];
        if (page) {
          try {
            // Convert hex color to RGB for pdf-lib
            const hex = annotation.color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;
            
            page.drawText(annotation.text, {
              x: annotation.x,
              y: page.getHeight() - annotation.y - annotation.height,
              size: annotation.fontSize,
              font: helveticaFont,
              color: rgb(r, g, b),
            });
          } catch (error) {
            console.error("Error adding text annotation:", error);
          }
        }
      }

      // Add signature annotations
      for (const annotation of signatureAnnotations) {
        const page = pages[annotation.page - 1];
        if (page) {
          try {
            if (annotation.imageData.startsWith("data:image/png")) {
              const base64Data = annotation.imageData.split(",")[1] || annotation.imageData;
              const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
              const image = await pdfDoc.embedPng(imageBytes);
              page.drawImage(image, {
                x: annotation.x,
                y: page.getHeight() - annotation.y - annotation.height,
                width: annotation.width,
                height: annotation.height,
              });
            } else if (annotation.imageData.startsWith("data:image/jpeg") || annotation.imageData.startsWith("data:image/jpg")) {
              const base64Data = annotation.imageData.split(",")[1] || annotation.imageData;
              const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
              const image = await pdfDoc.embedJpg(imageBytes);
              page.drawImage(image, {
                x: annotation.x,
                y: page.getHeight() - annotation.y - annotation.height,
                width: annotation.width,
                height: annotation.height,
              });
            }
          } catch (error) {
            console.error("Error adding signature annotation:", error);
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Golden_Luxury_Auto_Agreement_Signed.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Final sign and save
  const handleFinalSign = useCallback(async (): Promise<Blob> => {
    const response = await fetch(pdfUrl);
    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont("Helvetica");

    // Add all text annotations
    for (const annotation of textAnnotations) {
      const page = pages[annotation.page - 1];
      if (page) {
        try {
          // Convert hex color to RGB for pdf-lib
          const hex = annotation.color.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16) / 255;
          const g = parseInt(hex.substr(2, 2), 16) / 255;
          const b = parseInt(hex.substr(4, 2), 16) / 255;
          
          page.drawText(annotation.text, {
            x: annotation.x,
            y: page.getHeight() - annotation.y - annotation.height,
            size: annotation.fontSize,
            font: helveticaFont,
            color: rgb(r, g, b),
          });
        } catch (error) {
          console.error("Error adding text annotation:", error);
        }
      }
    }

    // Add all signature annotations
    for (const annotation of signatureAnnotations) {
      const page = pages[annotation.page - 1];
      if (page) {
        try {
          // Convert data URL to image bytes
          let imageBytes: Uint8Array;
          if (annotation.imageData.startsWith("data:image/png")) {
            const base64Data = annotation.imageData.split(",")[1] || annotation.imageData;
            imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const image = await pdfDoc.embedPng(imageBytes);
            page.drawImage(image, {
              x: annotation.x,
              y: page.getHeight() - annotation.y - annotation.height,
              width: annotation.width,
              height: annotation.height,
            });
          } else if (annotation.imageData.startsWith("data:image/jpeg") || annotation.imageData.startsWith("data:image/jpg")) {
            const base64Data = annotation.imageData.split(",")[1] || annotation.imageData;
            imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const image = await pdfDoc.embedJpg(imageBytes);
            page.drawImage(image, {
              x: annotation.x,
              y: page.getHeight() - annotation.y - annotation.height,
              width: annotation.width,
              height: annotation.height,
            });
          }
        } catch (error) {
          console.error("Error adding signature annotation:", error);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  }, [textAnnotations, signatureAnnotations, pdfUrl]);

  // Expose handleFinalSign to parent
  useEffect(() => {
    if (onSignReady) {
      onSignReady(handleFinalSign);
    }
  }, [handleFinalSign, onSignReady]);

  // Cleanup cursor on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* Floating Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Placement mode indicator */}
        {tool === "text" && (
          <div className="bg-[#EAEB80] text-[#1a1a1a] px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-pulse">
            <Type className="w-4 h-4" />
            <span className="text-sm font-semibold">Click on PDF to add text box</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTool("select");
              }}
              className="ml-2 h-6 w-6 p-0 hover:bg-[#1a1a1a]/10"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        {signaturePlacementMode && (
          <div className="bg-[#EAEB80] text-[#1a1a1a] px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-pulse">
            <PenTool className="w-4 h-4" />
            <span className="text-sm font-semibold">Click on PDF to place signature</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPendingSignature(null);
                setSignaturePlacementMode(false);
                setTool("select");
                document.body.style.cursor = "default";
              }}
              className="ml-2 h-6 w-6 p-0 hover:bg-[#1a1a1a]/10"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        {/* Toolbar */}
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#EAEB80]/30 rounded-lg p-2 shadow-2xl">
        {/* Tools */}
        <Button
          variant={tool === "text" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setTool(tool === "text" ? "select" : "text");
          }}
          className={cn(
            tool === "text" ? "bg-[#EAEB80] text-[#1a1a1a]" : "text-[#EAEB80] hover:bg-[#EAEB80]/20"
          )}
          title="Add Text (Click to activate, then click on PDF)"
        >
          <Type className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSignatureModalOpen(true);
            setTool("select");
          }}
          className="text-[#EAEB80] hover:bg-[#EAEB80]/20"
          title="Add Signature"
        >
          <PenTool className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-[#EAEB80]/30 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="text-[#EAEB80] hover:bg-[#EAEB80]/20"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrint}
          className="text-[#EAEB80] hover:bg-[#EAEB80]/20"
          title="Print"
        >
          <Printer className="w-4 h-4" />
        </Button>
        </div>
      </div>

      {/* PDF Viewer with Infinite Scroll */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden"
      >
        {pdfError ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <p>Failed to load PDF: {pdfError}</p>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center py-8"
            style={{ 
              cursor: signaturePlacementMode ? "crosshair" : tool === "text" ? "crosshair" : "default" 
            }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              options={documentOptions}
            >
              {Array.from(new Array(numPages), (el, index) => {
                const pageNumber = index + 1;
                return (
                  <PDFPageWithAnnotations
                    key={`page-${pageNumber}`}
                    pageNumber={pageNumber}
                    scale={scale}
                    textAnnotations={textAnnotations}
                    signatureAnnotations={signatureAnnotations}
                    editingTextId={editingTextId}
                    selectedSignatureId={selectedSignatureId}
                    tool={tool}
                    onTextEdit={handleTextEditCallback}
                    onTextChange={handleTextChange}
                    onTextBlur={handleTextBlurCallback}
                    onTextPositionChange={handleTextPositionChange}
                    onTextSizeChange={handleTextSizeChange}
                    onSignatureSelect={setSelectedSignatureId}
                    onSignatureRemove={handleSignatureRemove}
                    onSignaturePositionChange={handleSignaturePositionChange}
                    onSignatureSizeChange={handleSignatureSizeChange}
                    onPageClick={(e) => {
                      console.log('Page clicked', { signaturePlacementMode, tool, pageNumber });
                      if (signaturePlacementMode) {
                        console.log('Calling handleSignatureClick');
                        handleSignatureClick(e, pageNumber);
                      } else if (tool === "text") {
                        handleTextClick(e, pageNumber);
                      }
                    }}
                  />
                );
              })}
            </Document>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      <Dialog 
        open={signatureModalOpen} 
        onOpenChange={(open) => {
          // Only handle opening the modal, not closing
          // When closing via "Use This Signature", the handlers already close it
          if (open) {
            setSignatureModalOpen(true);
          } else {
            // Only close if we're not in placement mode
            // (placement mode means user clicked "Use This Signature")
            setTimeout(() => {
              // Use setTimeout to check state after signature handlers have run
              if (!signaturePlacementMode) {
                setSignatureModalOpen(false);
              }
            }, 0);
          }
        }}
      >
        <DialogContent className="bg-[#1a1a1a] border-[#EAEB80]/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#EAEB80]">Add Signature</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose how you want to add your signature
            </DialogDescription>
          </DialogHeader>

          <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as any)}>
            <TabsList className="bg-[#2d2d2d] border-[#EAEB80]/30">
              <TabsTrigger value="type" className="text-gray-300 data-[state=active]:text-[#EAEB80]">
                Type
              </TabsTrigger>
              <TabsTrigger value="draw" className="text-gray-300 data-[state=active]:text-[#EAEB80]">
                Draw
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-gray-300 data-[state=active]:text-[#EAEB80]">
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="type" className="mt-4">
              <div className="space-y-4">
                <Input
                  placeholder="Type your name"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="bg-[#2d2d2d] border-[#EAEB80]/30 text-white"
                />
                {typedSignature && (
                  <div className="bg-white p-6 rounded">
                    <p className="text-black italic text-3xl font-serif text-center">{typedSignature}</p>
                  </div>
                )}
                <Button
                  onClick={handleTypeSignature}
                  disabled={!typedSignature.trim()}
                  className="w-full bg-[#EAEB80] text-[#1a1a1a] hover:bg-[#f4d03f] font-semibold"
                >
                  Use This Signature
                </Button>
                <p className="text-sm text-gray-400 text-center">
                  After clicking "Use This Signature", click anywhere on the PDF to place it
                </p>
              </div>
            </TabsContent>

            <TabsContent value="draw" className="mt-4">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                  <SignatureCanvas
                    ref={signatureCanvasRef}
                    canvasProps={{
                      className: "w-full h-48 touch-none",
                      style: { touchAction: "none" },
                    }}
                    backgroundColor="white"
                    penColor="#000000"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => signatureCanvasRef.current?.clear()}
                    className="flex-1 border-[#EAEB80]/30 text-[#EAEB80] hover:bg-[#EAEB80]/10"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleDrawSignature}
                    disabled={signatureCanvasRef.current?.isEmpty()}
                    className="flex-1 bg-[#EAEB80] text-[#1a1a1a] hover:bg-[#f4d03f] font-semibold"
                  >
                    Use This Signature
                  </Button>
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Draw your signature above, then click "Use This Signature" and click on the PDF to place it
                </p>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleUploadSignature}
                  className="hidden"
                />
                {signatureImage && (
                  <div className="bg-white p-4 rounded border-2 border-gray-300">
                    <img src={signatureImage} alt="Uploaded signature" className="max-w-full h-auto mx-auto max-h-48 object-contain" />
                  </div>
                )}
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-[#EAEB80] text-[#1a1a1a] hover:bg-[#f4d03f] font-semibold"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {signatureImage ? "Choose Different Image" : "Upload Signature Image"}
                </Button>
                <p className="text-sm text-gray-400 text-center">
                  Upload an image of your signature, then click on the PDF to place it
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

