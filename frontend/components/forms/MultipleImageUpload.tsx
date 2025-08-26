'use client';

import Image from 'next/image';
import React, { useRef, useState, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils/classNames';
// Custom button and badge components
const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }: any) => (
  <button 
    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Badge = ({ children, variant = 'default', className = '', ...props }: any) => (
  <span 
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    {...props}
  >
    {children}
  </span>
);

interface MultipleImageUploadProps {
  onImagesUpload: (imageUrls: string[]) => void;
  currentImageUrls?: string[];
  maxImages?: number;
  minImages?: number;
  className?: string;
}

interface UploadedImage {
  id: string;
  url: string;
  file?: File;
  preview?: string;
  uploading?: boolean;
  error?: string;
}

export default function MultipleImageUpload({ 
  onImagesUpload, 
  currentImageUrls = [], 
  maxImages = 5,
  minImages = 2,
  className 
}: MultipleImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(
    currentImageUrls.map((url, index) => ({
      id: `existing-${index}`,
      url,
      preview: url
    }))
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const cloudName = process.env['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'];
    if (!cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }
    
    console.log('Uploading to Cloudinary:', { cloudName, fileSize: file.size, fileName: file.name });
    
    // Try different upload presets
    const uploadPresets = ['jewgo_restaurants', 'ml_default', 'jewgo'];
    
    for (const preset of uploadPresets) {
      try {
        formData.set('upload_preset', preset);
        
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('Upload successful with preset:', preset, data.secure_url);
          return data.secure_url;
        } else {
          const errorText = await response.text();
          console.warn(`Upload failed with preset ${preset}:`, response.status, errorText);
        }
      } catch (error) {
        console.warn(`Upload failed with preset ${preset}:`, error);
      }
    }
    
    throw new Error('Failed to upload image with all available presets');
  };

  const validateFile = (file: File): string | null => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file (PNG, JPG, JPEG, GIF)';
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return 'Image must be less than 5MB';
    }

    return null;
  };

  const addImages = useCallback(async (files: FileList) => {
    const newFiles = Array.from(files);
    const remainingSlots = maxImages - images.length;
    
    if (newFiles.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}`);
      return;
    }

    const newImages: UploadedImage[] = newFiles.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      url: '', // Will be set after upload
      file,
      uploading: true,
      error: undefined
    }));

    // Add new images to state
    setImages(prev => [...prev, ...newImages]);

    // Upload each image
    for (const newImage of newImages) {
      if (!newImage.file) {
      continue;
    }

      try {
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages(prev => prev.map(img => 
            img.id === newImage.id 
              ? { ...img, preview: e.target?.result as string }
              : img
          ));
        };
        reader.readAsDataURL(newImage.file);

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(newImage.file);
        
        setImages(prev => prev.map(img => 
          img.id === newImage.id 
            ? { ...img, url: imageUrl, uploading: false }
            : img
        ));

      } catch (error) {
        console.error('Upload failed:', error);
        setImages(prev => prev.map(img => 
          img.id === newImage.id 
            ? { ...img, uploading: false, error: 'Upload failed' }
            : img
        ));
      }
    }
  }, [images.length, maxImages]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('File selected:', files);
    if (files && files.length > 0) {
      console.log('Processing files:', files.length);
      addImages(files);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  }, [addImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addImages(files);
    }
  }, [addImages]);

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const retryUpload = useCallback(async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image?.file) {return;}

    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { ...img, uploading: true, error: undefined }
        : img
    ));

    try {
      const imageUrl = await uploadToCloudinary(image.file);
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, url: imageUrl, uploading: false }
          : img
      ));
    } catch (error) {
      console.error('Retry upload failed:', error);
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, uploading: false, error: 'Upload failed' }
          : img
      ));
    }
  }, [images]);

  // Update parent component when images change
  React.useEffect(() => {
    const validImages = images.filter(img => img.url && !img.uploading && !img.error);
    onImagesUpload(validImages.map(img => img.url));
  }, [images, onImagesUpload]);

  const validImages = images.filter(img => img.url && !img.uploading && !img.error);
  const uploadingImages = images.filter(img => img.uploading);
  const errorImages = images.filter(img => img.error);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Restaurant Images *
        </label>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {validImages.length}/{maxImages}
          </Badge>
          {minImages > 0 && (
            <Badge variant={validImages.length >= minImages ? "default" : "destructive"}>
              Min {minImages}
            </Badge>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                {image.preview ? (
                  <Image
                    src={image.preview}
                    alt="Restaurant image"
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Uploading indicator */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}

                {/* Error indicator */}
                {image.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                    <div className="text-center text-white">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-xs">Upload failed</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => retryUpload(image.id)}
                        className="mt-2 text-xs"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            console.log('Upload area clicked, triggering file input');
            fileInputRef.current?.click();
          }}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
            isDragOver
              ? "border-jewgo-primary bg-jewgo-primary/10"
              : "border-gray-300 hover:border-jewgo-primary hover:bg-jewgo-primary/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadingImages.length > 0}
          />
          
          <div className="space-y-3">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragOver ? 'Drop images here' : 'Upload restaurant images'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Drag & drop or click to select {maxImages - images.length} more image{maxImages - images.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, JPEG, GIF up to 5MB each
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Messages */}
      {minImages > 0 && validImages.length < minImages && (
        <div className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Please upload at least {minImages} image{minImages !== 1 ? 's' : ''}
        </div>
      )}

      {errorImages.length > 0 && (
        <div className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {errorImages.length} image{errorImages.length !== 1 ? 's' : ''} failed to upload
        </div>
      )}

      {/* Upload Progress */}
      {uploadingImages.length > 0 && (
        <div className="text-sm text-blue-600 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Uploading {uploadingImages.length} image{uploadingImages.length !== 1 ? 's' : ''}...
        </div>
      )}
    </div>
  );
}
