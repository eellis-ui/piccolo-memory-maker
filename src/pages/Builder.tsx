import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UploadStep from "@/components/builder/UploadStep";
import ApproveStep from "@/components/builder/ApproveStep";
import CoverStep from "@/components/builder/CoverStep";
import CheckoutStep from "@/components/builder/CheckoutStep";


type BuilderStep = "upload" | "approve" | "cover" | "checkout";

export interface OrderPhoto {
  id: string;
  originalPath: string;
  convertedPath: string | null;
  pagePosition: number;
  isApproved: boolean;
  conversionStatus: string;
  originalUrl: string;
  convertedUrl: string | null;
  isLandscape: boolean;
}

export interface BookOptions {
  titlePageEnabled: boolean;
  titlePageText: string;
  dedicationPageEnabled: boolean;
  dedicationPageText: string;
}

const steps: { key: BuilderStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "approve", label: "Approve" },
  { key: "cover", label: "Cover" },
  { key: "checkout", label: "Checkout" },
];

const Builder = () => {
  const [currentStep, setCurrentStep] = useState<BuilderStep>("upload");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderPhotos, setOrderPhotos] = useState<OrderPhoto[]>([]);
  const [bookOptions, setBookOptions] = useState<BookOptions>({
    titlePageEnabled: true,
    titlePageText: "My Piccoload Coloring Book",
    dedicationPageEnabled: false,
    dedicationPageText: "",
  });
  const [coverData, setCoverData] = useState<{
    imageIds: [string, string];
    title: string;
    subtitle: string;
  } | null>(null);

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  // Create order on mount
  useEffect(() => {
    const createOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .insert({ status: "draft" })
        .select("id")
        .single();

      if (!error && data) {
        setOrderId(data.id);
      }
    };
    createOrder();
  }, []);

  const handleImagesUploaded = (photos: OrderPhoto[]) => {
    setOrderPhotos(photos);
    setCurrentStep("approve");
  };

  const handleApprovalComplete = (photos: OrderPhoto[]) => {
    setOrderPhotos(photos);
    setCurrentStep("cover");
  };

  const handleCoverComplete = async (data: {
    imageIds: [string, string];
    title: string;
    subtitle: string;
  }) => {
    setCoverData(data);
    if (orderId) {
      await supabase
        .from("orders")
        .update({
          cover_image_id: data.imageIds[0],
          ...bookOptions && {
            title_page_enabled: bookOptions.titlePageEnabled,
            title_page_text: bookOptions.titlePageText,
            dedication_page_enabled: bookOptions.dedicationPageEnabled,
            dedication_page_text: bookOptions.dedicationPageText,
          },
        })
        .eq("id", orderId);
    }
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
                    <span
                      className={`mt-2 text-sm ${
                        index <= currentStepIndex
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
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
            {currentStep === "upload" && orderId && (
              <UploadStep
                orderId={orderId}
                onImagesUploaded={handleImagesUploaded}
                maxImages={20}
              />
            )}

            {currentStep === "approve" && orderId && (
              <ApproveStep
                orderId={orderId}
                photos={orderPhotos}
                bookOptions={bookOptions}
                onBookOptionsChange={setBookOptions}
                onApprovalComplete={handleApprovalComplete}
                onBack={() => setCurrentStep("upload")}
              />
            )}

            {currentStep === "cover" && (
              <CoverStep
                availableImages={orderPhotos.map((p) => ({
                  id: p.id,
                  originalUrl: p.originalUrl,
                  convertedUrl: p.convertedUrl,
                }))}
                onCoverComplete={handleCoverComplete}
                onBack={() => setCurrentStep("approve")}
              />
            )}

            {currentStep === "checkout" && (
              <CheckoutStep
                pageCount={orderPhotos.length}
                hasUniquePhotos={false}
                extraPages={0}
                bookCount={1}
                convertedUrls={orderPhotos.map((p) => p.convertedUrl)}
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
