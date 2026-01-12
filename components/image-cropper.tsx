"use client";

import { AlertCircle, Crop, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { type Area, getCroppedImg } from "@/lib/utils/crop-image";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

interface ImageCropperProps {
  image: string;
  onCancel: () => void;
  onComplete: (croppedFile: File) => void;
  open: boolean;
}

export function ImageCropper({
  image,
  onCancel,
  onComplete,
  open,
}: ImageCropperProps) {
  const t = useTranslations("ImageCropper");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCrop = async () => {
    if (!croppedAreaPixels) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);

      if (!croppedBlob) {
        setError(t("errorCropFailed"));
        setIsProcessing(false);
        return;
      }

      const croppedFile = new File([croppedBlob], "cropped-image.jpg", {
        type: "image/jpeg",
      });

      onComplete(croppedFile);
    } catch (err) {
      console.error("Error cropping image:", err);
      setError(t("errorCropFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="relative h-96 w-full">
            <Cropper
              aspect={1}
              crop={crop}
              cropShape="rect"
              image={image}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              showGrid
              zoom={zoom}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoom-slider">{t("zoomLabel")}</Label>
            <Slider
              defaultValue={[ZOOM_MIN]}
              id="zoom-slider"
              max={ZOOM_MAX}
              min={ZOOM_MIN}
              onValueChange={(value) => setZoom(value[0])}
              step={ZOOM_STEP}
              value={[zoom]}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isProcessing} onClick={onCancel} variant="outline">
            {t("cancelButton")}
          </Button>
          <Button disabled={isProcessing} onClick={handleCrop}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                <Crop className="mr-2 h-4 w-4" />
                {t("cropButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
