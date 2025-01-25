import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, userId } = await req.json()

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Save user message
    const { error: messageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        content: message,
        user_id: userId,
        is_bot: false,
      })

    if (messageError) {
      throw new Error('Failed to save user message')
    }

    // Get chat history
    const { data: chatHistory } = await supabaseClient
      .from('chat_messages')
      .select('content, is_bot')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(10)

    // Format messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI study assistant. Help users understand their study materials and answer their questions clearly and concisely.',
      },
      ...chatHistory.map((msg) => ({
        role: msg.is_bot ? 'assistant' : 'user',
        content: msg.content,
      })),
    ]

    // Get response from OpenAI
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
    })

    const aiResponse = completion.data.choices[0].message?.content

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Save AI response
    const { error: responseError } = await supabaseClient
      .from('chat_messages')
      .insert({
        content: aiResponse,
        user_id: userId,
        is_bot: true,
      })

    if (responseError) {
      throw new Error('Failed to save AI response')
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})