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

    if (!content) {
      throw new Error('No content provided')
    }

    // Truncate content if it's too long (Gemini has a token limit)
    const truncatedContent = content.slice(0, 30000)

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment variables')
      throw new Error('Gemini API key not configured')
    }

    console.log('Making request to Gemini API...')
    // Call Gemini API to generate questions
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${geminiApiKey}`,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate 5 multiple choice questions based on this content. Return ONLY a JSON array where each object has these fields: "question" (string), "options" (array of 4 strings), and "correct_answer" (string matching one of the options). Content: ${truncatedContent}`
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error response:', errorText)
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('Raw Gemini API response:', JSON.stringify(data))

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini API response structure:', data)
      throw new Error('Invalid response structure from Gemini API')
    }

    let questions
    try {
      const responseText = data.candidates[0].content.parts[0].text
      console.log('Parsing response text:', responseText)

      // Find the JSON array in the response
      const jsonStart = responseText.indexOf('[')
      const jsonEnd = responseText.lastIndexOf(']') + 1
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('No JSON array found in response text:', responseText)
        throw new Error('No JSON array found in response')
      }

      const jsonString = responseText.slice(jsonStart, jsonEnd)
      console.log('Extracted JSON string:', jsonString)
      
      questions = JSON.parse(jsonString)

      // Validate questions format
      if (!Array.isArray(questions)) {
        throw new Error('Questions must be an array')
      }

      if (questions.length === 0) {
        throw new Error('No questions generated')
      }

      questions.forEach((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.correct_answer) {
          throw new Error(`Invalid question format at index ${index}`)
        }
        if (!q.options.includes(q.correct_answer)) {
          throw new Error(`Correct answer not found in options at index ${index}`)
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
        content: truncatedContent,
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