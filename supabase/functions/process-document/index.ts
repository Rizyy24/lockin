import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, userId, uploadId } = await req.json()

    if (!content) {
      throw new Error('Content is required')
    }

    // Truncate content if it's too long (Gemini has a token limit)
    const truncatedContent = content.slice(0, 30000)

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment variables')
      throw new Error('Gemini API key not configured')
    }

    console.log('Making request to Gemini API...')
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${geminiApiKey}`,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create 5 multiple choice questions based on this content. Format your response as a JSON array where each question object has these exact fields:
            {
              "question": "the question text",
              "options": ["option1", "option2", "option3", "option4"],
              "correct_answer": "the correct option that matches one from the options array"
            }
            
            Content to generate questions from: ${truncatedContent}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error response:', errorText)
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('Gemini API response:', JSON.stringify(data))

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API')
    }

    const responseText = data.candidates[0].content.parts[0].text
    console.log('Response text:', responseText)

    // Extract JSON array from response
    try {
      const jsonStart = responseText.indexOf('[')
      const jsonEnd = responseText.lastIndexOf(']') + 1
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('No JSON array found in response text:', responseText)
        throw new Error('No JSON array found in response')
      }

      const jsonStr = responseText.slice(jsonStart, jsonEnd)
      const questions = JSON.parse(jsonStr)

      // Validate questions format
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array')
      }

      questions.forEach((q: any, index: number) => {
        if (!q.question || !Array.isArray(q.options) || !q.correct_answer) {
          throw new Error(`Invalid question format at index ${index}`)
        }
        if (!q.options.includes(q.correct_answer)) {
          throw new Error(`Correct answer not found in options at index ${index}`)
        }
      })

      // Create study reel
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data: reel, error: reelError } = await supabaseClient
        .from('study_reels')
        .insert({
          user_id: userId,
          title: 'Generated Questions',
          content: truncatedContent.slice(0, 500) + '...',
          type: 'quiz',
          source_upload_id: uploadId
        })
        .select()
        .single()

      if (reelError) {
        throw reelError
      }

      // Insert questions
      const { error: questionsError } = await supabaseClient
        .from('questions')
        .insert(
          questions.map((q: any) => ({
            reel_id: reel.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            type: 'multiple_choice'
          }))
        )

      if (questionsError) {
        throw questionsError
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (error) {
      console.error('Error processing Gemini response:', error)
      throw new Error('Invalid response from Gemini API')
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})