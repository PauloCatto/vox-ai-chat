// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash";

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

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY secret not configured." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { contents, systemInstruction, tools, stream } = await req.json();

    const endpoint = stream
      ? `${GEMINI_BASE_URL}:streamGenerateContent?key=${GEMINI_API_KEY}`
      : `${GEMINI_BASE_URL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, systemInstruction, tools }),
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
