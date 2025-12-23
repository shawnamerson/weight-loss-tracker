import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateQueryParams, foodSearchSchema } from '@/lib/validations/api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Return empty results for empty query (don't treat as error)
    const query = searchParams.get('q')
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Validate query parameters
    const validation = validateQueryParams(searchParams, foodSearchSchema)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { q, category } = validation.data

    const supabase = await createClient()

    // Sanitize search term (alphanumeric, spaces, hyphens only)
    const sanitizedQuery = q.replace(/[^a-zA-Z0-9\s\-]/g, '').trim()
    if (!sanitizedQuery) {
      return NextResponse.json({ results: [] })
    }

    // Use the database function for fuzzy search
    const { data, error } = await supabase.rpc('search_food_items', {
      search_term: sanitizedQuery,
      item_category: category || null,
    })

    if (error) throw error

    return NextResponse.json({ results: data || [] })
  } catch (error: any) {
    console.error('Error searching food items:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search food items' },
      { status: 500 }
    )
  }
}
