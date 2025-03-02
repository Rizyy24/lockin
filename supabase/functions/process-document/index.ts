
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
    console.log('Content length:', content.length);

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
          content: `You are an AI that generates highly relevant study questions based on provided text content. 
          
Given the text below, create 5-10 challenging multiple-choice questions that specifically test understanding of key concepts, facts, and information directly from the content.

IMPORTANT GUIDELINES:
1. Questions MUST be based ONLY on information explicitly present in the text - do not make up information
2. Each question should focus on important concepts, not trivial details
3. Create plausible but incorrect answer options
4. Ensure questions are factually accurate according to the provided text
5. Format options with letter prefixes (A, B, C, D)
6. Use clear, direct language in both questions and answers

Format your response as a valid JSON array where each question object has these exact fields:
{
  "question": "the question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correct_answer": "the correct option that matches exactly one from the options array",
  "type": "multiple_choice"
}

Study Material to analyze: ${truncatedContent}`
        }],
        temperature: 0.5,
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
      
      questions.forEach((q, index) => {
        if (!q.question || !Array.isArray(q.options) || !q.correct_answer || !q.options.includes(q.correct_answer)) {
          console.error('Invalid question format:', q);
          throw new Error(`Invalid question format at index ${index}`);
        }
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

      console.log('Inserting', questions.length, 'questions...');
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
        );

      if (questionsError) {
        console.error('Error inserting questions:', questionsError);
        throw questionsError;
      }

      console.log('Successfully created study reel with questions');
      
      return new Response(JSON.stringify({ 
        success: true, 
        reelId: reel.id,
        questionCount: questions.length 
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
