"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ProfileFormSchema, type ProfileFormData } from "@/lib/validators/profile";
import { updateProfile, getCurrentProfile } from "@/app/actions/update-profile";
import { useUsernameValidation } from "@/hooks/useUsernameValidation";
import { useToast } from "@/components/ui/Toast";

interface ProfileEditFormProps {
  onProfileUpdate?: (data: ProfileFormData) => void;
  className?: string;
}

export default function ProfileEditForm({ onProfileUpdate, className = "" }: ProfileEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { showSuccess, showError, showInfo } = useToast() as {
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
    showInfo: (message: string, duration?: number) => void;
    toasts: any[];
    addToast: (message: string, type?: string, duration?: number) => void;
    removeToast: (id: string) => void;
    showWarning: (message: string, duration?: number) => void;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileFormSchema),
    mode: "onChange",
  });

  const watchedUsername = watch("username");
  const {
    username,
    setUsername,
    getValidationMessage,
    getValidationStatus,
    isValid: isUsernameValid,
  } = useUsernameValidation(watchedUsername || "");

  // Load current profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        console.log('Loading profile data...');
        const result = await getCurrentProfile();
        console.log('Profile load result:', result);
        
        if (result.success && result.data) {
          const profileData = result.data;
          console.log('Profile data loaded:', profileData);
          
          // Set form values
          setValue("username", profileData.username);
          setValue("displayName", profileData.displayName);
          setValue("bio", profileData.bio);
          setValue("location", profileData.location);
          setValue("website", profileData.website);
          setValue("phone", profileData.phone);
          setValue("dateOfBirth", profileData.dateOfBirth || "");
          setValue("emailNotifications", profileData.preferences.emailNotifications);
          setValue("pushNotifications", profileData.preferences.pushNotifications);
          setValue("marketingEmails", profileData.preferences.marketingEmails);
          setValue("publicProfile", profileData.preferences.publicProfile);
          setValue("showLocation", profileData.preferences.showLocation);
          
          // Set username for validation
          setUsername(profileData.username);
          
          setIsInitialized(true);
        } else {
          console.error('Failed to load profile:', result.error);
          showError("Failed to load profile data");
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        showError("Failed to load profile data");
      }
    };

    loadProfile();
  }, [setValue, setUsername, showError]);

  // Update username validation when form username changes
  useEffect(() => {
    if (watchedUsername !== username) {
      setUsername(watchedUsername || "");
    }
  }, [watchedUsername, username, setUsername]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!isUsernameValid) {
      showError("Please fix username validation errors");
      return;
    }

    setIsLoading(true);

    try {
      // Transform form data to match server schema
      const profileData = {
        username: data.username,
        displayName: data.displayName,
        bio: data.bio || "",
        location: data.location || "",
        website: data.website || "",
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || null,
        preferences: {
          emailNotifications: data.emailNotifications,
          pushNotifications: data.pushNotifications,
          marketingEmails: data.marketingEmails,
          publicProfile: data.publicProfile,
          showLocation: data.showLocation,
        },
      };

      const result = await updateProfile(profileData);

      if (result.success) {
        showSuccess("Profile updated successfully!");
        onProfileUpdate?.(data);
        
        // Reset form dirty state
        reset(data);
        
        // Show link to public profile if username was updated
        if (data.username) {
          showInfo(`Your public profile is available at /u/${data.username}`);
        }
      } else {
        showError(result.error || "Failed to update profile");
      }
    } catch (error) {
      showError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getUsernameStatusColor = () => {
    const status = getValidationStatus();
    switch (status) {
      case "checking":
        return "text-blue-500";
      case "available":
        return "text-green-500";
      case "unavailable":
        return "text-red-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  if (!isInitialized) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${className}`}>
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username *
            </label>
            <div className="mt-1 relative">
              <input
                {...register("username")}
                type="text"
                id="username"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.username ? "border-red-300" : ""
                }`}
                placeholder="Enter username"
              />
              {watchedUsername && (
                <div className={`mt-1 text-sm ${getUsernameStatusColor()}`}>
                  {getValidationMessage()}
                </div>
              )}
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name *
            </label>
            <input
              {...register("displayName")}
              type="text"
              id="displayName"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.displayName ? "border-red-300" : ""
              }`}
              placeholder="Enter display name"
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          {...register("bio")}
          id="bio"
          rows={3}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.bio ? "border-red-300" : ""
          }`}
          placeholder="Tell us about yourself..."
        />
        <div className="mt-1 flex justify-between text-sm text-gray-500">
          <span>Optional</span>
          <span>{watch("bio")?.length || 0}/500</span>
        </div>
        {errors.bio && (
          <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
        )}
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              {...register("location")}
              type="text"
              id="location"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.location ? "border-red-300" : ""
              }`}
              placeholder="City, State"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <input
              {...register("website")}
              type="url"
              id="website"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.website ? "border-red-300" : ""
              }`}
              placeholder="https://example.com"
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              {...register("phone")}
              type="tel"
              id="phone"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.phone ? "border-red-300" : ""
              }`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              {...register("dateOfBirth")}
              type="date"
              id="dateOfBirth"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.dateOfBirth ? "border-red-300" : ""
              }`}
            />
            {errors.dateOfBirth && (
              <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
                Email Notifications
              </label>
              <p className="text-sm text-gray-500">Receive email notifications about your account</p>
            </div>
            <input
              {...register("emailNotifications")}
              type="checkbox"
              id="emailNotifications"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="pushNotifications" className="text-sm font-medium text-gray-700">
                Push Notifications
              </label>
              <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
            </div>
            <input
              {...register("pushNotifications")}
              type="checkbox"
              id="pushNotifications"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="marketingEmails" className="text-sm font-medium text-gray-700">
                Marketing Emails
              </label>
              <p className="text-sm text-gray-500">Receive emails about new features and updates</p>
            </div>
            <input
              {...register("marketingEmails")}
              type="checkbox"
              id="marketingEmails"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="publicProfile" className="text-sm font-medium text-gray-700">
                Public Profile
              </label>
              <p className="text-sm text-gray-500">Allow others to view your profile</p>
            </div>
            <input
              {...register("publicProfile")}
              type="checkbox"
              id="publicProfile"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="showLocation" className="text-sm font-medium text-gray-700">
                Show Location
              </label>
              <p className="text-sm text-gray-500">Display your location on your public profile</p>
            </div>
            <input
              {...register("showLocation")}
              type="checkbox"
              id="showLocation"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isLoading || !isDirty || !isUsernameValid}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
