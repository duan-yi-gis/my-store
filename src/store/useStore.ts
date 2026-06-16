import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 合伙人
interface Partner {
  id: string
  name: string
  investment: number
}

// 投资参数
interface InvestmentParams {
  partners: Partner[]             // 合伙人列表
  annualRent: number           // 年房租 30000
  rentPaymentCycle: 'yearly' | 'quarterly' | 'semiannual'  // 付款周期
  rentDepositMonths: number    // 押金月数（默认1个月）
  decoration: number           // 装修 60000
  firstBatchMaterial: number   // 首批物料 40000
  monthlyLabor: number         // 月人工 15000
  monthlyUtility: number       // 月水电 5000
}

// 毛利率
interface MarginRates {
  seafood: number    // 水产海鲜毛利率 0.32
  chilled: number    // 冰鲜毛利率 0.28
  frozen: number     // 冻货毛利率 0.25
  dry: number        // 干货毛利率 0.35
  processed: number  // 加工毛利率 0.55
}

// 销售占比
interface SalesRatios {
  seafood: number    // 水产销售占比 0.35
  chilled: number    // 冰鲜销售占比 0.12
  frozen: number     // 冻货销售占比 0.15
  dry: number        // 干货销售占比 0.13
  processed: number  // 加工销售占比 0.25
}

// 促销项
interface PromotionItem {
  id: string
  type: 'discount' | 'fullReduction' | 'buyGive' | 'memberDiscount' | 'groupBuy' | 'coupon' | 'pointsExchange' | 'referral' | 'trafficDrive' | 'combo'
  enabled: boolean
  params: Record<string, number>
}

// 促销方案
interface PromotionScheme {
  id: string
  name: string
  items: PromotionItem[]
  basePrice: number
  costPrice: number
  createdAt: string
}

// 每日经营记录
interface DailyRecord {
  date: string
  revenue: number
  cost: number
  loss: number       // 损耗金额
  newMembers: number
  orders: number
}

// 状态接口
interface StoreState {
  investmentParams: InvestmentParams
  marginRates: MarginRates
  salesRatios: SalesRatios
  warningThreshold: number       // 毛利率预警线 0.15
  promotionSchemes: PromotionScheme[]
  dailyRecords: DailyRecord[]
  targetAnnualProfit: number     // 目标年利润 300000

  // Actions
  setInvestmentParams: (params: Partial<InvestmentParams>) => void
  setMarginRates: (rates: Partial<MarginRates>) => void
  setSalesRatios: (ratios: Partial<SalesRatios>) => void
  setWarningThreshold: (threshold: number) => void
  setTargetAnnualProfit: (profit: number) => void
  addPromotionScheme: (scheme: PromotionScheme) => void
  removePromotionScheme: (id: string) => void
  updatePromotionScheme: (id: string, scheme: Partial<PromotionScheme>) => void
  addDailyRecord: (record: DailyRecord) => void
  updateDailyRecord: (date: string, record: Partial<DailyRecord>) => void
  removeDailyRecord: (date: string) => void
  resetAll: () => void
}

export type {
  Partner,
  InvestmentParams,
  MarginRates,
  SalesRatios,
  PromotionItem,
  PromotionScheme,
  DailyRecord,
  StoreState,
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // 默认值
      investmentParams: {
        partners: [
          { id: '1', name: '合伙人1', investment: 200000 },
        ],
        annualRent: 30000,
        rentPaymentCycle: 'quarterly',
        rentDepositMonths: 1,
        decoration: 60000,
        firstBatchMaterial: 40000,
        monthlyLabor: 15000,
        monthlyUtility: 5000,
      },
      marginRates: {
        seafood: 0.32,
        chilled: 0.28,
        frozen: 0.25,
        dry: 0.35,
        processed: 0.55,
      },
      salesRatios: {
        seafood: 0.35,
        chilled: 0.12,
        frozen: 0.15,
        dry: 0.13,
        processed: 0.25,
      },
      warningThreshold: 0.15,
      promotionSchemes: [],
      dailyRecords: [],
      targetAnnualProfit: 300000,

      // Actions
      setInvestmentParams: (params) =>
        set((state) => ({
          investmentParams: { ...state.investmentParams, ...params },
        })),

      setMarginRates: (rates) =>
        set((state) => ({
          marginRates: { ...state.marginRates, ...rates },
        })),

      setSalesRatios: (ratios) =>
        set((state) => ({
          salesRatios: { ...state.salesRatios, ...ratios },
        })),

      setWarningThreshold: (threshold) =>
        set({ warningThreshold: threshold }),

      setTargetAnnualProfit: (profit) =>
        set({ targetAnnualProfit: profit }),

      addPromotionScheme: (scheme) =>
        set((state) => ({
          promotionSchemes: [...state.promotionSchemes, scheme],
        })),

      removePromotionScheme: (id) =>
        set((state) => ({
          promotionSchemes: state.promotionSchemes.filter((s) => s.id !== id),
        })),

      updatePromotionScheme: (id, scheme) =>
        set((state) => ({
          promotionSchemes: state.promotionSchemes.map((s) =>
            s.id === id ? { ...s, ...scheme } : s
          ),
        })),

      addDailyRecord: (record) =>
        set((state) => ({
          dailyRecords: [...state.dailyRecords, record],
        })),

      updateDailyRecord: (date, record) =>
        set((state) => ({
          dailyRecords: state.dailyRecords.map((r) =>
            r.date === date ? { ...r, ...record } : r
          ),
        })),

      removeDailyRecord: (date) =>
        set((state) => ({
          dailyRecords: state.dailyRecords.filter((r) => r.date !== date),
        })),

      resetAll: () => {
        localStorage.removeItem('yuyue-store')
        window.location.reload()
      },
    }),
    {
      name: 'yuyue-store',
      migrate: (persisted: any) => {
        // 旧数据迁移：totalInvestment → partners
        if (persisted?.investmentParams && !persisted.investmentParams.partners) {
          persisted.investmentParams.partners = [
            { id: '1', name: '合伙人1', investment: persisted.investmentParams.totalInvestment || 200000 },
          ]
          delete persisted.investmentParams.totalInvestment
        }
        return persisted
      },
      version: 1,
    },
  ),
)
