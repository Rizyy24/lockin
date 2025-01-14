import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, title } = await req.json()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful study assistant. Generate 5 multiple choice questions based on the provided document content. Return the response as a JSON array with each question having the format: { question: string, options: string[], correct_answer: string }'
          },
          {
            role: 'user',
            content: `Document Title: ${title}\n\nContent: ${content}`
          }
        ],
      }),
    })

    const data = await response.json()
    const questions = JSON.parse(data.choices[0].message.content)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Insert questions into the database
    for (const q of questions) {
      const { error } = await supabase
        .from('questions')
        .insert({
          question: q.question,
          options: JSON.stringify(q.options),
          correct_answer: q.correct_answer,
          type: 'multiple_choice'
        })

      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})