"use client";

import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

import { uploadAvatar, deleteAvatar } from "@/app/actions/upload-avatar";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange?: (avatarUrl: string) => void;
  className?: string;
}

export default function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange, 
  className = "" 
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop/selection
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      return;
    }

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
      // Simulate progress (since we can't track actual upload progress with server actions)
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
        // Reset preview to current avatar
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

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxFiles: 1,
    disabled: isUploading || isDeleting
  });

  // Handle delete avatar
  const handleDeleteAvatar = async () => {
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

  // Handle file input click
  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Avatar Display */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {/* Avatar Image */}
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Profile avatar"
                width={128}
                height={128}
                className="w-full h-full object-cover"
                priority
                onError={() => {
                  // Fallback to default avatar if image fails to load
                  setPreviewUrl(null);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-400"
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
                <div className="text-sm">{uploadProgress}%</div>
              </div>
            </div>
          )}

          {/* Delete Button */}
          {currentAvatarUrl && !isUploading && (
            <button
              onClick={handleDeleteAvatar}
              disabled={isDeleting}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            w-full max-w-md p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
            ${isDragActive && !isDragReject
              ? "border-blue-500 bg-blue-50"
              : isDragReject
              ? "border-red-500 bg-red-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }
            ${isUploading || isDeleting ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {onDrop([file]);}
            }}
            className="hidden"
          />

          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="text-sm text-gray-600">
              {isDragActive && !isDragReject && (
                <p>Drop the image here...</p>
              )}
              {isDragReject && (
                <p className="text-red-600">Invalid file type</p>
              )}
              {!isDragActive && (
                <div>
                  <p className="font-medium text-gray-900">
                    {isUploading ? "Uploading..." : "Upload avatar"}
                  </p>
                  <p className="text-gray-500">
                    Drag and drop an image, or{" "}
                    <button
                      type="button"
                      onClick={handleFileInputClick}
                      className="text-blue-600 hover:text-blue-700 underline"
                      disabled={isUploading || isDeleting}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, WebP, or GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-md p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {!error && isUploading && uploadProgress === 100 && (
          <div className="w-full max-w-md p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">Avatar uploaded successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
}
