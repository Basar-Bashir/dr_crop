"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { 
  Camera, 
  Image as ImageIcon, 
  Upload, 
  Leaf, 
  Loader2, 
  Zap,
  X 
} from "lucide-react";

interface Props {
  onImageSelected: (file: File) => void;
  loading: boolean;
  preview: string | null;
  setPreview: (p: string | null) => void;
}

export default function ImageUploader({
  onImageSelected,
  loading,
  preview,
  setPreview,
}: Props) {
  const { t } = useLocale();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastPreviewRef = useRef<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (lastPreviewRef.current) URL.revokeObjectURL(lastPreviewRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      if (lastPreviewRef.current) {
        URL.revokeObjectURL(lastPreviewRef.current);
        lastPreviewRef.current = null;
      }
      const url = URL.createObjectURL(file);
      lastPreviewRef.current = url;
      setPreview(url);
      onImageSelected(file);
    },
    [setPreview, onImageSelected]
  );

  const stopLiveCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraError(null);
  }, []);

  const startLiveCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("errCameraApi"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          el.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(t("errCameraPermission"));
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `crop-${Date.now()}.jpg`, { type: "image/jpeg" });
        stopLiveCamera();
        handleFile(file);
      },
      "image/jpeg",
      0.92
    );
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const crops = [
    { label: "Corn", key: "corn" },
    { label: "Tomato", key: "tomato" },
    { label: "Potato", key: "potato" },
    { label: "Grape", key: "grape" },
    { label: "Wheat", key: "wheat" },
    { label: "Apple", key: "apple" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <button
          type="button"
          onClick={startLiveCamera}
          disabled={loading || cameraOpen}
          className="btn-primary"
          style={{ fontSize: 13, gap: 10, padding: "12px 16px" }}
        >
          <Camera size={18} /> {t("uploadLiveCamera")}
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={loading}
          className="btn-secondary"
          style={{ fontSize: 13, gap: 10, padding: "12px 16px" }}
        >
          <Zap size={18} /> {t("uploadQuickCapture")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button
          id="btn-gallery-upload"
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={loading}
          className="btn-secondary"
          style={{ flex: 1, gap: 10 }}
        >
          <ImageIcon size={18} />
          {t("uploadGallery")}
        </button>
      </div>

      {cameraError && (
        <div
          style={{
            fontSize: 12,
            color: "var(--warning)",
            marginBottom: 12,
            padding: "10px 14px",
            background: "var(--warning-bg)",
            borderRadius: 12,
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <Loader2 size={14} className="animate-spin" />
          {cameraError}
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: "none" }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: "none" }}
      />

      {cameraOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(4,7,5,0.95)",
            backdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{ width: "100%", maxWidth: 480, borderRadius: 24, overflow: "hidden", border: "1px solid var(--border-bright)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <video ref={videoRef} playsInline muted autoPlay className="w-full aspect-video object-cover" style={{ display: "block", background: "#000" }} />
            <div style={{ display: "flex", gap: 12, padding: 16, background: "var(--surface)" }}>
              <button type="button" onClick={captureFrame} disabled={loading} className="btn-primary" style={{ flex: 1 }}>
                {t("uploadCaptureCrop")}
              </button>
              <button type="button" onClick={stopLiveCamera} className="btn-ghost" style={{ padding: "0 20px" }}>
                <X size={20} />
              </button>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 16, textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>
            {t("cameraOverlayHelp")}
          </p>
        </div>
      )}

      <div
        className={`drop-zone${isDragging ? " active" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => galleryInputRef.current?.click()}
        style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}
        id="drop-zone-area"
      >
        {preview ? (
          <div style={{ position: "relative", width: "100%", height: 220, borderRadius: 16, overflow: "hidden" }}>
            <Image
              src={preview}
              alt="Crop preview"
              fill
              className="object-contain"
              unoptimized // Blobs don't need optimization from Next.js server
            />
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(4,7,5,0.75)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <Loader2 size={40} className="animate-spin text-[var(--accent-400)]" />
                <p style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em" }}>
                  {t("uploadAnalyzing")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                background: "var(--success-bg)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "var(--accent-400)",
              }}
            >
              <Upload size={28} />
            </div>
            <p style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.01em" }}>
              {t("uploadDrop")}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>
              {t("uploadFormats")}
            </p>
          </div>
        )}
      </div>

      {!preview && (
        <div
          id="crops"
          style={{
            marginTop: 24,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}
          className="animate-fade-in delay-200"
        >
          {crops.map((crop) => (
            <span key={crop.key} className="feature-pill" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 14px" }}>
              <Leaf size={12} strokeWidth={2.5} />
              {crop.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
