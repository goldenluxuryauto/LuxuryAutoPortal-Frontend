import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import {
  Upload,
  Eye,
  Star,
  Trash2,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { Document, Page } from "react-pdf";
import * as pdfjsLib from "pdfjs-dist";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { cn } from "@/lib/utils";
import "@/lib/pdf-config"; // Configure PDF.js worker
import { pdfjs } from "@/lib/pdf-config";

// Ensure worker is set correctly before Document components load
// Use CDN URL matching react-pdf's pdfjs-dist version (4.8.69)
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

interface Contract {
  id: number;
  name: string;
  path: string;
  uploadedAt: string;
  isDefault: boolean;
  size?: number;
  type?: "default_template" | "uploaded" | "signed";
}

interface SignedContract {
  name: string;
  url: string;
  date: string;
}

export default function ContractManagement() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all contracts
  const { data: contractsData, isLoading } = useQuery<{
    success: boolean;
    data: Contract[];
  }>({
    queryKey: ["contracts"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/contracts"), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch contracts");
      }
      return response.json();
    },
  });

  // Fetch signed contracts from public_html
  const { data: signedContractsData, isLoading: isLoadingSigned } = useQuery<{
    success: boolean;
    data: SignedContract[];
  }>({
    queryKey: ["signed-contracts"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/contracts/list"), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch signed contracts");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("contract", file);

      const response = await fetch(buildApiUrl("/api/contracts/upload"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload contract");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Success",
        description: "Contract uploaded successfully",
      });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(buildApiUrl(`/api/contracts/${id}/set-default`), {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set default contract");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Success",
        description: "Default contract updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(buildApiUrl(`/api/contracts/${id}`), {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete contract");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "File size must be less than 5MB",
            variant: "destructive",
          });
          return;
        }
        setUploadFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Only PDF files are allowed",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "File size must be less than 5MB",
            variant: "destructive",
          });
          return;
        }
        setUploadFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Only PDF files are allowed",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = () => {
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewDialogOpen(true);
    setPageNumber(1);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const contracts = contractsData?.data || [];
  const signedContracts = signedContractsData?.data || [];

  const handleViewSignedContract = (contract: SignedContract) => {
    window.open(contract.url, "_blank");
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contract Management</h1>
            <p className="text-gray-400 mt-1">
              Upload and manage contract documents for client onboarding
            </p>
          </div>
          <Button
            onClick={() => setIsUploadDialogOpen(true)}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Contract
          </Button>
        </div>

        <Card className="bg-[#111111] border-[#EAEB80]/20">
          <CardHeader>
            <CardTitle className="text-white">Contract Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>No contracts uploaded yet</p>
                <p className="text-sm mt-2">Upload your first contract to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1a1a1a]">
                    <TableHead className="text-gray-400">Document Name</TableHead>
                    <TableHead className="text-gray-400">Uploaded Date</TableHead>
                    <TableHead className="text-gray-400">Size</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow
                      key={contract.id}
                      className="border-[#1a1a1a] hover:bg-[#1a1a1a]"
                    >
                      <TableCell className="text-white font-medium">
                        {contract.name}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(contract.uploadedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatFileSize(contract.size)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contract.isDefault ? (
                            <Badge className="bg-[#EAEB80]/20 text-[#EAEB80] border-[#EAEB80]/50">
                              <Star className="w-3 h-3 mr-1 fill-[#EAEB80]" />
                              Default
                            </Badge>
                          ) : contract.type === "default_template" ? (
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-500/10">
                              Template
                            </Badge>
                          ) : contract.type === "uploaded" ? (
                            <Badge variant="outline" className="border-purple-500/50 text-purple-400 bg-purple-500/10">
                              Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-gray-800"
                            onClick={() => handleView(contract)}
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                          </Button>
                          {contract.id !== 0 && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-[#EAEB80]/20"
                                onClick={() => setDefaultMutation.mutate(contract.id)}
                                disabled={contract.isDefault || setDefaultMutation.isPending}
                                title="Set as Default"
                              >
                                <Star
                                  className={cn(
                                    "w-4 h-4",
                                    contract.isDefault
                                      ? "text-[#EAEB80] fill-[#EAEB80]"
                                      : "text-gray-400 hover:text-[#EAEB80]"
                                  )}
                                />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-red-500/20"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Are you sure you want to delete "${contract.name}"? This action cannot be undone.`
                                    )
                                  ) {
                                    deleteMutation.mutate(contract.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Signed Contracts Section */}
        <Card className="bg-[#111111] border-[#EAEB80]/20">
          <CardHeader>
            <CardTitle className="text-white">Signed Contracts</CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Contracts signed by clients and stored in public_html/signed-contracts/
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingSigned ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
              </div>
            ) : signedContracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>No signed contracts uploaded yet</p>
                <p className="text-sm mt-2">Signed contracts will appear here automatically</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1a1a1a]">
                    <TableHead className="text-gray-400">Contract Name</TableHead>
                    <TableHead className="text-gray-400">Uploaded Date</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signedContracts.map((contract, index) => (
                    <TableRow
                      key={`${contract.name}-${index}`}
                      className="border-[#1a1a1a] hover:bg-[#1a1a1a]"
                    >
                      <TableCell className="text-white font-medium">
                        {contract.name}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(contract.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleViewSignedContract(contract)}
                          className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="bg-[#111111] border-[#EAEB80]/30 border-2 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Upload Contract Document</DialogTitle>
              <DialogDescription className="text-gray-400">
                Upload a PDF contract document (max 5MB)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive
                    ? "border-[#EAEB80] bg-[#EAEB80]/10"
                    : "border-gray-600 hover:border-gray-500"
                )}
              >
                {uploadFile ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 mx-auto text-[#EAEB80]" />
                    <p className="text-white font-medium">{uploadFile.name}</p>
                    <p className="text-sm text-gray-400">
                      {formatFileSize(uploadFile.size)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadFile(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-gray-500" />
                    <p className="text-gray-400">
                      Drag and drop a PDF file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileInput}
                      className="hidden"
                      id="contract-upload"
                    />
                    <label htmlFor="contract-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 cursor-pointer"
                        asChild
                      >
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUploadDialogOpen(false);
                    setUploadFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploadMutation.isPending}
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View PDF Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-[#111111] border-[#EAEB80]/30 border-2 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedContract?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Contract Document Preview
              </DialogDescription>
            </DialogHeader>
            {selectedContract && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                      disabled={pageNumber <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-400">
                      Page {pageNumber} of {numPages || "?"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPageNumber((prev) => Math.min(numPages || 1, prev + 1))
                      }
                      disabled={!numPages || pageNumber >= numPages}
                    >
                      Next
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Use direct backend URL for PDF files
                      const pdfUrl = selectedContract.path.startsWith("http")
                        ? selectedContract.path
                        : buildApiUrl(`/${selectedContract.path}`);
                      window.open(pdfUrl, "_blank");
                    }}
                  >
                    Open in New Tab
                  </Button>
                </div>
                <div className="border border-[#1a1a1a] rounded-lg overflow-hidden bg-white min-h-[600px]">
                  <Document
                    file={(() => {
                      // Construct PDF URL - ensure it's absolute
                      const pdfPath = selectedContract.path;
                      if (pdfPath.startsWith("http://") || pdfPath.startsWith("https://")) {
                        return pdfPath;
                      }
                      // Ensure path starts with / for proper URL construction
                      const normalizedPath = pdfPath.startsWith("/") ? pdfPath : `/${pdfPath}`;
                      const pdfUrl = buildApiUrl(normalizedPath);
                      console.log("Loading PDF from:", pdfUrl);
                      return pdfUrl;
                    })()}
                    options={{
                      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                      cMapPacked: true,
                    }}
                    onLoadSuccess={({ numPages }) => {
                      setNumPages(numPages);
                      console.log("PDF loaded successfully, pages:", numPages);
                    }}
                    onLoadError={(error) => {
                      console.error("PDF load error:", error);
                      console.error("PDF path attempted:", selectedContract.path);
                    }}
                    loading={
                      <div className="flex items-center justify-center p-8 min-h-[600px]">
                        <div className="text-center space-y-2">
                          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80] mx-auto" />
                          <p className="text-gray-400">Loading PDF...</p>
                        </div>
                      </div>
                    }
                    error={
                      <div className="p-8 text-center space-y-4 min-h-[600px] flex flex-col items-center justify-center">
                        <p className="text-red-400">Failed to load PDF in preview.</p>
                        <p className="text-sm text-gray-500">
                          The PDF file may be accessible directly. Try opening it in a new tab.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const pdfPath = selectedContract.path;
                            const normalizedPath = pdfPath.startsWith("/") ? pdfPath : `/${pdfPath}`;
                            const pdfUrl = pdfPath.startsWith("http")
                              ? pdfPath
                              : buildApiUrl(normalizedPath);
                            console.log("Opening PDF in new tab:", pdfUrl);
                            window.open(pdfUrl, "_blank");
                          }}
                        >
                          Open in New Tab
                        </Button>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="!max-w-full"
                    />
                  </Document>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}

