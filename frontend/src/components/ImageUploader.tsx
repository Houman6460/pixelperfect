import React, { useCallback, useState } from "react";

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
}

export function ImageUploader({ file, previewUrl, onFileChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        onFileChange(null);
        return;
      }
      const candidate = files[0];
      if (!candidate.type.startsWith("image/")) {
        return;
      }
      onFileChange(candidate);
    },
    [onFileChange]
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const borderClass = isDragging ? "border-emerald-400 bg-slate-800/60" : "border-slate-700 bg-slate-900/60";

  const fileInfo = (() => {
    if (!file) {
      return "JPG, PNG, or WEBP up to 10MB";
    }
    const mb = Math.round((file.size / (1024 * 1024)) * 100) / 100;
    return file.name + " - " + mb + " MB";
  })();

  return (
    <div className="space-y-3">
      <div
        className={
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors " +
          borderClass
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <p className="text-sm font-medium text-slate-100">Drop an image here or click to upload</p>
        <p className="mt-1 text-xs text-slate-400">{fileInfo}</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          onClick={() => {
            const input = document.getElementById("image-input") as HTMLInputElement | null;
            if (input) {
              input.click();
            }
          }}
        >
          Choose file
        </button>
        <input
          id="image-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
          aria-label="Upload image file"
          title="Select an image to enhance"
        />
      </div>

      {previewUrl && (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-black/70">
          <img src={previewUrl} alt="Preview" className="max-h-80 w-full object-contain" />
        </div>
      )}
    </div>
  );
}
