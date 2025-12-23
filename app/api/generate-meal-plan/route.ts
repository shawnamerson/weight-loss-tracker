import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { validateRequestBody, generateMealPlanSchema } from '@/lib/validations/api'
import { rateLimit, rateLimitHeaders } from '@/lib/utils/rate-limit'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, generateMealPlanSchema)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { profile, weeksDuration } = validation.data

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

    // Generate exactly 7 days of meal plans with detailed information
    const actualDays = 7

    const prompt = `Create a detailed 7-day meal plan for a user with the following profile:
- Daily Calorie Target: ${profile.daily_calorie_target || 2000} calories
- Daily Protein Target: ${profile.daily_protein_target_g || 150}g
- Meals per Day: ${profile.meals_per_day || 3}
${profile.dietary_restrictions && profile.dietary_restrictions.length > 0 ? `- Dietary Restrictions: ${profile.dietary_restrictions.join(', ')}` : ''}
${profile.cuisine_preferences && profile.cuisine_preferences.length > 0 ? `- Cuisine Preferences: ${profile.cuisine_preferences.join(', ')}` : ''}
- Goal: ${profile.goal_type || 'weight loss'}

Create EXACTLY 7 days of meals. Provide detailed, step-by-step cooking instructions (4-8 steps per recipe). Include variety across the week.

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "plan_name": "Descriptive plan name based on user goals",
  "ai_recommendations": "2-3 sentences with helpful tips for success with this plan",
  "days": [
    {
      "day_number": 1,
      "meals": [
        {
          "meal_type": "breakfast",
          "meal_name": "Specific meal name",
          "calories": 400,
          "protein_g": 30,
          "carbs_g": 40,
          "fat_g": 15,
          "ingredients": [
            {"name": "ingredient name", "amount": "specific amount with unit (e.g., '2 large', '1 cup', '200g')"}
          ],
          "instructions": [
            "Detailed step 1 with specific actions",
            "Detailed step 2 with cooking times/temps",
            "Detailed step 3 with visual cues",
            "Continue with 4-8 total steps"
          ],
          "prep_time_minutes": 10,
          "cook_time_minutes": 15
        }
      ]
    }
  ]
}

Requirements:
- Generate exactly 7 days (day_number: 1 through 7)
- Each meal should have detailed, clear cooking instructions (4-8 steps per meal)
- Ingredients must have specific amounts with units
- Ensure variety across different days (don't repeat the same meals)
- Meals should be realistic, achievable, and delicious
- Total daily calories should approximately match the target (${profile.daily_calorie_target || 2000} cal)
- Total daily protein should approximately match the target (${profile.daily_protein_target_g || 150}g)`

    // Call OpenAI API with higher token limit for detailed 7-day plan
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 16000,
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
    let mealPlan
    try {
      mealPlan = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse ChatGPT response:', content)
      throw new Error('Failed to parse meal plan from AI response')
    }

    // Validate the response has the expected structure
    if (!mealPlan.plan_name || !mealPlan.days || !Array.isArray(mealPlan.days)) {
      throw new Error('Invalid meal plan structure from AI')
    }

    return NextResponse.json({ mealPlan })
  } catch (error: any) {
    console.error('Error generating meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate meal plan' },
      { status: 500 }
    )
  }
}

function getMealDistribution(mealsPerDay: number): string {
  if (mealsPerDay === 3) return 'breakfast, lunch, dinner'
  if (mealsPerDay === 4) return 'breakfast, lunch, snack, dinner'
  if (mealsPerDay === 5) return 'breakfast, snack, lunch, snack, dinner'
  if (mealsPerDay === 6) return 'breakfast, snack, lunch, snack, dinner, snack'
  return `${mealsPerDay} meals distributed throughout the day`
}
