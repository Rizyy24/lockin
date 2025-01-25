import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    console.log('Received request:', { message, userId });

    // Get chat history
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: chatHistory, error: historyError } = await supabaseClient
      .from('chat_messages')
      .select('content, is_bot')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error('Error fetching chat history:', historyError);
      throw historyError;
    }

    console.log('Chat history fetched:', chatHistory);

    // Format messages for Gemini
    const formattedHistory = (chatHistory || []).map(msg => ({
      role: msg.is_bot ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add current message
    const messages = [
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    if (formattedHistory.length > 0) {
      messages.unshift(...formattedHistory);
    }

    console.log('Sending messages to Gemini:', messages);

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API error response:', errorData);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'AI service is temporarily unavailable due to high demand. Please try again later.' 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await geminiResponse.json();
    console.log('Gemini response:', data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response format:', data);
      throw new Error('Invalid response format from Gemini');
    }

    const response = data.candidates[0].content.parts[0].text;
    console.log('Final response:', response);

    return new Response(
      JSON.stringify({ response }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    
    // Handle quota errors consistently
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return new Response(
        JSON.stringify({ 
          error: 'AI service is temporarily unavailable due to high demand. Please try again later.' 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});