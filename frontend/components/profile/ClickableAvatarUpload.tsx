"use client";

import { useCallback, useState, useRef } from "react";
import Image from "next/image";

import { uploadAvatar, deleteAvatar } from "@/app/actions/upload-avatar";

interface ClickableAvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange?: (avatarUrl: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function ClickableAvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange, 
  className = "",
  size = "lg"
}: ClickableAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Size configurations
  const sizeConfig = {
    sm: { avatar: "w-16 h-16", icon: "w-8 h-8", text: "text-xs" },
    md: { avatar: "w-24 h-24", icon: "w-12 h-12", text: "text-sm" },
    lg: { avatar: "w-32 h-32", icon: "w-16 h-16", text: "text-sm" },
    xl: { avatar: "w-40 h-40", icon: "w-20 h-20", text: "text-base" }
  };

  const config = sizeConfig[size];

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const formData = new FormData();
      formData.append("avatar", file);

      const result = await uploadAvatar(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.avatarUrl) {
        setPreviewUrl(result.avatarUrl);
        onAvatarChange?.(result.avatarUrl);
        setError(null);
      } else {
        setError(result.error || "Upload failed");
        setPreviewUrl(currentAvatarUrl || null);
      }
    } catch {
      setError("Upload failed. Please try again.");
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [currentAvatarUrl, onAvatarChange]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle delete avatar
  const handleDeleteAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering file input
    if (!currentAvatarUrl) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteAvatar();
      
      if (result.success) {
        setPreviewUrl(null);
        onAvatarChange?.("");
      } else {
        setError(result.error || "Failed to delete avatar");
      }
    } catch {
      setError("Failed to delete avatar. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle avatar click
  const handleAvatarClick = () => {
    if (!isUploading && !isDeleting) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Clickable Avatar */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative group">
          {/* Avatar Image */}
          <div 
            className={`${config.avatar} rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg cursor-pointer transition-all duration-200 group-hover:shadow-xl group-hover:scale-105 ${
              isUploading || isDeleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleAvatarClick}
          >
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Profile avatar"
                width={size === "sm" ? 64 : size === "md" ? 96 : size === "lg" ? 128 : 160}
                height={size === "sm" ? 64 : size === "md" ? 96 : size === "lg" ? 128 : 160}
                className="w-full h-full object-cover"
                priority
                onError={() => {
                  setPreviewUrl(null);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className={`${config.icon} text-gray-400`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className={`${config.text}`}>{uploadProgress}%</div>
              </div>
            </div>
          )}

          {/* Hover Overlay */}
          {!isUploading && !isDeleting && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200">
              <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className={`${config.icon} mx-auto`} fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className={`${config.text} mt-1 font-medium`}>Upload Photo</p>
              </div>
            </div>
          )}

          {/* Delete Button */}
          {currentAvatarUrl && !isUploading && (
            <button
              onClick={handleDeleteAvatar}
              disabled={isDeleting}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              title="Delete avatar"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className={`${config.text} text-gray-600`}>
            Click the avatar to upload a new photo
          </p>
          <p className={`${config.text} text-gray-400 mt-1`}>
            PNG, JPG, WebP, or GIF up to 5MB
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading || isDeleting}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full max-w-md mx-auto p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {!error && isUploading && uploadProgress === 100 && (
        <div className="w-full max-w-md mx-auto p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">Avatar uploaded successfully!</p>
        </div>
      )}
    </div>
  );
}
