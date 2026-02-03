import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
}

interface UploadStepProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  maxImages?: number;
}

const UploadStep = ({ onImagesUploaded, maxImages = 20 }: UploadStepProps) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, maxImages - images.length);

    const newImages: UploadedImage[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: "ready",
      progress: 100,
    }));

    setImages((prev) => [...prev, ...newImages]);
  }, [images.length, maxImages]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const handleContinue = () => {
    onImagesUploaded(images);
  };

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cream">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              Drop your photos here
            </p>
            <p className="text-muted-foreground">
              or click to browse (JPG, PNG)
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {images.length} of {maxImages} photos uploaded
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Upload progress</span>
            <span className="font-medium">{images.length}/{maxImages} photos</span>
          </div>
          <Progress value={(images.length / maxImages) * 100} className="h-2" />
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-2xl overflow-hidden bg-cream group"
            >
              <img
                src={image.preview}
                alt="Uploaded"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
              {image.status === "uploading" && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Progress value={image.progress} className="w-3/4 h-2" />
                </div>
              )}
            </div>
          ))}
          
          {/* Add more placeholder */}
          {images.length < maxImages && (
            <label className="relative aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex items-center justify-center transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </label>
          )}
        </div>
      )}

      {/* Continue Button */}
      {images.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleContinue} className="rounded-2xl px-8">
            Continue to Preview
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadStep;
