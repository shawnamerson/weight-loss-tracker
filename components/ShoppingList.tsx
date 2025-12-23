'use client'

import { useState } from 'react'
import type { Meal } from '@/lib/types/database'
import { generateShoppingList, formatShoppingListForPrint } from '@/lib/utils/shopping-list'

type ShoppingListProps = {
  meals: Meal[]
  planName: string
}

export default function ShoppingList({ meals, planName }: ShoppingListProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const { byCategory, allIngredients } = generateShoppingList(meals)

  const toggleItem = (itemName: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemName)) {
      newChecked.delete(itemName)
    } else {
      newChecked.add(itemName)
    }
    setCheckedItems(newChecked)
  }

  const handlePrint = () => {
    const printContent = formatShoppingListForPrint(byCategory, planName)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Shopping List - ${planName}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                line-height: 1.6;
              }
              h1 {
                margin-bottom: 10px;
              }
              .category {
                margin-top: 20px;
                margin-bottom: 10px;
                font-weight: bold;
                font-size: 1.2em;
                border-bottom: 2px solid #333;
              }
              .item {
                margin-left: 10px;
                padding: 5px 0;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <pre>${printContent}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleDownload = () => {
    const content = formatShoppingListForPrint(byCategory, planName)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
      >
        <span>🛒</span>
        <span>View Shopping List</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Shopping List</h2>
              <p className="text-green-100">{planName}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-green-100 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold transition text-sm"
            >
              🖨️ Print
            </button>
            <button
              onClick={handleDownload}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold transition text-sm"
            >
              📥 Download
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-sm text-gray-600 mb-6">
            Total Items: {allIngredients.length} • Click to check off items as you shop
          </div>

          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category} className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-600">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((item) => {
                  const isChecked = checkedItems.has(item.name)
                  return (
                    <button
                      key={item.name}
                      onClick={() => toggleItem(item.name)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        isChecked
                          ? 'bg-green-50 border-green-300 opacity-60'
                          : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isChecked ? (
                            <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold ${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {item.totalAmount}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {allIngredients.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No ingredients found in this meal plan
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
