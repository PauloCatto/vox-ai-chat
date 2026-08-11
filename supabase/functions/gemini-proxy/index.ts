// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate Supabase JWT Token
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access token.", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY secret not configured." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { contents, systemInstruction, system_instruction, tools, stream } = await req.json();

    const endpoint = stream
      ? `${GEMINI_BASE_URL}:streamGenerateContent?key=${GEMINI_API_KEY}`
      : `${GEMINI_BASE_URL}:generateContent?key=${GEMINI_API_KEY}`;

    const instruction = system_instruction || systemInstruction;

    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, system_instruction: instruction, tools }),
    });

    if (stream) {
      return new Response(geminiResponse.body, {
        status: geminiResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    const data = await geminiResponse.json();
    return new Response(JSON.stringify(data), {
      status: geminiResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[gemini-proxy] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal proxy error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

