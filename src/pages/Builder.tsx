import { useState } from "react";
import { Check } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UploadStep from "@/components/builder/UploadStep";
import ApproveStep from "@/components/builder/ApproveStep";
import CoverStep from "@/components/builder/CoverStep";
import CheckoutStep from "@/components/builder/CheckoutStep";

type BuilderStep = "upload" | "approve" | "cover" | "checkout";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
}

interface ConvertedPage {
  id: string;
  originalUrl: string;
  lineArtUrl: string;
  approved: boolean;
}

const steps: { key: BuilderStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "approve", label: "Approve" },
  { key: "cover", label: "Cover" },
  { key: "checkout", label: "Checkout" },
];

const Builder = () => {
  const [currentStep, setCurrentStep] = useState<BuilderStep>("upload");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [convertedPages, setConvertedPages] = useState<ConvertedPage[]>([]);
  const [coverData, setCoverData] = useState<{ imageId: string; zoom: number; position: { x: number; y: number } } | null>(null);

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const handleImagesUploaded = (images: UploadedImage[]) => {
    setUploadedImages(images);
    // Simulate conversion - in real app, this would call the AI conversion API
    const converted: ConvertedPage[] = images.map((img) => ({
      id: img.id,
      originalUrl: img.preview,
      lineArtUrl: img.preview, // In real app, this would be the converted line art
      approved: false,
    }));
    setConvertedPages(converted);
    setCurrentStep("approve");
  };

  const handleApprovalComplete = (pages: ConvertedPage[]) => {
    setConvertedPages(pages);
    setCurrentStep("cover");
  };

  const handleCoverComplete = (data: { imageId: string; zoom: number; position: { x: number; y: number } }) => {
    setCoverData(data);
    setCurrentStep("checkout");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Steps */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        index < currentStepIndex
                          ? "bg-primary text-primary-foreground"
                          : index === currentStepIndex
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index < currentStepIndex ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`mt-2 text-sm ${
                      index <= currentStepIndex ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-0.5 mx-2 ${
                        index < currentStepIndex ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="max-w-5xl mx-auto">
            {currentStep === "upload" && (
              <UploadStep
                onImagesUploaded={handleImagesUploaded}
                maxImages={20}
              />
            )}
            
            {currentStep === "approve" && (
              <ApproveStep
                pages={convertedPages}
                onApprovalComplete={handleApprovalComplete}
                onBack={() => setCurrentStep("upload")}
              />
            )}
            
            {currentStep === "cover" && (
              <CoverStep
                availableImages={uploadedImages.map((img) => ({ id: img.id, url: img.preview }))}
                onCoverComplete={handleCoverComplete}
                onBack={() => setCurrentStep("approve")}
              />
            )}
            
            {currentStep === "checkout" && (
              <CheckoutStep
                pageCount={20}
                hasUniquePhotos={uploadedImages.length > 1}
                extraPages={0}
                onBack={() => setCurrentStep("cover")}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Builder;
