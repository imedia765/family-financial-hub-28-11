
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
  memberNumber: string;
  token: string;
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as RequestBody;
    const { email, memberNumber, token } = requestData;

    if (!email || !memberNumber || !token) {
      throw new Error('Missing required fields');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    console.log(`[${new Date().toISOString()}] Starting password reset process for ${memberNumber}`);

    // Check Loops configuration first
    const { data: loopsConfig, error: configCheckError } = await supabaseAdmin
      .rpc('check_loops_config');

    if (configCheckError) {
      console.error('Error checking Loops config:', configCheckError);
      throw new Error('Failed to check Loops configuration');
    }

    if (!loopsConfig?.[0]?.has_api_key || !loopsConfig?.[0]?.is_active) {
      console.error('Loops integration is not properly configured:', loopsConfig);
      throw new Error('Loops integration is not properly configured or is inactive');
    }

    // Get full Loops configuration
    const { data: loopsIntegration, error: integrationError } = await supabaseAdmin
      .from('loops_integration')
      .select('*')
      .single();

    if (integrationError) {
      console.error('Error fetching Loops integration:', integrationError);
      throw new Error('Failed to get Loops integration details');
    }

    if (!loopsIntegration?.api_key || !loopsIntegration?.password_reset_template_id) {
      console.error('Missing required Loops configuration:', {
        hasApiKey: !!loopsIntegration?.api_key,
        hasTemplateId: !!loopsIntegration?.password_reset_template_id
      });
      throw new Error('Incomplete Loops configuration');
    }

    const resetLink = `https://pwaburton.co.uk/reset-password?token=${token}`;

    console.log('Making request to Loops API:', {
      templateId: loopsIntegration.password_reset_template_id,
      email,
      memberNumber,
      resetLink
    });

    try {
      const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loopsIntegration.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionalId: loopsIntegration.password_reset_template_id,
          email: email,
          dataVariables: {
            resetUrl: resetLink,
            memberNumber: memberNumber
          }
        })
      });

      // Log the complete response details for debugging
      const responseDetails = {
        status: loopsResponse.status,
        statusText: loopsResponse.statusText,
        headers: Object.fromEntries(loopsResponse.headers.entries())
      };
      console.log('Loops API response details:', responseDetails);

      if (!loopsResponse.ok) {
        const errorContent = await loopsResponse.text();
        console.error('Loops API error details:', {
          ...responseDetails,
          errorContent
        });
        throw new Error(`Loops API error (${loopsResponse.status}): ${errorContent}`);
      }

      const loopsResult = await loopsResponse.json();
      console.log('Loops email sent successfully:', loopsResult);

      return new Response(
        JSON.stringify({ 
          message: "Password reset email sent successfully",
          timing: {
            timestamp: new Date().toISOString()
          }
        }),
        { 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );

    } catch (loopsError: any) {
      console.error('Error calling Loops API:', {
        error: loopsError,
        message: loopsError.message,
        stack: loopsError.stack
      });
      throw new Error(`Failed to send email through Loops: ${loopsError.message}`);
    }

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error:`, {
      error: error,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send password reset email",
        timing: {
          timestamp: new Date().toISOString()
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        },
        status: 500
      }
    );
  }
});
