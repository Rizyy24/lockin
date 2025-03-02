
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, uploadId } = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    console.log('Processing document with title:', title);
    console.log('Content sample (first 200 chars):', content.substring(0, 200) + '...');

    // Truncate content if it's too long (OpenAI has a token limit)
    const truncatedContent = content.length > 30000 ? content.slice(0, 30000) : content;

    if (!openAiApiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      throw new Error('OpenAI API key not configured');
    }

    console.log('Making request to OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are a highly accurate AI that generates relevant multiple-choice questions DIRECTLY from the provided content.
          
IMPORTANT INSTRUCTIONS:
1. ONLY create questions based on EXPLICIT information from the text provided - do not rely on your general knowledge
2. If the content appears to be a math worksheet or exam, create questions about the mathematical concepts present
3. Focus on the main topics, concepts, facts, and information in the text
4. Each question must have 4 options (A, B, C, D) with exactly one correct answer
5. Make sure the questions test understanding of the actual content, not peripheral details
6. Format each option to start with the letter (A, B, C, D) followed by the option text

FORMAT YOUR RESPONSE AS A VALID JSON ARRAY where each question has:
{
  "question": "the complete question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correct_answer": "the correct option that EXACTLY matches one option from the options array",
  "type": "multiple_choice"
}

Content to analyze: ${truncatedContent}`
        }],
        temperature: 0.3, // Lower temperature for more deterministic and accurate responses
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`Failed to get response from OpenAI API: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const responseText = data.choices[0].message.content;
    console.log('Raw response text length:', responseText.length);
    console.log('Sample of response:', responseText.substring(0, 200) + '...');

    // Extract JSON array from response with improved error handling
    try {
      // Find the JSON array in the response
      const jsonStart = responseText.indexOf('[');
      const jsonEnd = responseText.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('No JSON array found in response text');
        throw new Error('No JSON array found in response');
      }

      let jsonStr = responseText.slice(jsonStart, jsonEnd);
      console.log('Extracted JSON string sample:', jsonStr.substring(0, 100) + '...');
      
      // Clean up common formatting issues
      jsonStr = jsonStr
        // Remove any line breaks and extra spaces
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        // Handle escaped quotes properly
        .replace(/\\"/g, '"')
        // Remove any invalid escape sequences
        .replace(/\\([^"\\\/bfnrtu])/g, '$1')
        // Remove any remaining backslashes before non-special characters
        .replace(/\\(?!["\\/bfnrtu])/g, '')
        // Properly escape Unicode sequences
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, p1) => 
          String.fromCharCode(parseInt(p1, 16))
        );

      console.log('Processing JSON...');
      
      const questions = JSON.parse(jsonStr);

      // Validate questions format
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      console.log('Successfully parsed', questions.length, 'questions');
      
      // Validate and fix each question
      const validatedQuestions = questions.map((q, index) => {
        // Log each question for debugging
        console.log(`Question ${index+1}: ${q.question?.substring(0, 50)}...`);
        console.log(`Options: ${JSON.stringify(q.options)}`);
        console.log(`Correct answer: ${q.correct_answer}`);
        
        if (!q.question || !Array.isArray(q.options) || !q.correct_answer) {
          console.error('Invalid question format:', q);
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        // Ensure correct_answer matches one of the options exactly
        if (!q.options.includes(q.correct_answer)) {
          console.error(`Correct answer doesn't match any option for question ${index+1}`);
          // Try to find the closest match
          for (const option of q.options) {
            if (option.includes(q.correct_answer.replace(/^[A-D]\)\s*/, '')) || 
                q.correct_answer.includes(option.replace(/^[A-D]\)\s*/, ''))) {
              console.log(`Found closest match: ${option}`);
              q.correct_answer = option;
              break;
            }
          }
          // If still no match, default to first option
          if (!q.options.includes(q.correct_answer)) {
            console.warn(`Setting default correct answer to first option for question ${index+1}`);
            q.correct_answer = q.options[0];
          }
        }
        
        return {
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          type: "multiple_choice"
        };
      });

      // Create study reel
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      console.log('Getting authenticated user...');
      const { data: { user } } = await supabaseClient.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] ?? '');
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      console.log('Creating study reel...');
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
        .single();

      if (reelError) {
        console.error('Error creating study reel:', reelError);
        throw reelError;
      }

      console.log('Inserting', validatedQuestions.length, 'questions...');
      // Insert questions
      const { error: questionsError } = await supabaseClient
        .from('questions')
        .insert(
          validatedQuestions.map(q => ({
            reel_id: reel.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            type: 'multiple_choice'
          }))
        );

      if (questionsError) {
        console.error('Error inserting questions:', questionsError);
        throw questionsError;
      }

      console.log('Successfully created study reel with questions');
      
      return new Response(JSON.stringify({ 
        success: true, 
        reelId: reel.id,
        questionCount: validatedQuestions.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error processing OpenAI response:', error);
      throw new Error(`Error processing OpenAI response: ${error.message}`);
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
