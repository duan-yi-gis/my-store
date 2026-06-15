import type { InvestmentParams, MarginRates, SalesRatios, PromotionItem } from '@/store/useStore'

// 促销类型中文名称映射
const promotionTypeNames: Record<PromotionItem['type'], string> = {
  discount: '折扣优惠',
  fullReduction: '满减优惠',
  buyGive: '买赠活动',
  memberDiscount: '会员折扣',
  groupBuy: '团购优惠',
  coupon: '优惠券',
  pointsExchange: '积分兑换',
  referral: '推荐返利',
  trafficDrive: '引流款',
  combo: '套餐组合',
}

/**
 * 计算固定成本
 * 月固定成本 = 月人工 + 月水电 + 年房租/12
 * 日固定成本 = 月固定成本 / 30
 * 年固定成本 = 月固定成本 * 12
 */
export function calculateFixedCosts(params: InvestmentParams) {
  const monthly = params.monthlyLabor + params.monthlyUtility + params.annualRent / 12
  const daily = monthly / 30
  const annual = monthly * 12
  const rentDeposit = (params.annualRent / 12) * params.rentDepositMonths
  const monthsPerCycle = params.rentPaymentCycle === 'yearly' ? 12 : params.rentPaymentCycle === 'quarterly' ? 3 : 6
  const initialRentPayment = (params.annualRent / 12) * monthsPerCycle
  return { monthly, daily, annual, rentDeposit, initialRentPayment }
}

/**
 * 计算综合毛利率
 * = 水产毛利率 * 水产销售占比 + 冰鲜毛利率 * 冰鲜销售占比 + 冻货毛利率 * 冻货销售占比 + 干货毛利率 * 干货销售占比 + 加工毛利率 * 加工销售占比
 */
export function calculateCompositeMargin(marginRates: MarginRates, salesRatios: SalesRatios): number {
  return (
    marginRates.seafood * salesRatios.seafood +
    marginRates.chilled * salesRatios.chilled +
    marginRates.frozen * salesRatios.frozen +
    marginRates.dry * salesRatios.dry +
    marginRates.processed * salesRatios.processed
  )
}

/**
 * 计算盈亏平衡点
 * 日盈亏平衡 = 日固定成本 / 综合毛利率
 * 月盈亏平衡 = 月固定成本 / 综合毛利率
 * 年盈亏平衡 = 月固定成本 * 12 / 综合毛利率
 */
export function calculateBreakEven(
  fixedCosts: { daily: number; monthly: number },
  compositeMargin: number
) {
  const daily = fixedCosts.daily / compositeMargin
  const monthly = fixedCosts.monthly / compositeMargin
  const annual = (fixedCosts.monthly * 12) / compositeMargin
  return { daily, monthly, annual }
}

/**
 * 计算回本周期
 * 月利润 = 月营收 * 综合毛利率 - 月固定成本
 * 回本月数 = 总投资 / 月利润（利润 > 0，否则 Infinity）
 */
export function calculatePaybackPeriod(
  totalInvestment: number,
  monthlyFixedCosts: number,
  compositeMargin: number,
  scenarios: { conservative: number; moderate: number; optimistic: number }
) {
  const calcMonths = (revenue: number): number => {
    const monthlyProfit = revenue * compositeMargin - monthlyFixedCosts
    return monthlyProfit > 0 ? totalInvestment / monthlyProfit : Infinity
  }
  return {
    conservative: calcMonths(scenarios.conservative),
    moderate: calcMonths(scenarios.moderate),
    optimistic: calcMonths(scenarios.optimistic),
  }
}

/**
 * 计算现金流
 * 起始资金 = 总投资 - 装修 - 首批物料
 * 每月累计 = 上月累计 + 月营收 * 综合毛利率 - 月固定成本
 */
export function calculateCashFlow(
  totalInvestment: number,
  monthlyFixedCosts: number,
  compositeMargin: number,
  monthlyRevenue: number,
  months: number,
  initialOneTimeCost: number
) {
  const startingCash = totalInvestment - initialOneTimeCost
  const result: Array<{ month: number; cashFlow: number; cumulative: number }> = []

  let cumulative = startingCash
  for (let i = 1; i <= months; i++) {
    const cashFlow = monthlyRevenue * compositeMargin - monthlyFixedCosts
    cumulative += cashFlow
    result.push({ month: i, cashFlow, cumulative })
  }

  return result
}

