import { z } from 'zod'

// Profile validation for AI generation
export const profileSchema = z.object({
  id: z.string().uuid().optional(),
  daily_calorie_target: z.number().int().min(1000).max(5000).optional(),
  daily_protein_target_g: z.number().int().min(0).max(500).optional(),
  daily_carbs_target_g: z.number().int().min(0).max(1000).optional(),
  daily_fat_target_g: z.number().int().min(0).max(300).optional(),
  meals_per_day: z.number().int().min(1).max(8).optional(),
  dietary_restrictions: z.array(z.string().max(100)).optional(),
  cuisine_preferences: z.array(z.string().max(100)).optional(),
  goal_type: z.enum(['lose_weight', 'gain_weight', 'maintain_weight', 'build_muscle']).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  current_weight_kg: z.number().min(20).max(500).optional(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
})

// Meal plan generation request
export const generateMealPlanSchema = z.object({
  profile: profileSchema,
  weeksDuration: z.number().int().min(1).max(4).optional(),
})

// Workout plan generation request
export const generateWorkoutPlanSchema = z.object({
  profile: profileSchema,
  weeksDuration: z.number().int().min(1).max(4).optional(),
  workoutsPerWeek: z.number().int().min(1).max(7).optional(),
})

// Food nutrition lookup
export const foodNutritionSchema = z.object({
  foodName: z.string().min(1).max(200).trim(),
  serving: z.string().min(1).max(100).trim().optional(),
})

// Food search query
export const foodSearchSchema = z.object({
  q: z.string().min(1).max(100).trim(),
  category: z.enum(['food', 'drink', 'snack']).optional(),
})

// Helper function to validate request body
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')
      return { success: false, error: `Validation failed: ${errors}` }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return { success: false, error: 'Invalid JSON in request body' }
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    // Convert URLSearchParams to object
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    const result = schema.safeParse(params)

    if (!result.success) {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')
      return { success: false, error: `Validation failed: ${errors}` }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return { success: false, error: 'Invalid query parameters' }
  }
}
