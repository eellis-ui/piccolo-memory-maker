import { useState } from "react";
import { Check, RefreshCw, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConvertedPage {
  id: string;
  originalUrl: string;
  lineArtUrl: string;
  approved: boolean;
}

interface ApproveStepProps {
  pages: ConvertedPage[];
  onApprovalComplete: (pages: ConvertedPage[]) => void;
  onBack: () => void;
}

const ApproveStep = ({ pages: initialPages, onApprovalComplete, onBack }: ApproveStepProps) => {
  const [pages, setPages] = useState<ConvertedPage[]>(initialPages);

  const approvedCount = pages.filter((p) => p.approved).length;
  const allApproved = approvedCount === pages.length;

  const toggleApproval = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, approved: !p.approved } : p))
    );
  };

  const approveAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, approved: true })));
  };

  const handleContinue = () => {
    onApprovalComplete(pages);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Approve Your Pages
          </h2>
          <p className="text-muted-foreground">
            Review each conversion and approve when you're happy
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {approvedCount} of {pages.length} approved
          </Badge>
          {!allApproved && (
            <Button variant="outline" onClick={approveAll} className="rounded-2xl">
              Approve All
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(approvedCount / pages.length) * 100}%` }}
        />
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`relative rounded-3xl border-2 overflow-hidden transition-all ${
              page.approved ? "border-primary shadow-soft" : "border-border"
            }`}
          >
            {/* Page Number */}
            <div className="absolute top-3 left-3 z-10">
              <Badge variant="secondary">Page {index + 1}</Badge>
            </div>

            {/* Watermark overlay for preview */}
            <div className="relative aspect-[3/4] bg-cream">
              {/* Original / Line Art comparison - simplified for demo */}
              <div className="absolute inset-0 flex">
                <div className="w-1/2 h-full border-r border-border/50">
                  <img
                    src={page.originalUrl}
                    alt={`Original ${index + 1}`}
                    className="w-full h-full object-cover opacity-50"
                  />
                  <span className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                    Original
                  </span>
                </div>
                <div className="w-1/2 h-full relative">
                  <img
                    src={page.lineArtUrl}
                    alt={`Line art ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-2xl font-display text-foreground/10 rotate-[-30deg]">
                      PREVIEW
                    </span>
                  </div>
                  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                    Line Art
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex items-center justify-between bg-background">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Replace
                </Button>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <Edit2 className="w-4 h-4 mr-1" />
                  Adjust
                </Button>
              </div>
              
              <Button
                variant={page.approved ? "default" : "outline"}
                size="sm"
                onClick={() => toggleApproval(page.id)}
                className="rounded-xl"
              >
                <Check className="w-4 h-4 mr-1" />
                {page.approved ? "Approved" : "Approve"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="rounded-2xl">
          Back to Upload
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!allApproved}
          className="rounded-2xl px-8"
        >
          {allApproved ? "Continue to Cover Design" : `Approve ${pages.length - approvedCount} more`}
        </Button>
      </div>
    </div>
  );
};

export default ApproveStep;
