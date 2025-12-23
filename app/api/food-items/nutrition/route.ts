import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { validateRequestBody, foodNutritionSchema } from '@/lib/validations/api'
import { rateLimit, rateLimitHeaders } from '@/lib/utils/rate-limit'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, foodNutritionSchema)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { foodName, serving } = validation.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit(user.id, 'FOOD_NUTRITION')

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetAt),
        }
      )
    }

    // Check if item already exists in database
    const { data: existing } = await supabase
      .from('food_items')
      .select('*')
      .ilike('name', foodName)
      .limit(1)
      .single()

    if (existing) {
      // Increment usage count
      await supabase.rpc('increment_food_item_usage', { item_id: existing.id })
      return NextResponse.json({ foodItem: existing, isNew: false })
    }

    // Get nutritional info from OpenAI
    const prompt = `Provide detailed nutritional information for: "${foodName}"${serving ? ` (${serving})` : ''}.

Return ONLY valid JSON in this exact format:
{
  "name": "Standardized food name",
  "category": "food" or "drink" or "snack",
  "brand": "Brand name if applicable, otherwise null",
  "serving_size": "Standard serving size (e.g., '1 cup', '100g', '1 medium')",
  "serving_unit": "Unit (e.g., 'cup', 'g', 'oz', 'piece')",
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0,
  "fiber_g": 0,
  "sugar_g": 0,
  "sodium_mg": 0,
  "common_portions": ["list", "of", "common", "serving", "sizes"]
}

Be accurate and use USDA data when possible. For drinks, set category as "drink".`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      console.error('No content in OpenAI response')
      throw new Error('No response from AI')
    }

    console.log('OpenAI raw response:', content)

    let nutritionData
    try {
      nutritionData = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      throw new Error('Invalid response format from AI')
    }

    // Validate required fields
    if (!nutritionData.name || !nutritionData.serving_size || nutritionData.calories === undefined) {
      console.error('Missing required fields in nutrition data:', nutritionData)
      throw new Error('Incomplete nutrition data from AI')
    }

    // Validate and normalize category
    const validCategories = ['food', 'drink', 'snack']
    let category = 'food' // default
    if (nutritionData.category && typeof nutritionData.category === 'string') {
      const normalizedCategory = nutritionData.category.toLowerCase().trim()
      if (validCategories.includes(normalizedCategory)) {
        category = normalizedCategory as 'food' | 'drink' | 'snack'
      }
    }

    // Save to database
    const { data: newFoodItem, error: insertError } = await supabase
      .from('food_items')
      .insert({
        name: nutritionData.name,
        category: category,
        brand: nutritionData.brand,
        serving_size: nutritionData.serving_size,
        serving_unit: nutritionData.serving_unit,
        calories: nutritionData.calories,
        protein_g: nutritionData.protein_g,
        carbs_g: nutritionData.carbs_g,
        fat_g: nutritionData.fat_g,
        fiber_g: nutritionData.fiber_g,
        sugar_g: nutritionData.sugar_g,
        sodium_mg: nutritionData.sodium_mg,
        common_portions: nutritionData.common_portions,
        created_by_user_id: user.id,
        usage_count: 1,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw insertError
    }

    console.log('Successfully created food item:', newFoodItem.name)
    return NextResponse.json({ foodItem: newFoodItem, isNew: true })
  } catch (error: any) {
    console.error('Error getting nutrition info:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get nutrition info' },
      { status: 500 }
    )
  }
}