/**
 * 计算促销影响
 * 按顺序处理各项促销，计算最终价格、利润、毛利率及预警
 */
export function calculatePromotionImpact(
  basePrice: number,
  costPrice: number,
  items: PromotionItem[]
) {
  let finalPrice = basePrice
  let adjustedCostPrice = costPrice
  const breakdown: Array<{ type: string; name: string; impact: number }> = []

  // 只处理启用的促销项
  const enabledItems = items.filter((item) => item.enabled)

  for (const item of enabledItems) {
    switch (item.type) {
      case 'discount': {
        // 折扣：最终价格 *= (1 - 折扣率)
        const discountRate = item.params.discountRate ?? 0
        const impact = basePrice * discountRate
        finalPrice *= 1 - discountRate
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
      case 'fullReduction': {
        // 满减：满 threshold 减 reductionAmount
        const threshold = item.params.threshold ?? 0
        const reductionAmount = item.params.reductionAmount ?? 0
        if (finalPrice >= threshold) {
          finalPrice -= reductionAmount
          breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact: reductionAmount })
        }
        break
      }
      case 'buyGive': {
        // 买赠：成本影响 = (赠品数量 * 赠品成本) / 购买数量
        const buyQuantity = item.params.buyQuantity ?? 1
        const giveQuantity = item.params.giveQuantity ?? 0
        const giveCostPrice = item.params.giveCostPrice ?? 0
        const impact = (giveQuantity * giveCostPrice) / buyQuantity
        adjustedCostPrice += impact
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
      case 'memberDiscount': {
        // 会员折扣：最终价格 *= 0.95
        const memberRate = item.params.memberRate ?? 0.95
        const impact = finalPrice * (1 - memberRate)
        finalPrice *= memberRate
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
      case 'groupBuy': {
        // 团购：最终价格 *= (1 - 团购折扣率)
        const groupDiscountRate = item.params.groupDiscountRate ?? 0
        const impact = finalPrice * groupDiscountRate
        finalPrice *= 1 - groupDiscountRate
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
      case 'coupon': {
        // 优惠券：最终价格 -= 优惠券面值
        const couponValue = item.params.couponValue ?? 0
        finalPrice -= couponValue
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact: couponValue })
        break
      }
      case 'pointsExchange': {
        // 积分兑换：成本影响 = 积分价值 / 订单数
        const pointsValue = item.params.pointsValue ?? 0
        const orderCount = item.params.orderCount ?? 1
        const impact = pointsValue / orderCount
        adjustedCostPrice += impact
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
      case 'referral': {
        // 推荐返利：成本影响 = 奖励金额 / 平均订单数
        const rewardAmount = item.params.rewardAmount ?? 0
        const avgOrderCount = item.params.avgOrderCount ?? 1
        const impact = rewardAmount / avgOrderCount
        adjustedCostPrice += impact
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
      case 'trafficDrive': {
        // 引流款：成本影响 = 产品成本 / 预期订单数
        const productCost = item.params.productCost ?? 0
        const expectedOrders = item.params.expectedOrders ?? 1
        const impact = productCost / expectedOrders
        adjustedCostPrice += impact
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
      case 'combo': {
        // 套餐：替换价格和成本
        const comboPrice = item.params.comboPrice ?? finalPrice
        const comboCost = item.params.comboCost ?? adjustedCostPrice
        const impact = finalPrice - comboPrice
        finalPrice = comboPrice
        adjustedCostPrice = comboCost
        breakdown.push({ type: item.type, name: promotionTypeNames[item.type], impact })
        break
      }
    }
  }

  const finalProfit = finalPrice - adjustedCostPrice
  const finalMarginRate = finalPrice > 0 ? finalProfit / finalPrice : 0
  const isWarning = finalMarginRate < 0.15

  return { finalPrice, finalProfit, finalMarginRate, isWarning, breakdown }
}

/**
 * 计算投资回报率
 * ROI = 年利润 / 投资 * 100
 */
export function calculateROI(investment: number, annualProfit: number): number {
  if (investment === 0) return 0
  return (annualProfit / investment) * 100
}

/**
 * 格式化货币：¥xxx,xxx.xx
 */
export function formatCurrency(value: number): string {
  return '¥' + value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * 格式化百分比：xx.xx%
 */
export function formatPercent(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%'
}
