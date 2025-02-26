
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const llamaApiKey = Deno.env.get('LLAMA_API_KEY');

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

    // Format messages for Llama
    const formattedHistory = (chatHistory || []).map(msg => ({
      role: msg.is_bot ? 'assistant' : 'user',
      content: msg.content
    }));

    // Add current message
    const messages = [
      {
        role: 'system',
        content: 'You are a friendly and encouraging study buddy. Your role is to help students understand their study materials, provide clear explanations, and make learning engaging. Keep responses concise but informative. Always maintain a supportive and positive tone.'
      },
      ...formattedHistory,
      {
        role: 'user',
        content: message
      }
    ];

    console.log('Sending messages to Llama:', messages);

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-2-70b-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!llamaResponse.ok) {
      const errorData = await llamaResponse.json();
      console.error('Llama API error response:', errorData);
      throw new Error(`Llama API error: ${JSON.stringify(errorData)}`);
    }

    const data = await llamaResponse.json();
    console.log('Raw Llama response:', JSON.stringify(data, null, 2));

    if (!data?.choices?.[0]?.message?.content) {
      console.error('Invalid Llama response structure:', data);
      throw new Error('Invalid response structure from Llama API');
    }

    const response = data.choices[0].message.content;
    
    if (typeof response !== 'string' || response.trim().length === 0) {
      console.error('Invalid response content:', response);
      throw new Error('Invalid or empty response from Llama API');
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
