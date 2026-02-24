import { useState, useCallback, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { OrderPhoto } from "@/pages/Builder";
import {
  uploadGuestPhoto,
  deleteGuestPhoto,
  getSignedUrls,
} from "@/lib/guest-api";

interface UploadStepProps {
  orderId: string;
  sessionId: string;
  onImagesUploaded: (photos: OrderPhoto[]) => void;
  maxImages?: number;
  initialImages?: LocalImage[];
  onImagesChanged?: (images: LocalImage[]) => void;
}

export interface LocalImage {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "ready" | "error";
  progress: number;
  dbId?: string;
  storagePath?: string;
  isLandscape?: boolean;
}

const UploadStep = ({ orderId, sessionId, onImagesUploaded, maxImages = 20, initialImages, onImagesChanged }: UploadStepProps) => {
  const [images, setImages] = useState<LocalImage[]>(initialImages ?? []);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Sync images back to parent so they persist across tab switches
  useEffect(() => {
    onImagesChanged?.(images);
  }, [images, onImagesChanged]);

  // Convert HEIC to JPEG blob using heic-to
  const convertHeicToJpeg = async (file: File): Promise<Blob> => {
    const { heicTo } = await import("heic-to");
    const result = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    return result;
  };

  // Normalize image orientation by drawing to canvas
  const normalizeImage = (blob: Blob): Promise<{ blob: Blob; isLandscape: boolean }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        ctx.drawImage(img, 0, 0);
        const isLandscape = img.naturalWidth > img.naturalHeight;
        canvas.toBlob(
          (result) => (result ? resolve({ blob: result, isLandscape }) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.92
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(blob);
    });
  };

  const uploadFile = async (file: File, localId: string, position: number): Promise<LocalImage | null> => {
    // Convert HEIC if needed
    let inputBlob: Blob = file;
    const nameLower = file.name.toLowerCase();
    const isHeic = nameLower.endsWith(".heic") || nameLower.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif";
    if (isHeic) {
      try {
        inputBlob = await convertHeicToJpeg(file);
      } catch (err) {
        console.error("HEIC conversion error:", err);
        toast.error(`Failed to convert HEIC file: ${file.name}. Please convert to JPG first.`);
        return null;
      }
    }

    // Normalize orientation via canvas before uploading
    const { blob: normalizedBlob, isLandscape } = await normalizeImage(inputBlob);

    try {
      const result = await uploadGuestPhoto(sessionId, orderId, normalizedBlob, position, isLandscape);

      return {
        id: localId,
        file,
        preview: URL.createObjectURL(normalizedBlob),
        status: "ready",
        progress: 100,
        dbId: result.id,
        storagePath: result.storagePath,
        isLandscape,
      };
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || isUploading) return;

      const validFiles = Array.from(files)
        .filter((file) => file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif"))
        .slice(0, maxImages - images.length);

      if (validFiles.length === 0) return;

      setIsUploading(true);

      const placeholders: LocalImage[] = validFiles.map((file) => {
        const nameLower = file.name.toLowerCase();
        const isHeicFile = nameLower.endsWith(".heic") || nameLower.endsWith(".heif");
        return {
          id: crypto.randomUUID(),
          file,
          preview: isHeicFile ? "" : URL.createObjectURL(file),
          status: "uploading" as const,
          progress: 0,
        };
      });

      setImages((prev) => [...prev, ...placeholders]);

      const startPosition = images.length;
      const results = await Promise.all(
        placeholders.map((ph, i) => uploadFile(ph.file, ph.id, startPosition + i + 1))
      );

      setImages((prev) =>
        prev.map((img) => {
          const result = results.find((r) => r?.id === img.id);
          if (result) return result;
          if (placeholders.find((p) => p.id === img.id) && !result) {
            return { ...img, status: "error" as const };
          }
          return img;
        })
      );

      setIsUploading(false);
    },
    [images.length, maxImages, orderId, sessionId, isUploading]
  );

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

  const removeImage = useCallback(
    async (id: string) => {
      const img = images.find((i) => i.id === id);
      if (!img) return;

      try {
        await deleteGuestPhoto(sessionId, orderId, img.dbId, img.storagePath);
      } catch (err) {
        console.error("Delete error:", err);
      }

      URL.revokeObjectURL(img.preview);
      setImages((prev) => prev.filter((i) => i.id !== id));
    },
    [images, sessionId, orderId]
  );

  const handleContinue = async () => {
    const readyImages = images.filter((img) => img.status === "ready" && img.dbId && img.storagePath);

    // Get signed URLs via edge function
    const paths = readyImages.map((img) => img.storagePath!);
    let urlMap: Record<string, string> = {};
    try {
      const urls = await getSignedUrls(sessionId, orderId, paths);
      urlMap = Object.fromEntries(urls.map((u) => [u.path, u.signedUrl]));
    } catch (err) {
      console.error("Failed to get signed URLs:", err);
    }

    const photos: OrderPhoto[] = readyImages.map((img, index) => ({
      id: img.dbId!,
      originalPath: img.storagePath!,
      convertedPath: null,
      pagePosition: index + 1,
      isApproved: false,
      conversionStatus: "pending",
      originalUrl: urlMap[img.storagePath!] || "",
      convertedUrl: null,
      isLandscape: img.isLandscape ?? false,
    }));

    onImagesUploaded(photos);
  };

  const readyCount = images.filter((i) => i.status === "ready").length;

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
          accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cream">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              Drop your photos here
            </p>
            <p className="text-muted-foreground">or click to browse (JPG, PNG, HEIC)</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {readyCount} of {maxImages} photos uploaded
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Upload progress</span>
            <span className="font-medium">
              {readyCount}/{maxImages} photos
            </span>
          </div>
          <Progress value={(readyCount / maxImages) * 100} className="h-2" />
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
              {image.preview ? (
                <img
                  src={image.preview}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
              {image.status === "uploading" && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {image.status === "error" && (
                <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                  <span className="text-xs text-destructive font-medium">Failed</span>
                </div>
              )}
            </div>
          ))}

          {/* Add more placeholder */}
          {readyCount < maxImages && (
            <label className="relative aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex items-center justify-center transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </label>
          )}
        </div>
      )}

      {/* Continue Button */}
      {readyCount > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={isUploading}
            className="rounded-2xl px-8"
          >
            Continue to Preview
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadStep;
