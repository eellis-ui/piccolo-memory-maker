import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OrderPhoto } from "@/pages/Builder";

interface UploadStepProps {
  orderId: string;
  onImagesUploaded: (photos: OrderPhoto[]) => void;
  maxImages?: number;
}

interface LocalImage {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "ready" | "error";
  progress: number;
  dbId?: string;
  storagePath?: string;
}

const UploadStep = ({ orderId, onImagesUploaded, maxImages = 20 }: UploadStepProps) => {
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File, localId: string, position: number): Promise<LocalImage | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const storagePath = `originals/${orderId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("order-files")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }

    // Create DB record
    const { data: photoRecord, error: dbError } = await supabase
      .from("order_photos")
      .insert({
        order_id: orderId,
        original_path: storagePath,
        page_position: position,
        conversion_status: "pending",
      })
      .select("id")
      .single();

    if (dbError || !photoRecord) {
      toast.error(`Failed to save record for ${file.name}`);
      return null;
    }

    return {
      id: localId,
      file,
      preview: URL.createObjectURL(file),
      status: "ready",
      progress: 100,
      dbId: photoRecord.id,
      storagePath,
    };
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || isUploading) return;

      const validFiles = Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .slice(0, maxImages - images.length);

      if (validFiles.length === 0) return;

      setIsUploading(true);

      // Add placeholders
      const placeholders: LocalImage[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "uploading" as const,
        progress: 0,
      }));

      setImages((prev) => [...prev, ...placeholders]);

      // Upload each file
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
    [images.length, maxImages, orderId, isUploading]
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

      if (img.storagePath) {
        await supabase.storage.from("order-files").remove([img.storagePath]);
      }
      if (img.dbId) {
        await supabase.from("order_photos").delete().eq("id", img.dbId);
      }

      URL.revokeObjectURL(img.preview);
      setImages((prev) => prev.filter((i) => i.id !== id));
    },
    [images]
  );

  const handleContinue = () => {
    const readyImages = images.filter((img) => img.status === "ready" && img.dbId && img.storagePath);

    const photos: OrderPhoto[] = readyImages.map((img, index) => {
      const { data } = supabase.storage
        .from("order-files")
        .getPublicUrl(img.storagePath!);

      return {
        id: img.dbId!,
        originalPath: img.storagePath!,
        convertedPath: null,
        pagePosition: index + 1,
        isApproved: false,
        conversionStatus: "pending",
        originalUrl: data.publicUrl,
        convertedUrl: null,
      };
    });

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
          accept="image/jpeg,image/png"
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
            <p className="text-muted-foreground">or click to browse (JPG, PNG)</p>
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
                accept="image/jpeg,image/png"
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
