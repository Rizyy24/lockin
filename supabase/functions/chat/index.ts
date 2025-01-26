import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch chat history
    const { data: chatHistory, error: chatError } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (chatError) {
      throw chatError;
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'You are a friendly and encouraging study buddy. Your role is to help students understand their study materials, provide clear explanations, and make learning engaging. Keep responses concise but informative. Always maintain a supportive and positive tone.' }]
          },
          ...messages
        ],
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
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await geminiResponse.json();
    console.log('Raw Gemini response:', JSON.stringify(data, null, 2));

    // Enhanced response validation
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response structure:', data);
      throw new Error('Invalid response structure from Gemini API');
    }

    const response = data.candidates[0].content.parts[0].text;
    
    // Additional validation for response content
    if (typeof response !== 'string' || response.trim().length === 0) {
      console.error('Invalid response content:', response);
      throw new Error('Invalid or empty response from Gemini API');
    }

    console.log('Processed response:', response);

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      },
    );
  }
});