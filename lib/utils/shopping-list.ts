import type { Meal } from '@/lib/types/database'

type Ingredient = {
  name: string
  amount: string
}

type ShoppingListItem = {
  name: string
  amounts: string[]
  totalAmount?: string
}

export function generateShoppingList(meals: Meal[]): {
  byCategory: { [category: string]: ShoppingListItem[] }
  allIngredients: ShoppingListItem[]
} {
  const ingredientMap = new Map<string, string[]>()

  // Aggregate all ingredients
  meals.forEach((meal) => {
    if (meal.ingredients) {
      const ingredients = Array.isArray(meal.ingredients)
        ? meal.ingredients
        : JSON.parse(JSON.stringify(meal.ingredients))

      ingredients.forEach((ingredient: Ingredient) => {
        const name = ingredient.name.toLowerCase().trim()
        const amount = ingredient.amount.trim()

        if (!ingredientMap.has(name)) {
          ingredientMap.set(name, [])
        }
        ingredientMap.get(name)?.push(amount)
      })
    }
  })

  // Convert to array and sort alphabetically
  const allIngredients: ShoppingListItem[] = Array.from(ingredientMap.entries())
    .map(([name, amounts]) => ({
      name: capitalizeWords(name),
      amounts,
      totalAmount: combineAmounts(amounts),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Categorize ingredients
  const byCategory = categorizeIngredients(allIngredients)

  return { byCategory, allIngredients }
}

function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function combineAmounts(amounts: string[]): string {
  // Group similar measurements
  const grouped = new Map<string, number>()
  const others: string[] = []

  amounts.forEach((amount) => {
    const match = amount.match(/^([\d.\/\s]+)\s*(.+)$/)
    if (match) {
      const [, numStr, unit] = match
      const num = parseFloat(numStr.replace(/\s/g, ''))

      if (!isNaN(num)) {
        const normalizedUnit = unit.toLowerCase().trim()
        const current = grouped.get(normalizedUnit) || 0
        grouped.set(normalizedUnit, current + num)
      } else {
        others.push(amount)
      }
    } else {
      others.push(amount)
    }
  })

  const combined: string[] = []
  grouped.forEach((total, unit) => {
    combined.push(`${total} ${unit}`)
  })

  return [...combined, ...others].join(', ')
}

function categorizeIngredients(ingredients: ShoppingListItem[]): {
  [category: string]: ShoppingListItem[]
} {
  const categories: { [category: string]: ShoppingListItem[] } = {
    Produce: [],
    Meat: [],
    Dairy: [],
    Pantry: [],
    Spices: [],
    Other: [],
  }

  const produceKeywords = [
    'lettuce',
    'tomato',
    'onion',
    'garlic',
    'pepper',
    'carrot',
    'celery',
    'cucumber',
    'spinach',
    'kale',
    'broccoli',
    'cauliflower',
    'potato',
    'sweet potato',
    'mushroom',
    'avocado',
    'lemon',
    'lime',
    'apple',
    'banana',
    'berry',
    'fruit',
    'vegetable',
    'herb',
    'cilantro',
    'parsley',
    'basil',
  ]

  const meatKeywords = [
    'chicken',
    'beef',
    'pork',
    'turkey',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'meat',
    'steak',
    'ground',
    'bacon',
    'sausage',
  ]

  const dairyKeywords = [
    'milk',
    'cheese',
    'yogurt',
    'butter',
    'cream',
    'egg',
    'mozzarella',
    'cheddar',
    'parmesan',
  ]

  const spicesKeywords = [
    'salt',
    'pepper',
    'cumin',
    'paprika',
    'oregano',
    'thyme',
    'rosemary',
    'cinnamon',
    'chili',
    'curry',
    'ginger',
    'turmeric',
  ]

  const pantryKeywords = [
    'oil',
    'flour',
    'sugar',
    'rice',
    'pasta',
    'bread',
    'beans',
    'lentils',
    'quinoa',
    'oats',
    'cereal',
    'sauce',
    'vinegar',
    'stock',
    'broth',
    'can',
    'jar',
  ]

  ingredients.forEach((ingredient) => {
    const nameLower = ingredient.name.toLowerCase()

    if (produceKeywords.some((keyword) => nameLower.includes(keyword))) {
      categories.Produce.push(ingredient)
    } else if (meatKeywords.some((keyword) => nameLower.includes(keyword))) {
      categories.Meat.push(ingredient)
    } else if (dairyKeywords.some((keyword) => nameLower.includes(keyword))) {
      categories.Dairy.push(ingredient)
    } else if (spicesKeywords.some((keyword) => nameLower.includes(keyword))) {
      categories.Spices.push(ingredient)
    } else if (pantryKeywords.some((keyword) => nameLower.includes(keyword))) {
      categories.Pantry.push(ingredient)
    } else {
      categories.Other.push(ingredient)
    }
  })

  // Remove empty categories
  Object.keys(categories).forEach((key) => {
    if (categories[key].length === 0) {
      delete categories[key]
    }
  })

  return categories
}

export function formatShoppingListForPrint(
  byCategory: { [category: string]: ShoppingListItem[] },
  planName: string
): string {
  let text = `Shopping List: ${planName}\n`
  text += `Generated: ${new Date().toLocaleDateString()}\n`
  text += `${'='.repeat(50)}\n\n`

  Object.entries(byCategory).forEach(([category, items]) => {
    text += `${category.toUpperCase()}\n`
    text += `${'-'.repeat(30)}\n`
    items.forEach((item) => {
      text += `☐ ${item.name} - ${item.totalAmount}\n`
    })
    text += '\n'
  })

  return text
}
