import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import type { Database } from '@/lib/types/database'
import { verifyBearerToken } from '@/lib/utils/crypto'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Create a Supabase client with service role for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron with timing-safe comparison
    const authHeader = request.headers.get('authorization')
    if (!verifyBearerToken(authHeader, process.env.CRON_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Find all users whose meal plans have expired (end_date <= today)
    const { data: expiredPlans, error: plansError } = await supabaseAdmin
      .from('meal_plans')
      .select('user_id, end_date')
      .lte('end_date', today)
      .eq('is_active', true)

    if (plansError) {
      console.error('Error fetching expired plans:', plansError)
      throw plansError
    }

    // Find all users who don't have any active meal plans
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    const { data: activePlans, error: activePlansError } = await supabaseAdmin
      .from('meal_plans')
      .select('user_id')
      .eq('is_active', true)

    if (activePlansError) {
      console.error('Error fetching active plans:', activePlansError)
      throw activePlansError
    }

    // Get user IDs from expired plans
    const expiredUserIds: string[] = expiredPlans ? expiredPlans.map((plan: any) => plan.user_id) : []

    // Get user IDs who have active plans
    const activeUserIds = new Set<string>(activePlans ? activePlans.map((plan: any) => plan.user_id) : [])

    // Get users without active plans
    const usersWithoutPlans: string[] = allUsers ? allUsers.filter((user: any) => !activeUserIds.has(user.id)).map((user: any) => user.id) : []

    // Combine both sets of users (expired plans + no plans)
    const userIds = [...new Set([...expiredUserIds, ...usersWithoutPlans])]

    if (userIds.length === 0) {
      return NextResponse.json({
        message: 'No users need meal plans',
        processed: 0,
      })
    }

    console.log(`Found ${userIds.length} users who need meal plans (${expiredUserIds.length} expired, ${usersWithoutPlans.length} without plans)`)

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Generate new meal plans for each user
    for (const userId of userIds) {
      try {
        // Fetch user profile
        const { data: profile, error: profileError }: { data: any, error: any } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileError || !profile) {
          console.error(`Failed to fetch profile for user ${userId}:`, profileError)
          results.failed++
          results.errors.push(`User ${userId}: Failed to fetch profile`)
          continue
        }

        // Generate meal plan using OpenAI
        const mealPlan = await generateMealPlan(profile)

        // Calculate date range (7 days)
        const startDate = new Date().toISOString().split('T')[0]
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]

        // Deactivate existing meal plans
        await supabaseAdmin
          .from('meal_plans')
          // @ts-ignore - Supabase type issue with generated types
          .update({ is_active: false })
          .eq('user_id', userId)

        // Insert new meal plan
        const { data: newMealPlan, error: planInsertError }: { data: any, error: any } = await supabaseAdmin
          .from('meal_plans')
          // @ts-expect-error - Supabase type issue with generated types
          .insert({
            user_id: userId,
            plan_name: mealPlan.plan_name,
            start_date: startDate,
            end_date: endDate,
            weeks_duration: 1,
            ai_recommendations: mealPlan.ai_recommendations,
            daily_calorie_target: profile.daily_calorie_target,
            is_active: true,
          })
          .select()
          .single()

        if (planInsertError || !newMealPlan) {
          console.error(`Failed to insert meal plan for user ${userId}:`, planInsertError)
          results.failed++
          results.errors.push(`User ${userId}: Failed to insert meal plan`)
          continue
        }

        // Insert all meals
        const mealsToInsert = mealPlan.days.flatMap((day: any) =>
          day.meals.map((meal: any) => ({
            meal_plan_id: newMealPlan.id,
            day_number: day.day_number,
            meal_type: meal.meal_type,
            meal_name: meal.meal_name,
            calories: meal.calories,
            protein_g: meal.protein_g,
            carbs_g: meal.carbs_g,
            fat_g: meal.fat_g,
            ingredients: meal.ingredients,
            instructions: meal.instructions,
            prep_time_minutes: meal.prep_time_minutes,
            cook_time_minutes: meal.cook_time_minutes,
          }))
        )

        // @ts-ignore - Supabase type issue with generated types
        const { error: mealsInsertError } = await supabaseAdmin
          .from('meals')
          .insert(mealsToInsert)

        if (mealsInsertError) {
          console.error(`Failed to insert meals for user ${userId}:`, mealsInsertError)
          results.failed++
          results.errors.push(`User ${userId}: Failed to insert meals`)
          continue
        }

        console.log(`Successfully generated meal plan for user ${userId}`)
        results.successful++
      } catch (error: any) {
        console.error(`Error processing user ${userId}:`, error)
        results.failed++
        results.errors.push(`User ${userId}: ${error.message}`)
      }
    }

    return NextResponse.json({
      message: 'Meal plan generation completed',
      totalUsers: userIds.length,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors,
    })
  } catch (error: any) {
    console.error('Error in cron job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process cron job' },
      { status: 500 }
    )
  }
}

async function generateMealPlan(profile: any) {
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

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from ChatGPT')
  }

  const mealPlan = JSON.parse(content)

  if (!mealPlan.plan_name || !mealPlan.days || !Array.isArray(mealPlan.days)) {
    throw new Error('Invalid meal plan structure from AI')
  }

  return mealPlan
}
