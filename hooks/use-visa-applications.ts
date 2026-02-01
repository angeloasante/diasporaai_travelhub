"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface VisaApplication {
  id: string;
  applicant_name: string;
  email: string;
  date_of_birth?: string;
  passport_number?: string;
  phone?: string;
  origin_country: string;
  origin_country_code?: string;
  destination_country: string;
  destination_country_code?: string;
  destination_flag?: string;
  visa_type: string;
  travel_reason?: string;
  application_number: string;
  status: "draft" | "submitted" | "interview" | "processing" | "approved" | "denied";
  vfs_check_enabled: boolean;
  vfs_email?: string;
  vfs_password_encrypted?: string;
  preferred_date_from?: string;
  preferred_date_to?: string;
  vfs_center?: string;
  visa_category?: string;
  visa_sub_category?: string;
  monitoring_enabled: boolean;
  monitoring_job_id?: string;
  last_slot_check?: string;
  slot_found: boolean;
  slot_date?: string;
  slot_time?: string;
  slot_location?: string;
  slot_confirmation_code?: string;
  requirements: Array<{ id: string; label: string; completed: boolean }>;
  costs: Array<{ label: string; amount: number }>;
  referral_source?: string;
  notes?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UseVisaApplicationsOptions {
  email?: string;
  userId?: string;
  enableRealtime?: boolean;
}

export function useVisaApplications(options: UseVisaApplicationsOptions = {}) {
  const { email, userId, enableRealtime = true } = options;
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch applications from API
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (email) params.append("email", email);
      if (userId) params.append("userId", userId);

      const response = await fetch(`/api/visa/applications?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch applications");
      }

      setApplications(data.applications || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  }, [email, userId]);

  // Create a new application
  const createApplication = useCallback(async (applicationData: Partial<VisaApplication>) => {
    try {
      const response = await fetch("/api/visa/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create application");
      }

      // Optimistically update local state
      setApplications((prev) => [data.application, ...prev]);
      return data.application;
    } catch (err) {
      console.error("Error creating application:", err);
      throw err;
    }
  }, []);

  // Update an existing application
  const updateApplication = useCallback(async (id: string, updates: Partial<VisaApplication>) => {
    try {
      const response = await fetch("/api/visa/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update application");
      }

      // Optimistically update local state
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, ...data.application } : app))
      );
      return data.application;
    } catch (err) {
      console.error("Error updating application:", err);
      throw err;
    }
  }, []);

  // Delete an application
  const deleteApplication = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/visa/applications?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete application");
      }

      // Optimistically update local state
      setApplications((prev) => prev.filter((app) => app.id !== id));
      return true;
    } catch (err) {
      console.error("Error deleting application:", err);
      throw err;
    }
  }, []);

  // Toggle requirement completion
  const toggleRequirement = useCallback(async (appId: string, reqId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    const updatedRequirements = app.requirements.map((req) =>
      req.id === reqId ? { ...req, completed: !req.completed } : req
    );

    await updateApplication(appId, { requirements: updatedRequirements });
  }, [applications, updateApplication]);

  // Update slot information
  const updateSlotInfo = useCallback(async (appId: string, slotInfo: {
    slot_found: boolean;
    slot_date?: string;
    slot_time?: string;
    slot_location?: string;
    slot_confirmation_code?: string;
    last_slot_check?: string;
  }) => {
    await updateApplication(appId, slotInfo);
  }, [updateApplication]);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Set up realtime subscription
  useEffect(() => {
    if (!enableRealtime || !supabase) return;

    const setupChannel = async () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Subscribe to changes
      const channel = supabase
        .channel("visa_applications_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "visa_applications",
          },
          (payload) => {
            console.log("Realtime update received:", payload);

            if (payload.eventType === "INSERT") {
              const newApp = payload.new as VisaApplication;
              // Only add if matches our filter
              if ((!email || newApp.email === email) && (!userId || newApp.user_id === userId)) {
                setApplications((prev) => {
                  // Check if already exists (to avoid duplicates from optimistic updates)
                  if (prev.some((app) => app.id === newApp.id)) {
                    return prev;
                  }
                  return [newApp, ...prev];
                });
              }
            } else if (payload.eventType === "UPDATE") {
              const updatedApp = payload.new as VisaApplication;
              setApplications((prev) =>
                prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
              );
            } else if (payload.eventType === "DELETE") {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setApplications((prev) => prev.filter((app) => app.id !== deletedId));
              }
            }
          }
        )
        .subscribe((status) => {
          console.log("Realtime subscription status:", status);
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [email, userId, enableRealtime]);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    toggleRequirement,
    updateSlotInfo,
  };
}
