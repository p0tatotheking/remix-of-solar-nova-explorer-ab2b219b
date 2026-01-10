import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Content filter for inappropriate questions
const blockedTerms = [
  'porn', 'sex', 'nude', 'naked', 'xxx', 'nsfw', 'hentai', 'erotic',
  'explicit', 'adult', 'fetish', 'bdsm', 'orgasm', 'masturbat',
  'drug', 'cocaine', 'heroin', 'meth', 'weed', 'marijuana',
  'suicide', 'kill myself', 'self harm', 'cutting',
  'bomb', 'explosive', 'weapon', 'gun', 'murder', 'assassin',
  'hack', 'exploit', 'bypass', 'crack', 'pirate',
  'racist', 'slur', 'hate speech',
];

const inappropriatePatterns = [
  /how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive)/i,
  /how\s+to\s+(kill|hurt|harm|murder)/i,
  /how\s+to\s+(hack|exploit|bypass|crack)/i,
  /how\s+to\s+get\s+(high|drugs)/i,
  /ways?\s+to\s+(die|commit\s+suicide)/i,
];

function isInappropriate(text: string): { blocked: boolean; reason?: string } {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  
  for (const term of blockedTerms) {
    if (normalized.includes(term)) {
      return { blocked: true, reason: "This question contains inappropriate content." };
    }
  }
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(normalized)) {
      return { blocked: true, reason: "I can't help with that type of question." };
    }
  }
  
  return { blocked: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, mode, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check for inappropriate content
    const filterResult = isInappropriate(message);
    if (filterResult.blocked) {
      return new Response(
        JSON.stringify({ 
          response: filterResult.reason,
          blocked: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    
    if (mode === "grammar") {
      systemPrompt = `You are Solar, a friendly and helpful grammar assistant. Your role is to:
1. Check the user's text for grammar, spelling, and punctuation errors
2. Provide the corrected version
3. Briefly explain the corrections made
4. Be encouraging and supportive

Format your response like this:
**Corrected Text:**
[corrected version]

**Changes Made:**
- [list of corrections]

Keep explanations concise and educational. Always be polite and encouraging.`;
    } else {
      systemPrompt = `You are Solar, a friendly AI study helper. Your purpose is to help students learn and understand academic topics.

Guidelines:
- Be helpful, patient, and encouraging
- Explain concepts clearly and simply
- Use examples when helpful
- Stay focused on educational content
- If asked about non-educational topics, gently redirect to studying
- Never provide answers to homework directly - instead guide students to understand the concepts
- Refuse inappropriate or harmful requests politely

Start conversations with a warm greeting. Be conversational but stay on topic.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Solar AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
