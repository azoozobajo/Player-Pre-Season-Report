import { type AssessmentResult, type Indicator, type IndicatorCategory } from '../types'

export function getIndicatorValue(result: AssessmentResult): number | null {
  if (result.value_numeric !== null && result.value_numeric !== undefined) return result.value_numeric
  if (result.value_rating !== null && result.value_rating !== undefined) return result.value_rating
  return null
}

export function normalizeIndicatorValue(value: number, indicator: Indicator): number {
  const min = indicator.min_value ?? 0
  const max = indicator.max_value ?? 100
  if (max === min) return 0
  const normalized = ((value - min) / (max - min)) * 100
  if (indicator.direction === 'lower_better') return 100 - normalized
  return Math.min(100, Math.max(0, normalized))
}

export function getPlayerIndicatorProgress(results: AssessmentResult[], indicator: Indicator) {
  const indicatorResults = results.filter(r => r.indicator_id === indicator.id)
  if (indicatorResults.length === 0) return null

  const latest = indicatorResults[indicatorResults.length - 1]
  const value = getIndicatorValue(latest)
  if (value === null) return null

  return {
    value,
    normalized: normalizeIndicatorValue(value, indicator),
    result: latest,
  }
}

export function getCategorySummary(
  results: AssessmentResult[],
  indicators: Indicator[],
  categories: IndicatorCategory[]
) {
  return categories.map(cat => {
    const catIndicators = indicators.filter(i => i.category_id === cat.id)
    const progresses = catIndicators
      .map(ind => getPlayerIndicatorProgress(results, ind))
      .filter(p => p !== null) as { value: number; normalized: number }[]

    const avg = progresses.length > 0
      ? progresses.reduce((sum, p) => sum + p.normalized, 0) / progresses.length
      : 0

    return {
      category: cat,
      average: Math.round(avg),
      count: progresses.length,
      total: catIndicators.length,
    }
  })
}

export function getOverallProgress(categorySummary: { average: number; count: number }[]): number {
  const withData = categorySummary.filter(c => c.count > 0)
  if (withData.length === 0) return 0
  return Math.round(withData.reduce((sum, c) => sum + c.average, 0) / withData.length)
}

export function getProgressStatus(percentage: number): string {
  if (percentage >= 90) return 'ممتاز'
  if (percentage >= 75) return 'جيد جداً'
  if (percentage >= 60) return 'جيد'
  if (percentage >= 45) return 'مقبول'
  return 'يحتاج تطوير'
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 75) return '#00a86b'
  if (percentage >= 50) return '#f39c12'
  return '#e74c3c'
}
