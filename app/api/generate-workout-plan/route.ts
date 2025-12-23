import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { validateRequestBody, generateWorkoutPlanSchema } from '@/lib/validations/api'
import { rateLimit, rateLimitHeaders } from '@/lib/utils/rate-limit'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, generateWorkoutPlanSchema)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { profile, weeksDuration, workoutsPerWeek } = validation.data

    // Apply rate limiting (use profile.id or IP as identifier)
    const identifier = profile.id || request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await rateLimit(identifier, 'AI_GENERATION')

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetAt),
        }
      )
    }

    // Build the prompt for Claude - simplified for Haiku's 4096 token limit
    // Limit to max 3 days to fit in token limit
    const actualDays = Math.min(workoutsPerWeek || 3, 3)

    // Calculate age if date of birth is available
    let age = null
    if (profile.date_of_birth) {
      const birthDate = new Date(profile.date_of_birth)
      const today = new Date()
      age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
    }

    const weightKg = profile.current_weight_kg
    const weightLbs = weightKg ? Math.round(weightKg * 2.20462) : null

    const prompt = `Create ${actualDays} workout sessions. User: ${age ? `${age}yo` : 'age unknown'}, ${profile.gender || 'not specified'}, ${weightLbs ? `${weightLbs}lbs` : 'weight unknown'}, ${profile.activity_level || 'moderate'} activity, goal: ${profile.goal_type || 'lose weight'}. Fitness level: ${profile.fitness_level || 'beginner'}.

CRITICAL: Keep VERY brief. Max 2 steps per exercise instruction. VALID JSON ONLY:
{
  "plan_name": "Plan name",
  "ai_recommendations": "1 sentence tip",
  "workouts": [
    {
      "day_number": 1,
      "workout_name": "Workout name",
      "workout_type": "cardio",
      "duration_minutes": 30,
      "difficulty": "beginner",
      "calories_burned_estimate": 200,
      "exercises": [
        {
          "exercise_name": "Exercise",
          "sets": 3,
          "reps": 10,
          "duration_seconds": 30,
          "rest_seconds": 30,
          "instructions": ["Do the exercise"],
          "target_muscles": ["legs"]
        }
      ]
    }
  ]
}

Make exactly ${actualDays} workouts with day_number: 1, 2, 3 (sequential numbers, NOT skip days). Each instruction array must have ONLY 1-2 items max. Workout types: cardio, strength, flexibility, hiit. Difficulty: beginner, intermediate, advanced.`

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract the text content from OpenAI's response
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from ChatGPT')
    }

    // Parse the JSON response
    let workoutPlan
    try {
      workoutPlan = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse ChatGPT response:', content)
      throw new Error('Failed to parse workout plan from AI response')
    }

    // Log what ChatGPT returned
    console.log('ChatGPT returned workouts:', workoutPlan.workouts?.map((w: any) => ({ day: w.day_number, name: w.workout_name })))

    // Validate the response has the expected structure
    if (!workoutPlan.plan_name || !workoutPlan.workouts || !Array.isArray(workoutPlan.workouts)) {
      throw new Error('Invalid workout plan structure from AI')
    }

    // Ensure we have exactly the number of workouts requested
    if (workoutPlan.workouts.length !== actualDays) {
      console.warn(`Expected ${actualDays} workouts but got ${workoutPlan.workouts.length}`)
    }

    return NextResponse.json({ workoutPlan })
  } catch (error: any) {
    console.error('Error generating workout plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate workout plan' },
      { status: 500 }
    )
  }
}
