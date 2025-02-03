import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { content, title, uploadId } = await req.json()

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
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an AI that generates study questions based on study material. Given the text below, create 5 multiple-choice questions. Each question should test understanding of key concepts from the content.

Format your response as a valid JSON array where each question object has these exact fields:
{
  "question": "the question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correct_answer": "the correct option that matches exactly one from the options array",
  "type": "multiple_choice"
}

Study Material to analyze: ${truncatedContent}`
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
      throw new Error(`Failed to get response from Gemini API: ${errorText}`)
    }

    const data = await response.json()
    console.log('Gemini API response:', JSON.stringify(data))

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API')
    }

    const responseText = data.candidates[0].content.parts[0].text
    console.log('Raw response text:', responseText)

    // Extract JSON array from response with improved error handling
    try {
      // Find the JSON array in the response
      const jsonStart = responseText.indexOf('[')
      const jsonEnd = responseText.lastIndexOf(']') + 1
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('No JSON array found in response text:', responseText)
        throw new Error('No JSON array found in response')
      }

      let jsonStr = responseText.slice(jsonStart, jsonEnd)
      
      // Clean up common formatting issues
      jsonStr = jsonStr
        // Remove any line breaks and extra spaces
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        // Handle escaped quotes properly
        .replace(/\\"/g, '"')
        // Remove any invalid escape sequences
        .replace(/\\([^"\\\/bfnrtu])/g, '$1')
        // Properly escape Unicode sequences
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, p1) => 
          String.fromCharCode(parseInt(p1, 16))
        )

      console.log('Cleaned JSON string:', jsonStr)
      
      const questions = JSON.parse(jsonStr)

      // Validate questions format
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array')
      }

      questions.forEach((q, index) => {
        if (!q.question || !Array.isArray(q.options) || !q.correct_answer || !q.options.includes(q.correct_answer)) {
          console.error('Invalid question format:', q)
          throw new Error(`Invalid question format at index ${index}`)
        }
      })

      // Create study reel
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data: { user } } = await supabaseClient.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] ?? '')
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: reel, error: reelError } = await supabaseClient
        .from('study_reels')
        .insert({
          title: title,
          content: truncatedContent.slice(0, 500) + '...',
          type: 'quiz',
          user_id: user.id,
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
          questions.map(q => ({
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
      })
    } catch (error) {
      console.error('Error processing Gemini response:', error)
      throw new Error(`Error processing Gemini response: ${error.message}`)
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