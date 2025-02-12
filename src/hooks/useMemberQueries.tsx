
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MemberFormData } from "@/types/member";

export function useMemberQueries(
  selectedCollector: string,
  searchTerm: string,
  sortField: string,
  sortDirection: 'asc' | 'desc',
  collectorId: string | null,
  page: number,
  ITEMS_PER_PAGE: number
) {
  const { toast } = useToast();

  const { data: userInfo } = useQuery({
    queryKey: ["userInfo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const { data: collectorData } = await supabase
        .from("members_collectors")
        .select("id, prefix")
        .eq("auth_user_id", user.id)
        .single();

      return {
        roles: roles?.map(r => r.role) || [],
        collectorId: collectorData?.id || null,
        collectorPrefix: collectorData?.prefix || null
      };
    }
  });

  const { data: collectors, isLoading: loadingCollectors } = useQuery({
    queryKey: ["collectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members_collectors")
        .select("*")
        .eq("active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: userInfo?.roles.includes("admin") || false
  });

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ["members", selectedCollector, searchTerm, sortField, sortDirection, collectorId, page],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select(`
          *,
          members_collectors!members_collectors_member_number_fkey (
            name,
            number,
            active,
            prefix
          )
        `, { count: 'exact' });

      // For non-admin users, strictly filter by their collector ID
      if (!userInfo?.roles.includes("admin")) {
        if (!collectorId) {
          throw new Error("Collector ID not found");
        }
        query = query.eq('collector_id', collectorId);
      } else if (selectedCollector !== 'all') {
        // For admins, allow filtering by selected collector
        query = query.eq('collector_id', selectedCollector);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,member_number.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      if (sortField) {
        query = query.order(sortField, { ascending: sortDirection === 'asc' });
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        members: data || [],
        totalCount: count || 0
      };
    }
  });

  return {
    userInfo,
    collectors,
    membersData,
    isLoading: loadingMembers || loadingCollectors
  };
}
