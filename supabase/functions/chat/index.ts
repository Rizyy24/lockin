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

    // Format messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: 'You are StudyBot, a helpful AI study assistant. Help users understand their study materials and answer their questions clearly and concisely. Keep your responses focused on educational content and learning.',
      },
      ...(chatHistory || []).map((msg) => ({
        role: msg.is_bot ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: message }
    ];

    console.log('Sending messages to OpenAI:', messages);

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error response:', errorData);
      
      // Check specifically for quota errors
      if (errorData.error?.type === 'insufficient_quota' || 
          errorData.error?.code === 'insufficient_quota' ||
          openAIResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'OpenAI API quota exceeded. Please try again later or contact support.' 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await openAIResponse.json();
    console.log('OpenAI response:', data);

    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    const response = data.choices[0].message.content;
    console.log('Final response:', response);

    return new Response(
      JSON.stringify({ response }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    
    // If it's already a 429 response, pass it through
    if (error.message?.includes('quota exceeded')) {
      return new Response(
        JSON.stringify({ error: error.message }),
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