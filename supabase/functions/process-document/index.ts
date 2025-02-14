
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
            text: `You are an AI that generates study materials from documents. Given the text below, generate:

1. Multiple Choice Questions (MCQs) - 5 MCQs with four answer choices each (one correct answer).
2. Flashcards - 5 key terms and their definitions from the text.

Format your response as a valid JSON object with this exact structure:
{
  "multiple_choice": [
    {
      "question": "the question text",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct_answer": "the correct option that matches exactly one from the options array",
      "type": "multiple_choice"
    }
  ],
  "flashcards": [
    {
      "term": "key term from the text",
      "definition": "definition of the term",
      "type": "flashcard"
    }
  ]
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

    try {
      // Find the JSON object in the response
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}') + 1
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('No JSON object found in response text:', responseText)
        throw new Error('No JSON object found in response')
      }

      let jsonStr = responseText.slice(jsonStart, jsonEnd)
      jsonStr = jsonStr
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/\\([^"\\\/bfnrtu])/g, '$1')
        .replace(/\\(?!["\\/bfnrtu])/g, '')
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, p1) => 
          String.fromCharCode(parseInt(p1, 16))
        )

      console.log('Cleaned JSON string:', jsonStr)
      
      const parsedData = JSON.parse(jsonStr)

      // Validate data format
      if (!parsedData.multiple_choice || !parsedData.flashcards) {
        throw new Error('Invalid response format: missing required sections')
      }

      // Create document
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data: { user } } = await supabaseClient.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] ?? '')
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: doc, error: docError } = await supabaseClient
        .from('documents')
        .insert({
          name: title,
          content: truncatedContent,
          user_id: user.id
        })
        .select()
        .single()

      if (docError) {
        throw docError
      }

      // Insert all questions and flashcards
      const allContent = [
        ...parsedData.multiple_choice.map(q => ({
          type: 'multiple_choice',
          content: q,
          document_id: doc.id,
          user_id: user.id
        })),
        ...parsedData.flashcards.map(f => ({
          type: 'flashcard',
          content: f,
          document_id: doc.id,
          user_id: user.id
        }))
      ]

      const { error: contentError } = await supabaseClient
        .from('questions')
        .insert(allContent)

      if (contentError) {
        throw contentError
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
