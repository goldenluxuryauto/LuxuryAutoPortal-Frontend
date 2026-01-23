import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

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

export function PaymentReceiptModal({
  isOpen,
  onClose,
  payment,
}: PaymentReceiptModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!payment) return null;

  // Parse attachment JSON
  let attachments: string[] = [];
  try {
    if (payment.payments_attachment) {
      attachments = JSON.parse(payment.payments_attachment);
    }
  } catch (error) {
    console.error("Failed to parse attachments:", error);
  }

  const hasAttachments = attachments.length > 0;
  const currentAttachment = hasAttachments ? attachments[currentIndex] : null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    if (!currentAttachment) return;
    // TODO: Implement download functionality
    // This should fetch the file from the server and trigger download
    window.open(currentAttachment, "_blank");
  };

  const getFileType = (filename: string): string => {
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
            {hasAttachments && attachments.length > 1 && (
              <span className="text-sm text-gray-400 font-normal">
                {currentIndex + 1} / {attachments.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Receipt for {formatYearMonth(payment.payments_year_month)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {!hasAttachments ? (
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
                {currentAttachment && (
                  <>
                    {getFileType(currentAttachment) === 'image' ? (
                      <div className="flex items-center justify-center h-full">
                        <img
                          src={currentAttachment}
                          alt={`Receipt ${currentIndex + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : getFileType(currentAttachment) === 'pdf' ? (
                      <iframe
                        src={currentAttachment}
                        title={`Receipt ${currentIndex + 1}`}
                        className="w-full h-full min-h-[400px]"
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
                )}
              </div>

              {/* Navigation & Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2a] mt-4">
                <div className="flex items-center gap-2">
                  {attachments.length > 1 && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement fullscreen view
                    }}
                    className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
                  >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Fullscreen
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

