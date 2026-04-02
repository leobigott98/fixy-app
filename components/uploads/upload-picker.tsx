"use client";

import { useRef, useState } from "react";
import { Camera, FileText, LoaderCircle, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadScope } from "@/lib/uploads";

type UploadPickerProps = {
  scope: UploadScope;
  accept: string;
  values: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  label: string;
  helper?: string;
  buttonLabel?: string;
  cameraLabel?: string;
  canTakePhoto?: boolean;
  error?: string;
};

type UploadedFileResponse = {
  url: string;
  name: string;
  contentType: string;
};

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|webp|png)$/i.test(url);
}

export function UploadPicker({
  scope,
  accept,
  values,
  onChange,
  multiple = false,
  maxFiles,
  label,
  helper,
  buttonLabel = "Subir archivo",
  cameraLabel = "Tomar foto",
  canTakePhoto = false,
  error,
}: UploadPickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append("scope", scope);

    Array.from(fileList).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        message?: string;
        files?: UploadedFileResponse[];
      };

      if (!response.ok || !payload.files) {
        throw new Error(payload.message || "No se pudo subir el archivo.");
      }

      const nextValues = multiple
        ? [...values, ...payload.files.map((file) => file.url)]
        : payload.files.slice(-1).map((file) => file.url);

      onChange(maxFiles ? nextValues.slice(0, maxFiles) : nextValues);
    } catch (uploadError) {
      setUploadMessage(
        uploadError instanceof Error ? uploadError.message : "No se pudo subir el archivo.",
      );
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
        {helper ? <div className="text-sm leading-6 text-[var(--muted)]">{helper}</div> : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          ref={fileInputRef}
          accept={accept}
          className="hidden"
          multiple={multiple}
          onChange={(event) => void uploadFiles(event.target.files)}
          type="file"
        />
        <Button
          disabled={isUploading || (Boolean(maxFiles) && values.length >= (maxFiles ?? 0))}
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          {isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {buttonLabel}
        </Button>

        {canTakePhoto ? (
          <>
            <input
              ref={cameraInputRef}
              accept="image/jpeg,image/webp,image/png"
              capture="environment"
              className="hidden"
              multiple={multiple}
              onChange={(event) => void uploadFiles(event.target.files)}
              type="file"
            />
            <Button
              disabled={isUploading || (Boolean(maxFiles) && values.length >= (maxFiles ?? 0))}
              onClick={() => cameraInputRef.current?.click()}
              type="button"
              variant="outline"
            >
              <Camera className="size-4" />
              {cameraLabel}
            </Button>
          </>
        ) : null}
      </div>

      {values.length ? (
        <div className={cn("grid gap-3", multiple ? "sm:grid-cols-2" : "")}>
          {values.map((value) => (
            <div
              key={value}
              className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                {isImageUrl(value) ? (
                  <img
                    alt="Archivo subido"
                    className="h-24 w-full rounded-2xl object-cover"
                    src={value}
                  />
                ) : (
                  <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white/80 p-4">
                    <FileText className="size-5 text-[var(--primary-strong)]" />
                    <a
                      className="text-sm font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                      href={value}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Ver archivo
                    </a>
                  </div>
                )}
                <Button
                  onClick={() => onChange(values.filter((item) => item !== value))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {uploadMessage ? (
        <div className="text-sm text-[#b42318]">{uploadMessage}</div>
      ) : null}
      {error ? <div className="text-sm text-[#b42318]">{error}</div> : null}
    </div>
  );
}
