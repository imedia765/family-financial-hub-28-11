import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function MaintenanceManagement() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  // Query maintenance mode status
  const { data: maintenanceMode, refetch: refetchMaintenanceMode } = useQuery({
    queryKey: ["maintenanceMode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Query maintenance history
  const { data: maintenanceHistory, isLoading: isLoadingHistory, refetch } = useQuery({
    queryKey: ["maintenanceHistory"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_maintenance_history', { days: 7 });
      if (error) throw error;
      return data;
    }
  });

  // Query system health
  const { data: systemHealth } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('run_combined_system_checks');
      if (error) throw error;
      return data;
    }
  });

  // Toggle maintenance mode
  const handleToggleMaintenanceMode = async () => {
    try {
      const { error } = await supabase
        .from('maintenance_settings')
        .update({ 
          is_enabled: !maintenanceMode?.is_enabled,
          enabled_at: !maintenanceMode?.is_enabled ? new Date().toISOString() : null,
          enabled_by: !maintenanceMode?.is_enabled ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', maintenanceMode?.id);

      if (error) throw error;

      toast({
        title: !maintenanceMode?.is_enabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: !maintenanceMode?.is_enabled 
          ? "Only administrators can access the system now."
          : "System is now accessible to all users.",
      });
      refetchMaintenanceMode();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Run maintenance manually
  const handleRunMaintenance = async () => {
    try {
      setIsRunning(true);
      const { data, error } = await supabase.rpc('perform_system_maintenance');
      if (error) throw error;

      toast({
        title: "Maintenance Complete",
        description: "System maintenance has been completed successfully.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Schedule maintenance
  const handleScheduleMaintenance = async () => {
    try {
      const { error } = await supabase.rpc('schedule_system_maintenance', {
        schedule: '0 0 * * *' // Daily at midnight
      });
      if (error) throw error;

      toast({
        title: "Maintenance Scheduled",
        description: "System maintenance has been scheduled for daily execution at midnight.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Maintenance Mode Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
        <div className="space-y-0.5">
          <div className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-yellow-500" />
            <h3 className="font-medium">Maintenance Mode</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            When enabled, only administrators can access the system
          </p>
        </div>
        <Switch
          checked={maintenanceMode?.is_enabled || false}
          onCheckedChange={handleToggleMaintenanceMode}
        />
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systemHealth.map((check: any, index: number) => (
            <div key={index} className="p-4 border rounded-lg bg-background">
              <h4 className="font-medium">{check.check_type}</h4>
              <div className={`mt-2 text-sm ${
                check.status === 'Good' ? 'text-green-500' : 
                check.status === 'Warning' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {check.status}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={handleRunMaintenance} 
          disabled={isRunning}
        >
          {isRunning ? "Running Maintenance..." : "Run Maintenance Now"}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleScheduleMaintenance}
        >
          Schedule Daily Maintenance
        </Button>
      </div>

      {/* Maintenance History */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Maintenance History</h3>
        {isLoadingHistory ? (
          <p>Loading maintenance history...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Execution Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceHistory?.map((record: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>
                    {new Date(record.execution_time).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                      record.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {record.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {record.duration_seconds?.toFixed(2)}s
                    </span>
                  </TableCell>
                  <TableCell>
                    <pre className="text-sm whitespace-pre-wrap max-h-40 overflow-auto">
                      {JSON.stringify(record.details, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}