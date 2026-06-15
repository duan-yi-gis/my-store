import { useState, useMemo, useCallback } from 'react';
import {
  Percent,
  MinusCircle,
  Gift,
  Crown,
  Users,
  Ticket,
  Star,
  UserPlus,
  Megaphone,
  Package,
  AlertTriangle,
  Save,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore, type PromotionItem } from '@/store/useStore';
import { calculatePromotionImpact, formatCurrency, formatPercent } from '@/utils/calculations';
import { InputField } from '@/components/InputField';
import { cn } from '@/lib/utils';

// ─── Promotion type definitions ────────────────────────────────────────────────

interface PromotionConfig {
  type: PromotionItem['type'];
  name: string;
  icon: React.ElementType;
  formula: string;
  params: { key: string; label: string; defaultValue: number; min?: number; max?: number; step?: number; unit?: string }[];
}

const PROMOTION_CONFIGS: PromotionConfig[] = [
  {
    type: 'discount',
    name: '打折',
    icon: Percent,
    formula: '售价 × (1 - 折扣率)',
    params: [
      { key: 'discountRate', label: '折扣率', defaultValue: 0.1, min: 0, max: 1, step: 0.01, unit: '' },
    ],
  },
  {
    type: 'fullReduction',
    name: '满减',
    icon: MinusCircle,
    formula: '若售价 ≥ 门槛，售价 - 减免金额',
    params: [
      { key: 'threshold', label: '满减门槛(元)', defaultValue: 100, min: 0, step: 1, unit: '元' },
      { key: 'reductionAmount', label: '减免金额(元)', defaultValue: 10, min: 0, step: 1, unit: '元' },
    ],
  },
  {
    type: 'buyGive',
    name: '买送',
    icon: Gift,
    formula: '成本增加 = (赠品数 × 赠品成本) ÷ 购买数',
    params: [
      { key: 'buyQuantity', label: '买数量', defaultValue: 2, min: 1, step: 1, unit: '' },
      { key: 'giveQuantity', label: '送数量', defaultValue: 1, min: 0, step: 1, unit: '' },
    ],
  },
  {
    type: 'memberDiscount',
    name: '会员折扣',
    icon: Crown,
    formula: '售价 × 会员折扣率',
    params: [
      { key: 'memberRate', label: '会员折扣率', defaultValue: 0.95, min: 0, max: 1, step: 0.01, unit: '' },
    ],
  },
  {
    type: 'groupBuy',
    name: '团购',
    icon: Users,
    formula: '售价 × (1 - 团购折扣率)',
    params: [
      { key: 'groupDiscountRate', label: '团购折扣率', defaultValue: 0.15, min: 0, max: 1, step: 0.01, unit: '' },
      { key: 'minPeople', label: '最少人数', defaultValue: 3, min: 2, step: 1, unit: '人' },
    ],
  },
  {
    type: 'coupon',
    name: '优惠券',
    icon: Ticket,
    formula: '售价 - 优惠券面值',
    params: [
      { key: 'couponValue', label: '优惠券面值(元)', defaultValue: 10, min: 0, step: 1, unit: '元' },
      { key: 'couponThreshold', label: '使用门槛(元)', defaultValue: 50, min: 0, step: 1, unit: '元' },
    ],
  },
  {
    type: 'pointsExchange',
    name: '积分兑换',
    icon: Star,
    formula: '成本增加 = 积分价值 ÷ 订单数',
    params: [
      { key: 'pointsValue', label: '积分兑换价值(元)', defaultValue: 5, min: 0, step: 1, unit: '元' },
      { key: 'pointsPerOrder', label: '每单可用积分', defaultValue: 100, min: 0, step: 1, unit: '分' },
    ],
  },
  {
    type: 'referral',
    name: '老带新',
    icon: UserPlus,
    formula: '成本增加 = 奖励金额 ÷ 平均订单数',
    params: [
      { key: 'rewardAmount', label: '奖励金额(元)', defaultValue: 20, min: 0, step: 1, unit: '元' },
      { key: 'avgOrderCount', label: '预计每单分摊(元)', defaultValue: 5, min: 0, step: 1, unit: '元' },
    ],
  },
  {
    type: 'trafficDrive',
    name: '引流活动',
    icon: Megaphone,
    formula: '成本增加 = 引流品成本 ÷ 预期订单数',
    params: [
      { key: 'productCost', label: '引流品成本(元)', defaultValue: 15, min: 0, step: 1, unit: '元' },
      { key: 'expectedOrders', label: '预计带来订单数', defaultValue: 5, min: 1, step: 1, unit: '单' },
    ],
  },
  {
    type: 'combo',
    name: '套餐搭配',
    icon: Package,
    formula: '售价替换为套餐价，成本替换为套餐成本',
    params: [
      { key: 'comboPrice', label: '套餐售价(元)', defaultValue: 128, min: 0, step: 1, unit: '元' },
      { key: 'comboCost', label: '套餐成本(元)', defaultValue: 80, min: 0, step: 1, unit: '元' },
    ],
  },
];

// ─── 产品预设数据 ────────────────────────────────────────────────────────────

