"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Image as ImageIcon, Link as LinkIcon, Loader2 } from "lucide-react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [tempUrl, setTempUrl] = useState("");

  const handleSimulatedUpload = () => {
    // Note: To configure a real bucket (e.g. S3, Cloudinary),
    // implement the provider SDK here.
    // Since we don't have production credentials, we emit a mock URL.
    setIsUploading(true);
    setTimeout(() => {
      const mockUrl = `https://picsum.photos/seed/${Math.random()}/400/400`;
      onChange(mockUrl);
      setIsUploading(false);
      toast.success("Image uploaded successfully (simulated)");
    }, 1500);
  };

  const handleUrlSubmit = () => {
    if (!tempUrl) return;
    onChange(tempUrl);
    setTempUrl("");
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div className="bg-muted relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/400x400?text=Invalid+Image";
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onChange("")}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-muted/20 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6">
          <div className="flex gap-2">
            <Button
              variant={mode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("upload")}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("url")}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              URL
            </Button>
          </div>

          {mode === "upload" && (
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground text-sm">
                (Simulated Upload - No external credentials configured)
              </p>
              <Button onClick={handleSimulatedUpload} disabled={isUploading}>
                {isUploading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Select File
              </Button>
            </div>
          )}

          {mode === "url" && (
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
              />
              <Button type="button" onClick={handleUrlSubmit}>
                Set
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
