import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ChevronLeft, ChevronRight, Maximize2, Loader2, Copy, ExternalLink } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  payments_aid: number;
  payments_year_month: string;
  payments_attachment: string | null;
}

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
}

const formatYearMonth = (yearMonth: string): string => {
  try {
    const [year, month] = yearMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  } catch {
    return yearMonth;
  }
};

interface FileUrlData {
  fileId: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  webContentLink?: string;
  previewUrl?: string; // Google Drive preview URL for embedding
  error?: string; // Error message if file failed to load
}

export function PaymentReceiptModal({
  isOpen,
  onClose,
  payment,
}: PaymentReceiptModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileUrls, setFileUrls] = useState<FileUrlData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Reset state when modal closes or payment changes
    if (!isOpen || !payment) {
      setFileUrls([]);
      setCurrentIndex(0);
      setIsLoadingFiles(false);
      return;
    }

    if (!payment.payments_attachment) {
      setFileUrls([]);
      setCurrentIndex(0);
      setIsLoadingFiles(false);
      return;
    }

    // Set loading state immediately when modal opens with attachments
    setIsLoadingFiles(true);
    setFileUrls([]); // Clear previous files while loading

    const loadFiles = async () => {
      try {
        const parsed = JSON.parse(payment.payments_attachment!);
        const ids = Array.isArray(parsed) ? parsed : [parsed];
        
        // Check if attachments are Google Drive IDs (not starting with /uploads/)
        const isGDrive = ids.every((id: string) => 
          typeof id === 'string' && !id.startsWith('/uploads/') && !id.startsWith('http')
        );

        if (isGDrive && ids.length > 0) {
          // Fetch file URLs from Google Drive (loading state already set above)
          const urls = await Promise.all(
            ids.map(async (fileId: string) => {
              try {
                const response = await fetch(
                  buildApiUrl(`/api/payments/receipt/file-url?fileId=${encodeURIComponent(fileId)}`),
                  { credentials: "include" }
                );
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  // Check if it's a folder ID error
                  if (errorData.error?.includes('folder') || errorData.error?.includes('Folder')) {
                    console.error(`❌ [Payment Receipts] ID ${fileId} is a folder, not a file`);
                    throw new Error(`Invalid file ID: The stored ID appears to be a folder ID, not a file ID. Please re-upload the receipt.`);
                  }
                  throw new Error(errorData.error || "Failed to fetch file URL");
                }
                
                const data = await response.json();
                
                // Check if backend detected a folder and returned multiple files
                if (data.isFolder && Array.isArray(data.data)) {
                  console.log(`✅ [Payment Receipts] Folder ID detected (${fileId}), found ${data.fileCount || data.data.length} file(s) in folder "${data.folderName || 'Payment_History_Receipt'}"`);
                  console.log(`✅ [Payment Receipts] Extracted Google Drive file IDs from folder:`, 
                    data.fileIds || data.data.map((f: FileUrlData) => f.fileId));
                  // Return all files from the folder - these are actual file IDs from Payment_History_Receipt folder
                  return data.data.map((file: FileUrlData) => ({
                    ...file,
                    fileId: file.fileId, // This is the actual Google Drive file ID from within the folder
                    // Ensure mimeType is set and not a folder
                    mimeType: file.mimeType && file.mimeType !== 'application/vnd.google-apps.folder' 
                      ? file.mimeType 
                      : undefined,
                  }));
                }
                
                // Handle single file (could be object or array with one element)
                const fileData = Array.isArray(data.data) ? data.data[0] : data.data;
                
                // Verify it's not a folder
                if (fileData.mimeType === 'application/vnd.google-apps.folder') {
                  console.error(`❌ [Payment Receipts] ID ${fileId} is a folder, not a file`);
                  throw new Error(`Invalid file ID: The stored ID is a folder ID, not a file ID. Please re-upload the receipt.`);
                }
                
                // Use previewUrl from backend if available, otherwise generate it
                const previewUrl = fileData.previewUrl || `https://drive.google.com/file/d/${fileData.fileId || fileId}/preview`;
                
                console.log(`✅ [Payment Receipts] Loaded file: ${fileData.name} (ID: ${fileData.fileId || fileId}, Type: ${fileData.mimeType})`);
                
                return {
                  ...fileData,
                  // Always use the fileId from the metadata, not the input ID (in case input was a folder)
                  fileId: fileData.fileId || fileId,
                  // Use preview URL for embedding, but keep original links for download
                  previewUrl: previewUrl,
                  webViewLink: fileData.webViewLink || previewUrl,
                  webContentLink: fileData.webContentLink || previewUrl,
                };
              } catch (error: any) {
                console.error(`❌ [Payment Receipts] Failed to fetch file URL for ${fileId}:`, error);
                // Return error info so user knows what went wrong
                return { 
                  fileId, 
                  previewUrl: null,
                  webViewLink: null, 
                  webContentLink: null,
                  name: `Error loading file ${fileId}`,
                  mimeType: 'unknown',
                  error: error?.message || 'Failed to load file'
                };
              }
            })
          );
          
          // Flatten array of arrays (in case folder returned multiple files)
          const flattenedUrls = urls.flat();
          
          // Filter out files with errors and show them separately
          // Also filter out any files that might still be folders (safety check)
          const validFiles = flattenedUrls.filter(f => 
            !f.error && 
            f.fileId && 
            f.fileId !== 'error' &&
            f.mimeType !== 'application/vnd.google-apps.folder'
          );
          const errorFiles = flattenedUrls.filter(f => f.error);
          
          if (errorFiles.length > 0) {
            console.warn(`⚠️ [Payment Receipts] ${errorFiles.length} file(s) failed to load:`, errorFiles.map(f => f.fileId));
          }
          
          // Log the final file IDs that will be displayed
          if (validFiles.length > 0) {
            console.log(`✅ [Payment Receipts] Final file IDs to display:`, validFiles.map(f => f.fileId));
          }
          
          if (validFiles.length === 0 && errorFiles.length > 0) {
            // All files failed - show error message
            setFileUrls([{
              fileId: 'error',
              name: 'Error loading receipts',
              mimeType: 'unknown',
              error: errorFiles[0].error || 'Failed to load receipt files'
            }]);
          } else {
            setFileUrls(validFiles);
          }
          
          setCurrentIndex(0);
          setIsLoadingFiles(false);
        } else {
          // Local files - convert paths to full URLs
          const localUrls = ids.map((path: string) => {
            if (path.startsWith("http://") || path.startsWith("https://")) {
              return { fileId: path, webViewLink: path, webContentLink: path };
            }
            return { fileId: path, webViewLink: buildApiUrl(path), webContentLink: buildApiUrl(path) };
          });
          setFileUrls(localUrls);
          setCurrentIndex(0);
          setIsLoadingFiles(false);
        }
      } catch (error) {
        console.error("Failed to parse attachments:", error);
        // If parsing fails, try treating it as a single path string
        if (payment.payments_attachment && typeof payment.payments_attachment === "string") {
          const path = payment.payments_attachment;
          const url = path.startsWith("http://") || path.startsWith("https://") 
            ? path 
            : buildApiUrl(path);
          setFileUrls([{ fileId: path, webViewLink: url, webContentLink: url }]);
          setCurrentIndex(0);
        } else {
          setFileUrls([]);
        }
        setIsLoadingFiles(false);
      }
    };

    loadFiles();
  }, [payment, isOpen]);

  if (!payment) return null;

  const hasAttachments = fileUrls.length > 0;
  const currentFile = hasAttachments ? fileUrls[currentIndex] : null;
  // Use proxy endpoint to serve file content (works even if file is not publicly accessible)
  // This ensures files can be displayed regardless of Google Drive permissions
  const currentAttachment = currentFile?.fileId 
    ? buildApiUrl(`/api/payments/receipt/file-content?fileId=${encodeURIComponent(currentFile.fileId)}`)
    : currentFile?.webViewLink || currentFile?.webContentLink || currentFile?.previewUrl || null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : fileUrls.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < fileUrls.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    if (!currentFile) return;
    
    // For Google Drive files, use webContentLink for direct download, or webViewLink as fallback
    const downloadUrl = currentFile.webContentLink || currentFile.webViewLink || currentFile.previewUrl;
    
    if (downloadUrl) {
      // Open in new tab for download/view
      window.open(downloadUrl, "_blank");
    }
  };

  const getFileType = (file: FileUrlData | null): string => {
    if (!file) return 'unknown';
    
    // Check MIME type first (from Google Drive)
    if (file.mimeType) {
      if (file.mimeType.startsWith('image/')) return 'image';
      if (file.mimeType === 'application/pdf') return 'pdf';
    }
    
    // Fallback to filename extension
    const filename = file.name || file.fileId || '';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return 'image';
    } else if (ext === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f0f] border-[#2a2a2a] text-white max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center justify-between">
            <span>Payment Receipt</span>
            {hasAttachments && fileUrls.length > 1 && (
              <span className="text-sm text-gray-400 font-normal">
                {currentIndex + 1} / {fileUrls.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Receipt for {formatYearMonth(payment.payments_year_month)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {isLoadingFiles ? (
            <div className="flex items-center justify-center p-12 bg-[#1a1a1a] rounded-lg min-h-[400px]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#EAEB80] animate-spin" />
                <p className="text-gray-400">Loading receipt files...</p>
              </div>
            </div>
          ) : !hasAttachments ? (
            <div className="flex items-center justify-center p-12 bg-[#1a1a1a] rounded-lg">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                  <X className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400 text-lg">No receipt attached</p>
                <p className="text-gray-500 text-sm mt-2">
                  Upload a receipt to view it here
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Receipt Display Area */}
              <div className="flex-1 bg-[#1a1a1a] rounded-lg overflow-auto p-4 min-h-[400px] max-h-[600px]">
                {currentFile && currentFile.error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
                        <X className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-red-400 text-lg mb-2">Error Loading Receipt</p>
                      <p className="text-gray-400 text-sm max-w-md">
                        {currentFile.error}
                      </p>
                      <p className="text-gray-500 text-xs mt-4">
                        File ID: {currentFile.fileId}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        If this error persists, the receipt may need to be re-uploaded.
                      </p>
                    </div>
                  </div>
                ) : currentFile && currentAttachment ? (
                  <>
                    {getFileType(currentFile) === 'image' ? (
                      <div className="flex items-center justify-center h-full">
                        {/* Use proxy endpoint for images to avoid permission issues */}
                        <img
                          src={currentAttachment || ''}
                          alt={`Receipt ${currentIndex + 1}`}
                          className="max-w-full max-h-full object-contain"
                          loading="eager"
                          onLoad={() => {
                            console.log(`✅ [Payment Receipts] Image loaded: ${currentFile?.name}`);
                          }}
                          onError={(e) => {
                            console.error("Failed to load image via proxy:", currentAttachment);
                            // Fallback to direct links if proxy fails
                            const fallbackUrl = currentFile?.webContentLink || currentFile?.webViewLink || currentFile?.previewUrl;
                            if (fallbackUrl && currentAttachment !== fallbackUrl) {
                              (e.target as HTMLImageElement).src = fallbackUrl;
                            }
                          }}
                        />
                      </div>
                    ) : getFileType(currentFile) === 'pdf' ? (
                      <iframe
                        src={currentAttachment || ''}
                        title={`Receipt ${currentIndex + 1}`}
                        className="w-full h-full min-h-[400px] border-0"
                        allow="fullscreen"
                        loading="eager"
                        onLoad={() => {
                          console.log(`✅ [Payment Receipts] PDF loaded: ${currentFile?.name}`);
                        }}
                        onError={() => {
                          console.error("Failed to load PDF via proxy:", currentAttachment);
                          // Fallback to direct links if proxy fails
                          if (currentFile?.previewUrl && currentAttachment !== currentFile.previewUrl) {
                            const iframe = document.querySelector(`iframe[title="Receipt ${currentIndex + 1}"]`) as HTMLIFrameElement;
                            if (iframe) {
                              iframe.src = currentFile.previewUrl;
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-gray-400">
                            Unsupported file type
                          </p>
                          <Button
                            variant="outline"
                            onClick={handleDownload}
                            className="mt-4 bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] border-[#2a2a2a]"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download File
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-400">No file to display</p>
                    </div>
                  </div>
                )}
              </div>

              {/* File ID Information */}
              {currentFile && currentFile.fileId && currentFile.fileId !== 'error' && (
                <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1">File ID:</p>
                      <div className="flex items-center gap-2">
                        {/* Only show file ID if it's not a folder (mimeType check) */}
                        {currentFile.mimeType !== 'application/vnd.google-apps.folder' ? (
                          <>
                            <a
                              href={`https://drive.google.com/file/d/${currentFile.fileId}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#EAEB80] hover:text-[#d4d570] hover:underline break-all font-mono"
                              title="Open in Google Drive"
                            >
                              {currentFile.fileId}
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(currentFile.fileId);
                                  toast({
                                    title: "Copied!",
                                    description: "File ID copied to clipboard",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to copy file ID",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              title="Copy File ID"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                window.open(`https://drive.google.com/file/d/${currentFile.fileId}/view`, "_blank");
                              }}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <div className="text-sm text-yellow-400">
                            <p>Folder ID detected. Please re-upload the receipt file.</p>
                            <p className="text-xs text-gray-500 mt-1">Folder ID: {currentFile.fileId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation & Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2a] mt-4">
                <div className="flex items-center gap-2">
                  {fileUrls.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevious}
                        className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