interface ProductPreset {
  name: string;
  category: 'seafood' | 'chilled' | 'frozen' | 'dry' | 'processed';
  basePrice: number;   // 售价(元)
  costPrice: number;   // 成本价(元)
  unit: string;
  description?: string;
}

const PRODUCT_PRESETS: { category: string; label: string; products: ProductPreset[] }[] = [
  {
    category: 'seafood',
    label: '水产海鲜',
    products: [
      { name: '基围虾', category: 'seafood', basePrice: 45, costPrice: 28, unit: '元/斤', description: '活鲜，控水称重' },
      { name: '大虾(对虾)', category: 'seafood', basePrice: 55, costPrice: 35, unit: '元/斤', description: '活鲜，油焖大虾用' },
      { name: '鲈鱼', category: 'seafood', basePrice: 22, costPrice: 12, unit: '元/斤', description: '活鲜，清蒸鲈鱼' },
      { name: '鲶鱼', category: 'seafood', basePrice: 13, costPrice: 7, unit: '元/斤', description: '本地鱼塘，铁锅炖用' },
      { name: '螃蟹(公)', category: 'seafood', basePrice: 55, costPrice: 35, unit: '元/斤', description: '活鲜，秋季主推' },
      { name: '花甲', category: 'seafood', basePrice: 10, costPrice: 6, unit: '元/斤', description: '活鲜，控水称重' },
      { name: '海虹', category: 'seafood', basePrice: 5, costPrice: 3, unit: '元/斤', description: '引流品，开业活动用' },
      { name: '小龙虾', category: 'seafood', basePrice: 28, costPrice: 15, unit: '元/斤', description: '鲜活，麻辣/蒜蓉' },
    ],
  },
  {
    category: 'chilled',
    label: '冰鲜',
    products: [
      { name: '冰鲜带鱼', category: 'chilled', basePrice: 18, costPrice: 11, unit: '元/斤', description: '冰鲜，煎炸均可' },
      { name: '冰鲜黄花鱼', category: 'chilled', basePrice: 25, costPrice: 16, unit: '元/斤', description: '冰鲜，红烧/干炸' },
      { name: '冰鲜鲅鱼', category: 'chilled', basePrice: 15, costPrice: 9, unit: '元/斤', description: '冰鲜，熏制/炖汤' },
      { name: '冰鲜刀鱼', category: 'chilled', basePrice: 20, costPrice: 13, unit: '元/斤', description: '冰鲜，清蒸/红烧' },
    ],
  },
  {
    category: 'frozen',
    label: '冻货',
    products: [
      { name: '虾滑', category: 'frozen', basePrice: 30, costPrice: 18, unit: '元/斤', description: '冷冻，火锅/煎制' },
      { name: '扇贝肉', category: 'frozen', basePrice: 35, costPrice: 22, unit: '元/斤', description: '冷冻，蒜蓉/捞汁' },
      { name: '鳗鱼段', category: 'frozen', basePrice: 48, costPrice: 32, unit: '元/斤', description: '冷冻，红烧/蒲烧' },
      { name: '海参(即食)', category: 'frozen', basePrice: 68, costPrice: 45, unit: '元/个', description: '即食，鲍鱼捞饭搭配' },
      { name: '鲍鱼(冷冻)', category: 'frozen', basePrice: 8, costPrice: 5, unit: '元/个', description: '冷冻，蒜蓉/捞饭' },
      { name: '小龙虾(冷冻)', category: 'frozen', basePrice: 22, costPrice: 15, unit: '元/斤', description: '冷冻尾虾，麻辣/蒜蓉' },
    ],
  },
  {
    category: 'dry',
    label: '干货',
    products: [
      { name: '鱼干', category: 'dry', basePrice: 25, costPrice: 15, unit: '元/斤', description: '干货，即食/炒制' },
      { name: '鱼排(半成品)', category: 'dry', basePrice: 32, costPrice: 20, unit: '元/斤', description: '半成品，油炸即食' },
      { name: '鱿鱼丝', category: 'dry', basePrice: 38, costPrice: 22, unit: '元/斤', description: '干货，零食/下酒' },
      { name: '海带结', category: 'dry', basePrice: 12, costPrice: 6, unit: '元/斤', description: '干货，凉拌/炖汤' },
    ],
  },
  {
    category: 'processed',
    label: '加工',
    products: [
      {
        name: '烤鱼(草鱼)',
        category: 'processed',
        basePrice: 68,
        costPrice: 28,
        unit: '元/份',
        description: '含鱼1条+娃娃菜100g+金针菇100g+木耳60g+脆皮肠4个+鱼豆腐4个+锡纸盘+支架+酒精块',
      },
      {
        name: '烤鱼(鲈鱼)',
        category: 'processed',
        basePrice: 88,
        costPrice: 38,
        unit: '元/份',
        description: '含鲈鱼1条+娃娃菜100g+金针菇100g+木耳60g+脆皮肠4个+鱼豆腐4个+锡纸盘+支架+酒精块',
      },
      {
        name: '油焖大虾(王婆大虾)',
        category: 'processed',
        basePrice: 88,
        costPrice: 42,
        unit: '元/份',
        description: '含大虾+土豆100g+黄瓜100g+玉米条100g+锡纸盘+支架+酒精块',
      },
      {
        name: '炝锅鱼',
        category: 'processed',
        basePrice: 58,
        costPrice: 24,
        unit: '元/份',
        description: '含鱼1条+炸腐竹100g+炸豆腐100g+宽粉100g+豆芽100g',
      },
      {
        name: '铁锅炖鲶鱼',
        category: 'processed',
        basePrice: 78,
        costPrice: 32,
        unit: '元/份',
        description: '含鲶鱼1条+豆腐+粉条+白菜，2-3人份',
      },
      {
        name: '海鲜大咖',
        category: 'processed',
        basePrice: 168,
        costPrice: 85,
        unit: '元/份',
        description: '含虾+蟹+贝类+鱼+配菜，4-6人份',
      },
      {
        name: '捞汁小海鲜',
        category: 'processed',
        basePrice: 28,
        costPrice: 12,
        unit: '元/份',
        description: '预制冷菜，即食',
      },
      {
        name: '生腌蟹钳',
        category: 'processed',
        basePrice: 35,
        costPrice: 16,
        unit: '元/份',
        description: '预制冷菜，即食',
      },
      {
        name: '生腌八爪鱼',
        category: 'processed',
        basePrice: 38,
        costPrice: 18,
        unit: '元/份',
        description: '预制冷菜，即食',
      },
      {
        name: '麻辣田螺',
        category: 'processed',
        basePrice: 22,
        costPrice: 10,
        unit: '元/份',
        description: '预制冷菜，即食',
      },
      {
        name: '麻辣小龙虾',
        category: 'processed',
        basePrice: 58,
        costPrice: 28,
        unit: '元/份',
        description: '含小龙虾2斤+料包',
      },
      {
        name: '蒜蓉小龙虾',
        category: 'processed',
        basePrice: 58,
        costPrice: 28,
        unit: '元/份',
        description: '含小龙虾2斤+料包',
      },
    ],
  },
];

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
        checked ? 'bg-emerald-500' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Promotion() {
  const { warningThreshold, promotionSchemes, addPromotionScheme, removePromotionScheme, updatePromotionScheme } = useStore();

  // Base prices
  const [basePrice, setBasePrice] = useState(100);
  const [costPrice, setCostPrice] = useState(60);
  const [selectedCategory, setSelectedCategory] = useState<string>('seafood');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // 从选中产品自动计算合计售价和成本
  const allProducts = useMemo(() => PRODUCT_PRESETS.flatMap((c) => c.products), []);

  const selectedProductsList = useMemo(() => {
    return allProducts.filter((p) => selectedQuantities[p.name] > 0);
  }, [allProducts, selectedQuantities]);

  const autoBasePrice = useMemo(
    () => selectedProductsList.reduce((s, p) => s + p.basePrice * (selectedQuantities[p.name] || 0), 0),
    [selectedProductsList, selectedQuantities]
  );
  const autoCostPrice = useMemo(
    () => selectedProductsList.reduce((s, p) => s + p.costPrice * (selectedQuantities[p.name] || 0), 0),
    [selectedProductsList, selectedQuantities]
  );

  // 切换产品选中（默认数量1）
  const toggleProduct = useCallback((name: string) => {
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      if (next[name] > 0) {
        delete next[name];
      } else {
        next[name] = 1;
      }
      return next;
    });
  }, []);

  // 设置产品数量
  const setProductQuantity = useCallback((name: string, qty: number) => {
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[name];
      } else {
        next[name] = qty;
      }
      return next;
    });
  }, []);

  const selectedCount = Object.keys(selectedQuantities).length;

  // 选中产品变化时自动更新售价和成本
  useMemo(() => {
    if (selectedProductsList.length > 0) {
      setBasePrice(autoBasePrice);
      setCostPrice(autoCostPrice);
    }
  }, [autoBasePrice, autoCostPrice, selectedProductsList.length]);

  // Promotion enabled states and params
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [paramsMap, setParamsMap] = useState<Record<string, Record<string, number>>>(() => {
    const initial: Record<string, Record<string, number>> = {};
    for (const cfg of PROMOTION_CONFIGS) {
      initial[cfg.type] = {};
      for (const p of cfg.params) {
        initial[cfg.type][p.key] = p.defaultValue;
      }
    }
    return initial;
  });

  // 买送：选择赠品产品
  const [buyGiveGiftProduct, setBuyGiveGiftProduct] = useState<string>('');

  // 赠品成本价自动同步到 params
  useMemo(() => {
    const giftProduct = allProducts.find((p) => p.name === buyGiveGiftProduct);
    if (giftProduct) {
      setParamsMap((prev) => ({
        ...prev,
        buyGive: { ...prev.buyGive, giveCostPrice: giftProduct.costPrice },
      }));
    }
  }, [buyGiveGiftProduct, allProducts]);

  // Scheme editing
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Toggle promotion
  const togglePromotion = useCallback((type: string) => {
    setEnabledMap((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // Update param
  const updateParam = useCallback((type: string, key: string, value: number) => {
    setParamsMap((prev) => ({
      ...prev,
      [type]: { ...prev[type], [key]: value },
    }));
  }, []);

  // Build items array for calculation
  const items: PromotionItem[] = useMemo(() => {
    return PROMOTION_CONFIGS.map((cfg) => ({
      id: cfg.type,
      type: cfg.type,
      enabled: !!enabledMap[cfg.type],
      params: paramsMap[cfg.type] ?? {},
    }));
  }, [enabledMap, paramsMap]);

  // Calculate impact
  const impact = useMemo(
    () => calculatePromotionImpact(basePrice, costPrice, items),
    [basePrice, costPrice, items]
  );

  const originalProfit = basePrice - costPrice;
  const profitChange = impact.finalProfit - originalProfit;

  // ── 销量临界分析 ──
  const [dailyVolume, setDailyVolume] = useState(10);

  const volumeAnalysis = useMemo(() => {
    const promoProfitPerUnit = impact.finalProfit;
    const originalDailyProfit = originalProfit * dailyVolume;

    // 保本：总利润 ≥ 0
    const breakEvenVolume = promoProfitPerUnit > 0 ? 1 : promoProfitPerUnit === 0 ? Infinity : -1;

    // 追平原价日盈利
    const matchOriginalDaily = promoProfitPerUnit > 0
      ? Math.ceil(originalDailyProfit / promoProfitPerUnit)
      : -1;

    // 超越原价日盈利
    const exceedOriginalDaily = promoProfitPerUnit > 0
      ? Math.floor(originalDailyProfit / promoProfitPerUnit) + 1
      : -1;

    // 需增加的销量
    const extraVolumeNeeded = matchOriginalDaily > 0 ? Math.max(0, matchOriginalDaily - dailyVolume) : -1;

    return {
      breakEvenVolume,
      matchOriginalDaily,
      exceedOriginalDaily,
      extraVolumeNeeded,
      originalDailyProfit,
      promoProfitPerUnit,
    };
  }, [impact.finalProfit, originalProfit, dailyVolume]);

  // Chart data
  const chartData = useMemo(
    () => [
      { name: '原价利润', value: originalProfit },
      { name: '促销后利润', value: impact.finalProfit },
    ],
    [originalProfit, impact.finalProfit]
  );

  // ── Save scheme ──
  const handleSaveScheme = useCallback(() => {
    if (promotionSchemes.length >= 5) return;
    const schemeItems = items.map((item) => ({
      ...item,
      id: Date.now().toString() + '-' + item.type,
    }));
    addPromotionScheme({
      id: crypto.randomUUID(),
      name: `方案 ${promotionSchemes.length + 1}`,
      items: schemeItems,
      basePrice,
      costPrice,
      createdAt: new Date().toLocaleDateString('zh-CN'),
    });
  }, [items, basePrice, costPrice, promotionSchemes.length, addPromotionScheme]);

  // ── Edit scheme name ──
  const startEditName = useCallback((id: string, currentName: string) => {
    setEditingNameId(id);
    setEditingNameValue(currentName);
  }, []);

  const confirmEditName = useCallback(
    (id: string) => {
      updatePromotionScheme(id, { name: editingNameValue });
      setEditingNameId(null);
    },
    [editingNameValue, updatePromotionScheme]
  );

  // ── Margin rate color ──
  const marginColor = (rate: number) => {
    if (rate >= 0.25) return 'text-emerald-600';
    if (rate >= 0.15) return 'text-amber-600';
    return 'text-red-600';
  };

  const marginBg = (rate: number) => {
    if (rate >= 0.25) return 'bg-emerald-50 border-emerald-200';
    if (rate >= 0.15) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  // ── Risk messages ──
  const getRiskMessages = (marginRate: number): string[] => {
    const risks: string[] = [];
    if (marginRate < 0) risks.push('正在亏本销售！');
    else if (marginRate < 0.05) risks.push('利润极低，无法覆盖运营成本');
    else if (marginRate < warningThreshold) risks.push('利润偏低，叠加其他费用可能亏损');
    return risks;
  };

  const riskMessages = getRiskMessages(impact.finalMarginRate);

  // ── Suggestions ──
  const getSuggestions = (): string[] => {
    const suggestions: string[] = [];
    const enabledCount = items.filter((i) => i.enabled).length;
    if (enabledCount > 2) suggestions.push('建议减少促销叠加层数');
    if (impact.finalMarginRate < warningThreshold) suggestions.push('建议提高基准售价');
    return suggestions;
  };

  const suggestions = getSuggestions();

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          Section 1: 促销工具箱
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-sky-900 mb-4">促销工具箱</h2>

        {/* 产品选择器 */}
        <div className="mb-5 rounded-xl bg-sky-50 border border-sky-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-sky-900">选择产品（可多选）</h3>
            {selectedCount > 0 && (
              <button
                onClick={() => setSelectedQuantities({})}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                清空选择
              </button>
            )}
          </div>
          {/* 分类Tab */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {PRODUCT_PRESETS.map((cat) => {
              const catSelectedCount = cat.products.filter((p) => (selectedQuantities[p.name] || 0) > 0).length;
              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative',
                    selectedCategory === cat.category
                      ? 'bg-sky-900 text-white'
                      : 'bg-white text-sky-700 hover:bg-sky-100 border border-sky-200'
                  )}
                >
                  {cat.label}
                  {catSelectedCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {catSelectedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* 产品列表 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {PRODUCT_PRESETS.find((c) => c.category === selectedCategory)?.products.map((p) => {
              const qty = selectedQuantities[p.name] || 0;
              const isSelected = qty > 0;
              const margin = p.basePrice > 0 ? ((p.basePrice - p.costPrice) / p.basePrice * 100) : 0;
              return (
                <div
                  key={p.name}
                  className={cn(
                    'text-left rounded-lg p-2.5 border-2 transition-all duration-150 relative',
                    isSelected
                      ? 'border-sky-500 bg-sky-50 shadow-md'
                      : 'border-sky-100 bg-white hover:border-sky-300 hover:shadow-sm cursor-pointer'
                  )}
                  onClick={() => !isSelected && toggleProduct(p.name)}
                >
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  )}
                  <p className={cn(
                    'text-sm font-semibold truncate pr-5',
                    isSelected ? 'text-sky-900' : 'text-sky-800'
                  )}>
                    {p.name}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-base font-bold font-mono text-amber-600">¥{p.basePrice}</span>
                    <span className="text-xs text-sky-400">{p.unit}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-sky-400">成本 ¥{p.costPrice}</span>
                    <span className={cn(
                      'text-xs font-semibold',
                      margin >= 40 ? 'text-emerald-600' : margin >= 25 ? 'text-amber-600' : 'text-red-500'
                    )}>
                      {margin.toFixed(0)}%
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{p.description}</p>
                  )}
                  {/* 数量选择器 */}
                  {isSelected && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-sky-200" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setProductQuantity(p.name, qty - 1)}
                        className="w-6 h-6 rounded-md bg-sky-200 hover:bg-sky-300 text-sky-700 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={qty}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v > 0) setProductQuantity(p.name, v);
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-10 h-6 text-center text-sm font-mono font-bold border border-sky-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setProductQuantity(p.name, qty + 1)}
                        className="w-6 h-6 rounded-md bg-sky-200 hover:bg-sky-300 text-sky-700 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                      <span className="text-xs text-sky-500 ml-0.5">{p.unit.replace('元/', '')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* 已选产品汇总 */}
          {selectedProductsList.length > 0 && (
            <div className="mt-4 bg-white rounded-lg border border-sky-200 p-3">
              <h4 className="text-xs font-bold text-sky-900 mb-2">已选产品（{selectedProductsList.length}种）</h4>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedProductsList.map((p) => {
                  const qty = selectedQuantities[p.name] || 1;
                  return (
                    <span
                      key={p.name}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-100 text-sky-800 text-xs font-medium"
                    >
                      {p.name}
                      <span className="text-sky-500">×{qty}{p.unit.replace('元/', '')}</span>
                      <span className="text-amber-600 font-mono">¥{(p.basePrice * qty).toFixed(0)}</span>
                      <button
                        onClick={() => toggleProduct(p.name)}
                        className="text-sky-400 hover:text-red-500 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-sky-700">合计售价：<span className="font-bold font-mono text-amber-600">¥{autoBasePrice}</span></span>
                <span className="text-sky-700">合计成本：<span className="font-bold font-mono text-sky-900">¥{autoCostPrice}</span></span>
                <span className={cn(
                  'font-semibold',
                  autoBasePrice > 0 && ((autoBasePrice - autoCostPrice) / autoBasePrice * 100) >= 40 ? 'text-emerald-600' :
                  autoBasePrice > 0 && ((autoBasePrice - autoCostPrice) / autoBasePrice * 100) >= 25 ? 'text-amber-600' : 'text-red-500'
                )}>
                  综合毛利率：{autoBasePrice > 0 ? ((autoBasePrice - autoCostPrice) / autoBasePrice * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Base price inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <InputField label="基准售价(元)" value={basePrice} onChange={setBasePrice} min={0} step={1} unit="元" />
          <InputField label="成本价(元)" value={costPrice} onChange={setCostPrice} min={0} step={1} unit="元" />
        </div>

        {/* Promotion cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PROMOTION_CONFIGS.map((cfg) => {
            const enabled = !!enabledMap[cfg.type];
            const Icon = cfg.icon;
            const currentParams = paramsMap[cfg.type] ?? {};

            // Calculate individual impact
            const singleItem: PromotionItem = {
              id: cfg.type,
              type: cfg.type,
              enabled: true,
              params: currentParams,
            };
            const singleImpact = calculatePromotionImpact(basePrice, costPrice, [singleItem]);
            const singleProfitChange = singleImpact.finalProfit - originalProfit;

            return (
              <div
                key={cfg.type}
                className={cn(
                  'rounded-xl border-2 p-4 transition-all duration-200',
                  enabled
                    ? 'border-sky-400 bg-sky-50 shadow-md'
                    : 'border-gray-200 bg-gray-50 opacity-70'
                )}
              >
                {/* Header: toggle + icon + name */}
                <div className="flex items-center justify-between mb-2">
                  <div className="relative group">
                    <div className="flex items-center gap-2 cursor-default">
                      <Icon className={cn('h-5 w-5', enabled ? 'text-sky-600' : 'text-gray-400')} />
                      <span className={cn('font-semibold text-sm', enabled ? 'text-sky-900' : 'text-gray-500')}>
                        {cfg.name}
                      </span>
                    </div>
                    <div className="absolute top-full left-0 mt-1 z-10 hidden group-hover:block whitespace-nowrap">
                      <div className="bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                        {cfg.formula}
                      </div>
                      <div className="absolute -top-1 left-4 w-2 h-2 bg-sky-900 rotate-45" />
                    </div>
                  </div>
                  <Toggle checked={enabled} onChange={() => togglePromotion(cfg.type)} />
                </div>

                {/* Params (only when enabled) */}
                {enabled && (
                  <div className="mt-3 space-y-2">
                    {cfg.type === 'buyGive' ? (
                      <>
                        {cfg.params.map((p) => (
                          <InputField
                            key={p.key}
                            label={p.label}
                            value={currentParams[p.key] ?? p.defaultValue}
                            onChange={(v) => updateParam(cfg.type, p.key, v)}
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            unit={p.unit}
                          />
                        ))}
                        {/* 赠品产品选择 */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-sky-700">选择赠品</label>
                          <select
                            value={buyGiveGiftProduct}
                            onChange={(e) => setBuyGiveGiftProduct(e.target.value)}
                            className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="">-- 请选择赠品 --</option>
                            {PRODUCT_PRESETS.map((cat) => (
                              <optgroup key={cat.category} label={cat.label}>
                                {cat.products.map((p) => (
                                  <option key={p.name} value={p.name}>
                                    {p.name} (成本 ¥{p.costPrice}/{p.unit.replace('元/', '')})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {buyGiveGiftProduct && (() => {
                            const gp = allProducts.find((p) => p.name === buyGiveGiftProduct);
                            if (!gp) return null;
                            const giveQty = currentParams.giveQuantity ?? 1;
                            const buyQty = currentParams.buyQuantity ?? 1;
                            const costImpact = (giveQty * gp.costPrice) / buyQty;
                            return (
                              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-amber-700">赠品：</span>
                                  <span className="font-medium text-amber-900">{gp.name} ¥{gp.costPrice}/{gp.unit.replace('元/', '')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-amber-700">赠品总成本：</span>
                                  <span className="font-mono font-bold text-amber-900">¥{(giveQty * gp.costPrice).toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-amber-700">分摊到每份成本：</span>
                                  <span className="font-mono font-bold text-red-600">+¥{costImpact.toFixed(1)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      cfg.params.map((p) => (
                        <InputField
                          key={p.key}
                          label={p.label}
                          value={currentParams[p.key] ?? p.defaultValue}
                          onChange={(v) => updateParam(cfg.type, p.key, v)}
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          unit={p.unit}
                        />
                      ))
                    )}

                    {/* Profit impact */}
                    <div
                      className={cn(
                        'mt-2 rounded-lg px-3 py-2 text-sm font-medium text-center',
                        singleProfitChange >= 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      利润影响: {singleProfitChange >= 0 ? '+' : ''}
                      {formatCurrency(singleProfitChange)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          Section 2: 组合分析
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-sky-900 mb-4">组合分析</h2>

        {/* Stats dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl bg-gradient-to-br from-sky-900 to-sky-800 text-white p-4">
            <p className="text-xs opacity-80">原价利润</p>
            <p className="text-xl font-bold font-mono mt-1">{formatCurrency(originalProfit)}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-sky-700 to-sky-600 text-white p-4">
            <p className="text-xs opacity-80">促销后售价</p>
            <p className="text-xl font-bold font-mono mt-1">{formatCurrency(impact.finalPrice)}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-sky-700 to-sky-600 text-white p-4">
            <p className="text-xs opacity-80">促销后利润</p>
            <p className="text-xl font-bold font-mono mt-1">{formatCurrency(impact.finalProfit)}</p>
          </div>
          <div className={cn('rounded-xl border-2 p-4', marginBg(impact.finalMarginRate))}>
            <p className="text-xs opacity-70">促销后毛利率</p>
            <p className={cn('text-xl font-bold font-mono mt-1', marginColor(impact.finalMarginRate))}>
              {formatPercent(impact.finalMarginRate * 100)}
            </p>
          </div>
          <div
            className={cn(
              'rounded-xl border-2 p-4',
              profitChange >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            )}
          >
            <p className="text-xs opacity-70">利润变化</p>
            <p
              className={cn(
                'text-xl font-bold font-mono mt-1',
                profitChange >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {profitChange >= 0 ? '+' : ''}
              {formatCurrency(profitChange)}
            </p>
          </div>
        </div>

        {/* ── 销量临界分析 ── */}
        <div className="mb-6 rounded-xl border-2 border-sky-200 bg-sky-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="relative group">
              <h3 className="text-sm font-bold text-sky-900">销量临界分析</h3>
              <div className="absolute top-full left-0 mt-1 z-10 hidden group-hover:block whitespace-nowrap">
                <div className="bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg space-y-1">
                  <p>保本销量 = 1份（促销后单份利润 &gt; 0）</p>
                  <p>追平销量 = ⌈原价日利润 ÷ 促销后单份利润⌉</p>
                  <p>超越销量 = ⌊原价日利润 ÷ 促销后单份利润⌋ + 1</p>
                </div>
                <div className="absolute -top-1 left-4 w-2 h-2 bg-sky-900 rotate-45" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-sky-600">原价日均销量</label>
              <input
                type="number"
                min={1}
                max={9999}
                value={dailyVolume}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v > 0) setDailyVolume(v);
                }}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-16 h-7 text-center text-sm font-mono font-bold border border-sky-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-sky-500">份/天</span>
            </div>
          </div>

          {/* 三大指标卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {/* 保本 */}
            <div className={cn(
              'rounded-lg border-2 p-3',
              volumeAnalysis.breakEvenVolume === 1
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            )}>
              <p className="text-xs font-medium opacity-70">保本最少销量</p>
              <p className={cn(
                'text-2xl font-bold font-mono mt-1',
                volumeAnalysis.breakEvenVolume === 1 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {volumeAnalysis.breakEvenVolume === 1
                  ? '1 份'
                  : volumeAnalysis.breakEvenVolume === -1
                    ? '无法保本'
                    : '—'}
              </p>
              <p className="text-xs mt-1 opacity-60">
                {volumeAnalysis.breakEvenVolume === 1
                  ? '促销后单份利润 > 0，卖1份即不亏'
                  : '每卖1份亏损 ¥' + Math.abs(volumeAnalysis.promoProfitPerUnit).toFixed(1)}
              </p>
            </div>

            {/* 追平 */}
            <div className={cn(
              'rounded-lg border-2 p-3',
              volumeAnalysis.matchOriginalDaily > 0
                ? volumeAnalysis.extraVolumeNeeded === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
                : 'bg-red-50 border-red-200'
            )}>
              <p className="text-xs font-medium opacity-70">追平原价日盈利</p>
              <p className={cn(
                'text-2xl font-bold font-mono mt-1',
                volumeAnalysis.matchOriginalDaily > 0
                  ? volumeAnalysis.extraVolumeNeeded === 0
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                  : 'text-red-600'
              )}>
                {volumeAnalysis.matchOriginalDaily > 0
                  ? `${volumeAnalysis.matchOriginalDaily} 份`
                  : '无法追平'}
              </p>
              <p className="text-xs mt-1 opacity-60">
                {volumeAnalysis.matchOriginalDaily > 0
                  ? `原价卖${dailyVolume}份利润 ¥${volumeAnalysis.originalDailyProfit.toFixed(0)}`
                  : '促销后单份利润 ≤ 0'}
              </p>
            </div>

            {/* 超越 */}
            <div className={cn(
              'rounded-lg border-2 p-3',
              volumeAnalysis.exceedOriginalDaily > 0
                ? 'bg-sky-50 border-sky-200'
                : 'bg-red-50 border-red-200'
            )}>
              <p className="text-xs font-medium opacity-70">超越原价日盈利</p>
              <p className={cn(
                'text-2xl font-bold font-mono mt-1',
                volumeAnalysis.exceedOriginalDaily > 0 ? 'text-sky-600' : 'text-red-600'
              )}>
                {volumeAnalysis.exceedOriginalDaily > 0
                  ? `${volumeAnalysis.exceedOriginalDaily} 份`
                  : '无法超越'}
              </p>
              <p className="text-xs mt-1 opacity-60">
                {volumeAnalysis.exceedOriginalDaily > 0
                  ? `需比原价多卖 ${volumeAnalysis.extraVolumeNeeded} 份/天`
                  : '促销后单份利润 ≤ 0'}
              </p>
            </div>
          </div>

          {/* 对比明细 */}
          {volumeAnalysis.promoProfitPerUnit > 0 && (
            <div className="rounded-lg bg-white border border-sky-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-100/60">
                    <th className="text-left py-2 px-3 text-sky-900 font-semibold text-xs">对比项</th>
                    <th className="text-right py-2 px-3 text-sky-900 font-semibold text-xs">原价</th>
                    <th className="text-right py-2 px-3 text-sky-900 font-semibold text-xs">促销后</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-sky-100">
                    <td className="py-2 px-3 text-sky-700">单份利润</td>
                    <td className="py-2 px-3 text-right font-mono text-sky-900">¥{originalProfit.toFixed(1)}</td>
                    <td className={cn('py-2 px-3 text-right font-mono', profitChange >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      ¥{impact.finalProfit.toFixed(1)}
                    </td>
                  </tr>
                  <tr className="border-t border-sky-100">
                    <td className="py-2 px-3 text-sky-700">日均销量</td>
                    <td className="py-2 px-3 text-right font-mono text-sky-900">{dailyVolume} 份</td>
                    <td className="py-2 px-3 text-right font-mono text-amber-600">
                      {volumeAnalysis.matchOriginalDaily} 份
                      {volumeAnalysis.extraVolumeNeeded > 0 && (
                        <span className="text-red-500 text-xs ml-1">(+{volumeAnalysis.extraVolumeNeeded})</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-t border-sky-100">
                    <td className="py-2 px-3 text-sky-700">日利润</td>
                    <td className="py-2 px-3 text-right font-mono text-sky-900">¥{volumeAnalysis.originalDailyProfit.toFixed(0)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600">
                      ¥{(volumeAnalysis.matchOriginalDaily * volumeAnalysis.promoProfitPerUnit).toFixed(0)}
                    </td>
                  </tr>
                  <tr className="border-t border-sky-100">
                    <td className="py-2 px-3 text-sky-700">日营收</td>
                    <td className="py-2 px-3 text-right font-mono text-sky-900">¥{(basePrice * dailyVolume).toFixed(0)}</td>
                    <td className="py-2 px-3 text-right font-mono text-sky-900">
                      ¥{(impact.finalPrice * volumeAnalysis.matchOriginalDaily).toFixed(0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="w-full h-64 md:h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#0c4a6e', fontSize: 13 }} />
              <YAxis tick={{ fill: '#0c4a6e', fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #bae6fd' }}
              />
              <Legend />
              <Bar dataKey="value" name="利润(元)" fill="#0284c7" radius={[6, 6, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Loss Warning ── */}
        {impact.finalMarginRate < warningThreshold && (
          <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 md:p-5 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
              <span className="text-base md:text-lg font-bold text-red-700">
                ⚠️ 促销叠加预警：当前组合毛利率低于安全线！
              </span>
            </div>

            {/* Enabled promotions list */}
            {impact.breakdown.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-red-600 mb-1">已启用促销及影响：</p>
                <ul className="space-y-1">
                  {impact.breakdown.map((b, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {b.name}：{formatCurrency(b.impact)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk items */}
            {riskMessages.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-red-600 mb-1">风险提示：</p>
                <ul className="space-y-1">
                  {riskMessages.map((msg, i) => (
                    <li key={i} className="text-sm text-red-800 font-semibold">
                      🔴 {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">改进建议：</p>
                <ul className="space-y-1">
                  {suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-amber-800">
                      💡 {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          Section 3: 方案对比
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl shadow-md p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-sky-900">方案对比</h2>
          <button
            onClick={handleSaveScheme}
            disabled={promotionSchemes.length >= 5}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
              promotionSchemes.length >= 5
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800'
            )}
          >
            <Save className="h-4 w-4" />
            保存当前方案
            {promotionSchemes.length >= 5 && <span className="text-xs">(已满)</span>}
          </button>
        </div>

        {promotionSchemes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">暂无保存的方案，点击上方按钮保存当前配置</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-sky-200">
                  <th className="text-left py-3 px-3 text-sky-900 font-semibold">方案名称</th>
                  <th className="text-left py-3 px-3 text-sky-900 font-semibold">启用促销</th>
                  <th className="text-right py-3 px-3 text-sky-900 font-semibold">最终售价</th>
                  <th className="text-right py-3 px-3 text-sky-900 font-semibold">最终利润</th>
                  <th className="text-right py-3 px-3 text-sky-900 font-semibold">毛利率</th>
                  <th className="text-center py-3 px-3 text-sky-900 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {promotionSchemes.map((scheme) => {
                  const schemeImpact = calculatePromotionImpact(scheme.basePrice, scheme.costPrice, scheme.items);
                  const enabledNames = scheme.items
                    .filter((i) => i.enabled)
                    .map((i) => {
                      const cfg = PROMOTION_CONFIGS.find((c) => c.type === i.type);
                      return cfg?.name ?? i.type;
                    });

                  return (
                    <tr key={scheme.id} className="border-b border-sky-100 hover:bg-sky-50/50 transition-colors">
                      <td className="py-3 px-3">
                        {editingNameId === scheme.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              className="w-24 rounded border border-sky-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmEditName(scheme.id);
                                if (e.key === 'Escape') setEditingNameId(null);
                              }}
                            />
                            <button
                              onClick={() => confirmEditName(scheme.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingNameId(null)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-sky-900">{scheme.name}</span>
                            <button
                              onClick={() => startEditName(scheme.id, scheme.name)}
                              className="p-1 text-gray-400 hover:text-sky-600 transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {enabledNames.length > 0 ? (
                            enabledNames.map((name) => (
                              <span
                                key={name}
                                className="inline-block rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-xs font-medium"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">无</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sky-900">
                        {formatCurrency(schemeImpact.finalPrice)}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-3 text-right font-mono',
                          schemeImpact.finalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {formatCurrency(schemeImpact.finalProfit)}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-3 text-right font-mono font-semibold',
                          marginColor(schemeImpact.finalMarginRate)
                        )}
                      >
                        {formatPercent(schemeImpact.finalMarginRate * 100)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => removePromotionScheme(scheme.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="删除方案"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
