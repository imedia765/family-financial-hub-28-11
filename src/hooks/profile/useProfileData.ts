
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemberWithRelations } from "@/types/member";
import { matchAndLinkProfile } from "@/utils/profileMatcher";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import debounce from "lodash/debounce";

interface UseProfileDataReturn {
  memberData: MemberWithRelations | null;
  loading: boolean;
  error: string | null;
  loadingStates: {
    profile: boolean;
    familyMembers: boolean;
    payments: boolean;
    documents: boolean;
  };
  setLoadingState: (key: string, value: boolean) => void;
  fetchData: (retryCount?: number) => Promise<void>;
}

export function useProfileData(): UseProfileDataReturn {
  const [loadingStates, setLoadingStates] = useState({
    profile: false,
    familyMembers: false,
    payments: false,
    documents: false
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setLoadingState = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  // Debounced fetch implementation
  const debouncedFetch = debounce(async () => {
    await queryClient.invalidateQueries({ queryKey: ['profileData'] });
  }, 500);

  const { data: memberData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['profileData'],
    queryFn: async () => {
      try {
        setLoadingState('profile', true);
        console.log("[useProfileData] Starting profile data fetch");
        
        const { data: { user } } = await supabase.auth.getUser();
        console.log("[useProfileData] Current auth user:", user);
        
        if (!user) {
          console.log("[useProfileData] No user found, redirecting to login");
          toast({
            title: "Session Expired",
            description: "Please log in again to continue",
            variant: "destructive",
          });
          navigate("/");
          return null;
        }

        // Get latest member number from email_audit table
        const { data: emailAuditRecords, error: emailAuditError } = await supabase
          .from('email_audit')
          .select('member_number')
          .eq('auth_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (emailAuditError) {
          console.error('Failed to fetch email audit:', emailAuditError);
        }

        const latestEmailAudit = emailAuditRecords?.[0];
        console.log("[useProfileData] Latest email audit:", latestEmailAudit);

        const memberNumber = latestEmailAudit?.member_number || user.user_metadata?.member_number;
        console.log("[useProfileData] Using member number:", memberNumber);

        if (memberNumber) {
          const matchResult = await matchAndLinkProfile(user.id, memberNumber);
          
          if (!matchResult.success) {
            console.error("[useProfileData] Profile matching failed:", matchResult.error);
            toast({
              title: "Profile Error",
              description: matchResult.error,
              variant: "destructive",
            });
          }
        }

        // Get the most recently updated member record for this user
        const { data: members, error: membersError } = await supabase
          .from("members")
          .select(`
            id,
            full_name,
            email,
            phone,
            member_number,
            status,
            date_of_birth,
            address,
            town,
            postcode,
            membership_type,
            payment_date,
            marital_status,
            gender,
            collector,
            photo_url,
            yearly_payment_status,
            yearly_payment_due_date,
            yearly_payment_amount,
            emergency_collection_status,
            emergency_collection_amount,
            emergency_collection_due_date,
            failed_login_attempts,
            family_members (
              id,
              full_name,
              relationship,
              date_of_birth,
              gender
            ),
            member_notes (
              id,
              note_text,
              note_type
            ),
            payment_requests!payment_requests_member_number_fkey (
              id,
              payment_type,
              amount,
              status,
              created_at,
              payment_number
            )
          `)
          .eq("auth_user_id", user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (membersError) {
          throw new Error(`Failed to fetch member data: ${membersError.message}`);
        }

        const latestMember = members?.[0];

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (rolesError) {
          throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
        }

        if (latestMember) {
          const memberWithRelations: MemberWithRelations = {
            ...latestMember,
            user_roles: roles?.map(r => ({ role: r.role })) || [],
            roles: roles?.map(r => r.role) || [],
            member_notes: latestMember.member_notes || [],
            family_members: latestMember.family_members || [],
            payment_requests: latestMember.payment_requests || [],
            failed_login_attempts: latestMember.failed_login_attempts || 0
          };
          
          return memberWithRelations;
        }

        return null;
      } catch (error: any) {
        console.error("[useProfileData] Error in fetchData:", error);
        throw error;
      } finally {
        setLoadingState('profile', false);
      }
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep cached data for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  const fetchData = async (retryCount = 0) => {
    try {
      await debouncedFetch();
    } catch (error: any) {
      console.error("[useProfileData] Error in manual fetchData:", error);
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000;
        toast({
          title: "Connection Error",
          description: `Retrying in ${retryDelay/1000} seconds...`,
          variant: "destructive",
        });
        setTimeout(() => fetchData(retryCount + 1), retryDelay);
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  return {
    memberData,
    loading,
    error: queryError ? (queryError as Error).message : null,
    loadingStates,
    setLoadingState,
    fetchData
  };
}
