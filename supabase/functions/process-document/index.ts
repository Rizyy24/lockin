import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { content, title, uploadId } = await req.json()
    console.log('Processing document:', { title, contentLength: content?.length })

    // Call Gemini API to generate questions
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('GEMINI_API_KEY')}`,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a helpful study assistant. Generate 5 multiple choice questions based on this content. Format your response as a JSON array of objects, where each object has these exact fields: "question" (string), "options" (array of 4 strings), and "correct_answer" (string matching one of the options). Content: ${content}`
          }]
        }],
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
      })
    })

    const data = await response.json()
    console.log('Gemini API response:', JSON.stringify(data))

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini API response structure:', data)
      throw new Error('Invalid response from Gemini API')
    }

    let questions
    try {
      const responseText = data.candidates[0].content.parts[0].text
      // Remove any markdown formatting or extra text before the JSON array
      const jsonStart = responseText.indexOf('[')
      const jsonEnd = responseText.lastIndexOf(']') + 1
      const jsonString = responseText.slice(jsonStart, jsonEnd)
      questions = JSON.parse(jsonString)

      // Validate questions format
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Questions must be a non-empty array')
      }

      questions.forEach((q, index) => {
        if (!q.question || !Array.isArray(q.options) || !q.correct_answer) {
          throw new Error(`Invalid question format at index ${index}`)
        }
      })
    } catch (error) {
      console.error('Error parsing questions:', error)
      throw new Error(`Failed to parse questions: ${error.message}`)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create a study reel for this content
    const { data: reel, error: reelError } = await supabase
      .from('study_reels')
      .insert({
        title,
        content,
        type: 'document',
        source_upload_id: uploadId,
        user_id: req.headers.get('x-user-id')
      })
      .select()
      .single()

    if (reelError) {
      console.error('Error creating study reel:', reelError)
      throw reelError
    }

    // Insert questions into the database
    for (const q of questions) {
      const { error: questionError } = await supabase
        .from('questions')
        .insert({
          reel_id: reel.id,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          type: 'multiple_choice'
        })

      if (questionError) {
        console.error('Error inserting question:', questionError)
        throw questionError
      }
    }

    return new Response(
      JSON.stringify({ success: true, reelId: reel.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process document error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})