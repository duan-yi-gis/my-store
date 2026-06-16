import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Shield,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Fish,
  Info,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';
import { InputField } from '@/components/InputField';
import {
  calculateFixedCosts,
  calculateCompositeMargin,
  calculateBreakEven,
  calculateCashFlow,
  formatCurrency,
  formatPercent,
} from '@/utils/calculations';

function FormulaTip({ formula }: { formula: string }) {
  return (
    <span className="relative inline-flex items-center ml-1 group">
      <Info className="h-3.5 w-3.5 text-gray-400 cursor-default" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 hidden group-hover:block whitespace-nowrap">
        <span className="bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg inline-block">
          {formula}
        </span>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-sky-900 rotate-45" />
      </span>
    </span>
  );
}

export default function Investment() {
  const {
    investmentParams,
    marginRates,
    salesRatios,
    warningThreshold,
    targetAnnualProfit,
    setInvestmentParams,
    setMarginRates,
    setSalesRatios,
    setWarningThreshold,
    setTargetAnnualProfit,
  } = useStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cashFlowRevenue, setCashFlowRevenue] = useState(50000);
  const [cashFlowMonths, setCashFlowMonths] = useState(12);

  // 品类成本拆分
  const categoryBreakdown = useMemo(() => {
    const categories = [
      { key: 'seafood', label: '水产海鲜', margin: marginRates.seafood, ratio: salesRatios.seafood },
      { key: 'chilled', label: '冰鲜', margin: marginRates.chilled, ratio: salesRatios.chilled },
      { key: 'frozen', label: '冻货', margin: marginRates.frozen, ratio: salesRatios.frozen },
      { key: 'dry', label: '干货', margin: marginRates.dry, ratio: salesRatios.dry },
      { key: 'processed', label: '加工', margin: marginRates.processed, ratio: salesRatios.processed },
    ];
    return categories.map((c) => {
      const revenue = cashFlowRevenue * c.ratio;
      const cost = revenue * (1 - c.margin);
      const profit = revenue * c.margin;
      return { ...c, revenue, cost, profit };
    });
  }, [cashFlowRevenue, marginRates, salesRatios]);

  // Derived calculations
  const fixedCosts = useMemo(
    () => calculateFixedCosts(investmentParams),
    [investmentParams]
  );
  const compositeMargin = useMemo(
    () => calculateCompositeMargin(marginRates, salesRatios),
    [marginRates, salesRatios]
  );
  const breakEven = useMemo(
    () => calculateBreakEven(fixedCosts, compositeMargin),
    [fixedCosts, compositeMargin]
  );
  const monthlyRent = investmentParams.annualRent / 12
  const rentDeposit = monthlyRent * investmentParams.rentDepositMonths
  const monthsPerCycle = investmentParams.rentPaymentCycle === 'yearly' ? 12 : investmentParams.rentPaymentCycle === 'quarterly' ? 3 : 6
  const initialRentPayment = monthlyRent * monthsPerCycle
  const remainingCash =
    investmentParams.totalInvestment -
    investmentParams.decoration -
    investmentParams.firstBatchMaterial -
    rentDeposit -
    initialRentPayment;

  // Cash flow data
  const initialOneTimeCost = investmentParams.decoration + investmentParams.firstBatchMaterial + rentDeposit + initialRentPayment
  const cashFlowData = useMemo(
    () => calculateCashFlow(investmentParams.totalInvestment, fixedCosts.monthly, compositeMargin, cashFlowRevenue, cashFlowMonths, initialOneTimeCost),
    [investmentParams.totalInvestment, fixedCosts.monthly, compositeMargin, cashFlowRevenue, cashFlowMonths, initialOneTimeCost]
  );

  const cashFlowMetrics = useMemo(() => {
    const minCumulative = Math.min(...cashFlowData.map((d) => d.cumulative));
    const depletionRisk = minCumulative < 0;
    const safeMonths = cashFlowData.filter((d) => d.cumulative >= 0).length;

    // 亏损临界月营收：月营收 × 综合毛利率 = 月固定成本 时的月营收
    // 即月营收 = 月固定成本 / 综合毛利率（盈亏平衡月营收）
    const breakEvenMonthlyRevenue = compositeMargin > 0 ? fixedCosts.monthly / compositeMargin : Infinity;

    // 考虑初始现金消耗的生存临界值：初始现金能撑N个月，N个月内需达到盈亏平衡
    // 生存月数 = 初始现金 / 月固定成本（假设零营收的最坏情况）
    const startingCash = investmentParams.totalInvestment - initialOneTimeCost;
    const survivalMonthsZeroRevenue = fixedCosts.monthly > 0 ? Math.floor(startingCash / fixedCosts.monthly) : Infinity;

    // 亏损临界月营收（考虑初始现金消耗）：需要在不超出生存月数内回本
    // 即：startingCash + n * (revenue * compositeMargin - fixedCosts) >= 0 对所有 n
    // 最小营收要求：revenue * compositeMargin >= fixedCosts → revenue >= fixedCosts / compositeMargin
    // 但如果 startingCash < 0，则还需要额外营收来弥补初始亏空

    return { depletionRisk, minCumulative, safeMonths, breakEvenMonthlyRevenue, survivalMonthsZeroRevenue, startingCash };
  }, [cashFlowData, compositeMargin, fixedCosts.monthly, investmentParams.totalInvestment, initialOneTimeCost]);

  // Sales ratio validation
  const salesRatioSum =
    salesRatios.seafood + salesRatios.chilled + salesRatios.frozen + salesRatios.dry + salesRatios.processed;
  const salesRatioValid = Math.abs(salesRatioSum - 1) < 0.001;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ===== Section 1: 总投资概览 ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-sky-900 mb-4">
          <DollarSign className="h-5 w-5 text-sky-700" />
          总投资概览
          <FormulaTip formula="固定成本 = 人工 + 水电 + 房租；剩余现金 = 总投资 - 一次性支出" />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <InputField
            label="总投资"
            value={investmentParams.totalInvestment}
            onChange={(v) => setInvestmentParams({ totalInvestment: v })}
            unit="元"
            min={0}
            step={10000}
          />
          <InputField
            label="年房租"
            value={investmentParams.annualRent}
            onChange={(v) => setInvestmentParams({ annualRent: v })}
            unit="元"
            min={0}
            step={5000}
          />
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-sky-900 mb-1">付款周期</label>
            <div className="flex gap-2">
              {([
                { value: 'quarterly' as const, label: '季度付' },
                { value: 'semiannual' as const, label: '半年付' },
                { value: 'yearly' as const, label: '年付' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInvestmentParams({ rentPaymentCycle: opt.value })}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    investmentParams.rentPaymentCycle === opt.value
                      ? 'bg-sky-900 text-white'
                      : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <InputField
            label="押金(月数)"
            value={investmentParams.rentDepositMonths}
            onChange={(v) => setInvestmentParams({ rentDepositMonths: v })}
            unit="个月"
            min={0}
            max={6}
            step={1}
          />
          <InputField
            label="装修费用"
            value={investmentParams.decoration}
            onChange={(v) => setInvestmentParams({ decoration: v })}
            unit="元"
            min={0}
            step={5000}
          />
          <InputField
            label="首批物料"
            value={investmentParams.firstBatchMaterial}
            onChange={(v) => setInvestmentParams({ firstBatchMaterial: v })}
            unit="元"
            min={0}
            step={5000}
          />
          <InputField
            label="月人工"
            value={investmentParams.monthlyLabor}
            onChange={(v) => setInvestmentParams({ monthlyLabor: v })}
            unit="元"
            min={0}
            step={1000}
          />
          <InputField
            label="月水电"
            value={investmentParams.monthlyUtility}
            onChange={(v) => setInvestmentParams({ monthlyUtility: v })}
            unit="元"
            min={0}
            step={500}
          />
        </div>
        <div className="mb-4 px-1 text-sm text-sky-800 bg-sky-50 rounded-lg py-2 px-3">
          首期支付：押金 {investmentParams.rentDepositMonths}个月 + 首期租金 {monthsPerCycle}个月 = ¥{(rentDeposit + initialRentPayment).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative group">
            <StatCard
              title="月固定成本"
              value={formatCurrency(fixedCosts.monthly)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                月人工 + 月水电 + 年房租 ÷ 12
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="日固定成本"
              value={formatCurrency(fixedCosts.daily)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                月固定成本 ÷ 30
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="综合毛利率"
              value={formatPercent(compositeMargin * 100)}
              variant={compositeMargin < warningThreshold ? 'danger' : 'success'}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                水产占比×水产毛利率 + 冰鲜占比×冰鲜毛利率 + 冻货占比×冻货毛利率 + 干货占比×干货毛利率 + 加工占比×加工毛利率
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="剩余现金"
              value={formatCurrency(remainingCash)}
              variant={remainingCash < 0 ? 'danger' : 'default'}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                总投资 - 装修 - 首批物料 - 押金 - 首期租金
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Section 2: 盈亏平衡点 ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-sky-900 mb-4">
          <Shield className="h-5 w-5 text-sky-700" />
          盈亏平衡点
          <FormulaTip formula="盈亏平衡营业额 = 固定成本 ÷ 综合毛利率" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative group">
            <StatCard
              title="日盈亏平衡营业额"
              value={formatCurrency(breakEven.daily)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                日固定成本 ÷ 综合毛利率
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="月盈亏平衡营业额"
              value={formatCurrency(breakEven.monthly)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                月固定成本 ÷ 综合毛利率
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="年盈亏平衡营业额"
              value={formatCurrency(breakEven.annual)}
              icon={<Shield className="h-5 w-5" />}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                月固定成本 × 12 ÷ 综合毛利率
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Section 3: 经营模拟分析 ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-sky-900 mb-4">
          <TrendingUp className="h-5 w-5 text-sky-700" />
          经营模拟分析
          <FormulaTip formula="基于月营收假设，模拟品类成本、纯利润、回本周期和现金流走势" />
        </h2>
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-sky-100">
          {/* ── 营收假设 ── */}
          <h3 className="text-sm font-bold text-sky-800 mb-3 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-sky-600" />
            营收假设
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <label className="text-sm font-medium text-sky-900 shrink-0">
              月营收假设
            </label>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="range"
                min={10000}
                max={150000}
                step={5000}
                value={cashFlowRevenue}
                onChange={(e) => setCashFlowRevenue(Number(e.target.value))}
                className="flex-1 sm:w-48 accent-sky-600"
              />
              <span className="font-mono text-sm font-semibold text-sky-900 min-w-[80px]">
                {formatCurrency(cashFlowRevenue)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-sky-900 shrink-0">预测周期</span>
              {([12, 24, 36] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setCashFlowMonths(m)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    cashFlowMonths === m
                      ? 'bg-sky-900 text-white'
                      : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                  }`}
                >
                  {m}个月
                </button>
              ))}
            </div>
          </div>

          {/* ── 品类成本拆分 ── */}
          <h3 className="text-sm font-bold text-sky-800 mb-3 mt-6 flex items-center gap-1.5">
            <Fish className="h-4 w-4 text-sky-600" />
            品类成本拆分
            <FormulaTip formula="各品类营收 = 月营收 × 销售占比；成本 = 营收 × (1 - 毛利率)" />
          </h3>
          <div className="rounded-lg border border-sky-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sky-50">
                  <th className="text-left py-2 px-3 text-sky-900 font-semibold text-xs">品类</th>
                  <th className="text-right py-2 px-3 text-sky-900 font-semibold text-xs">销售占比</th>
                  <th className="text-right py-2 px-3 text-sky-900 font-semibold text-xs">月营收</th>
                  <th className="text-right py-2 px-3 text-sky-900 font-semibold text-xs">产品成本</th>
                  <th className="text-right py-2 px-3 text-sky-900 font-semibold text-xs">毛利润</th>
                  <th className="text-right py-2 px-3 text-sky-900 font-semibold text-xs">毛利率</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((c) => (
                  <tr key={c.key} className="border-t border-sky-100 hover:bg-sky-50/50 transition-colors">
                    <td className="py-2 px-3 font-medium text-sky-900 text-xs">{c.label}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-sky-600">{(c.ratio * 100).toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-sky-900">¥{c.revenue.toFixed(0)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-red-600">¥{c.cost.toFixed(0)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-emerald-600">¥{c.profit.toFixed(0)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs font-semibold">
                      <span className={
                        c.margin >= 0.4 ? 'text-emerald-600' : c.margin >= 0.25 ? 'text-amber-600' : 'text-red-600'
                      }>
                        {(c.margin * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-sky-300 bg-sky-50/80 font-bold">
                  <td className="py-2 px-3 text-sky-900 text-xs">合计</td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-sky-600">100%</td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-sky-900">¥{cashFlowRevenue.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-red-600">
                    ¥{categoryBreakdown.reduce((s, c) => s + c.cost, 0).toFixed(0)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-emerald-600">
                    ¥{categoryBreakdown.reduce((s, c) => s + c.profit, 0).toFixed(0)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs">
                    <span className={
                      compositeMargin >= 0.4 ? 'text-emerald-600' : compositeMargin >= 0.25 ? 'text-amber-600' : 'text-red-600'
                    }>
                      {(compositeMargin * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── 纯利润分析 ── */}
          <h3 className="text-sm font-bold text-sky-800 mb-3 mt-6 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            纯利润分析
            <FormulaTip formula="月纯利润 = 月毛利润 - 月固定成本；纯利率 = 月纯利润 ÷ 月营收" />
          </h3>
          {(() => {
            const totalGrossProfit = categoryBreakdown.reduce((s, c) => s + c.profit, 0);
            const netProfit = totalGrossProfit - fixedCosts.monthly;
            const netMargin = cashFlowRevenue > 0 ? netProfit / cashFlowRevenue : 0;
            return (
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
                  <p className="text-xs text-sky-600 flex items-center gap-1">
                    月营收<FormulaTip formula="滑块设定的月营收假设" />
                  </p>
                  <p className="text-lg font-bold font-mono text-sky-900 mt-1">¥{cashFlowRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    月毛利润<FormulaTip formula="月营收 × 综合毛利率" />
                  </p>
                  <p className="text-lg font-bold font-mono text-emerald-600 mt-1">¥{totalGrossProfit.toFixed(0)}</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    月固定成本<FormulaTip formula="人工 + 水电 + 房租" />
                  </p>
                  <p className="text-lg font-bold font-mono text-red-600 mt-1">¥{fixedCosts.monthly.toLocaleString()}</p>
                </div>
                <div className={cn(
                  'rounded-lg border-2 p-3',
                  netProfit >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
                )}>
                  <p className={cn('text-xs flex items-center gap-1', netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    月纯利润<FormulaTip formula="月毛利润 - 月固定成本" />
                  </p>
                  <p className={cn('text-lg font-bold font-mono mt-1', netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {netProfit >= 0 ? '+' : ''}¥{netProfit.toFixed(0)}
                  </p>
                  <p className={cn('text-xs mt-0.5 font-medium', netProfit >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                    纯利率 {(netMargin * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── 回本与投资回报 ── */}
          <h3 className="text-sm font-bold text-sky-800 mb-3 mt-6 flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-violet-600" />
            回本与投资回报
            <FormulaTip formula="回本周期 = 总投资 ÷ 月纯利润；年投资回报率 = 年纯利润 ÷ 总投资 × 100%" />
          </h3>
          {(() => {
            const totalGrossProfit = categoryBreakdown.reduce((s, c) => s + c.profit, 0);
            const netProfit = totalGrossProfit - fixedCosts.monthly;
            const paybackMonths = netProfit > 0 ? investmentParams.totalInvestment / netProfit : Infinity;
            const paybackDate = paybackMonths < Infinity
              ? new Date(Date.now() + paybackMonths * 30 * 24 * 3600 * 1000).toLocaleDateString('zh-CN')
              : '无法回本';
            const annualProfit = netProfit * 12;
            const annualROI = investmentParams.totalInvestment > 0 ? (annualProfit / investmentParams.totalInvestment * 100) : 0;
            return (
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={cn(
                  'rounded-lg border-2 p-3',
                  paybackMonths < Infinity ? 'bg-sky-50 border-sky-300' : 'bg-red-50 border-red-300'
                )}>
                  <p className={cn('text-xs flex items-center gap-1', paybackMonths < Infinity ? 'text-sky-600' : 'text-red-600')}>
                    回本周期<FormulaTip formula="总投资 ÷ 月纯利润" />
                  </p>
                  <p className={cn('text-lg font-bold font-mono mt-1', paybackMonths < Infinity ? 'text-sky-900' : 'text-red-600')}>
                    {paybackMonths < Infinity ? `${(Math.round(paybackMonths * 10) / 10)} 月` : '无法回本'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {paybackMonths < Infinity ? `预计 ${paybackDate}` : '月纯利润 ≤ 0'}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    年纯利润<FormulaTip formula="月纯利润 × 12" />
                  </p>
                  <p className={cn('text-lg font-bold font-mono mt-1', annualProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {annualProfit >= 0 ? '+' : ''}¥{annualProfit.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
                  <p className="text-xs text-violet-600 flex items-center gap-1">
                    年投资回报率<FormulaTip formula="年纯利润 ÷ 总投资 × 100%" />
                  </p>
                  <p className={cn('text-lg font-bold font-mono mt-1', annualROI >= 0 ? 'text-violet-600' : 'text-red-600')}>
                    {annualROI.toFixed(1)}%
                  </p>
                </div>
                <div className={cn(
                  'rounded-lg border-2 p-3',
                  paybackMonths <= 12 ? 'bg-emerald-50 border-emerald-300' :
                  paybackMonths <= 24 ? 'bg-amber-50 border-amber-300' :
                  paybackMonths < Infinity ? 'bg-red-50 border-red-300' :
                  'bg-red-50 border-red-300'
                )}>
                  <p className="text-xs text-gray-600">回本评估</p>
                  <p className={cn(
                    'text-lg font-bold mt-1',
                    paybackMonths <= 12 ? 'text-emerald-600' :
                    paybackMonths <= 24 ? 'text-amber-600' :
                    paybackMonths < Infinity ? 'text-red-600' : 'text-red-600'
                  )}>
                    {paybackMonths <= 12 ? '优秀' :
                     paybackMonths <= 24 ? '良好' :
                     paybackMonths < Infinity ? '偏长' : '不可行'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {paybackMonths <= 12 ? '1年内回本' :
                     paybackMonths <= 24 ? '1-2年回本' :
                     paybackMonths < Infinity ? '超过2年' : '需提高营收或降本'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── 现金流走势 ── */}
          <h3 className="text-sm font-bold text-sky-800 mb-3 mt-6 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            现金流走势
            <FormulaTip formula="累计现金流 = 初始现金 + Σ(月营收 × 综合毛利率 - 月固定成本)" />
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis
                dataKey="month"
                stroke="#0c4a6e"
                fontSize={12}
                label={{
                  value: '月',
                  position: 'insideBottomRight',
                  offset: -5,
                  fill: '#0c4a6e',
                }}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 10000
                    ? `¥${(v / 10000).toFixed(1)}万`
                    : `¥${v}`
                }
                stroke="#0c4a6e"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label: number) => `第 ${label} 月`}
              />
              <ReferenceLine
                y={0}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: '盈亏线',
                  position: 'right',
                  fill: '#ef4444',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#0284c7' }}
                name="累计现金流"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* ── 风险预警 ── */}
          <h3 className="text-sm font-bold text-sky-800 mb-3 mt-6 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            风险预警
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`flex items-center gap-3 rounded-lg p-3 ${
                cashFlowMetrics.depletionRisk
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-emerald-50 border border-emerald-200'
              }`}
            >
              {cashFlowMetrics.depletionRisk ? (
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              )}
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  资金枯竭风险点
                  <FormulaTip formula="当累计现金流 &lt; 0 时，存在资金枯竭风险" />
                </p>
                <p
                  className={`text-sm font-semibold ${
                    cashFlowMetrics.depletionRisk
                      ? 'text-red-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {cashFlowMetrics.depletionRisk
                    ? `最低余额 ${formatCurrency(cashFlowMetrics.minCumulative)}`
                    : '无枯竭风险'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg p-3 bg-sky-50 border border-sky-200">
              <Shield className="h-5 w-5 text-sky-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  安全运营月数
                  <FormulaTip formula="累计现金流始终 ≥ 0 的连续月数" />
                </p>
                <p className="text-sm font-semibold text-sky-900">
                  {cashFlowMetrics.safeMonths} / {cashFlowMonths} 月
                </p>
              </div>
            </div>
          </div>

          {/* 亏损临界值分析 */}
          <div className="mt-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <h4 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-3">
              <AlertTriangle className="h-4 w-4" />
              亏损临界值分析
              <FormulaTip formula="亏损临界月营收 = 月固定成本 ÷ 综合毛利率；零营收生存月数 = 初始现金 ÷ 月固定成本" />
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-amber-600 mb-1">亏损临界月营收</p>
                <p className={`text-lg font-bold font-mono ${
                  cashFlowRevenue < cashFlowMetrics.breakEvenMonthlyRevenue ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {formatCurrency(cashFlowMetrics.breakEvenMonthlyRevenue)}
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  {cashFlowRevenue < cashFlowMetrics.breakEvenMonthlyRevenue
                    ? `当前假设 ¥${cashFlowRevenue.toLocaleString()} 低于临界值，将亏损`
                    : `当前假设 ¥${cashFlowRevenue.toLocaleString()} 高于临界值，可盈利`}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-amber-600 mb-1">初始可用现金</p>
                <p className={`text-lg font-bold font-mono ${
                  cashFlowMetrics.startingCash < 0 ? 'text-red-600' : 'text-sky-900'
                }`}>
                  {formatCurrency(cashFlowMetrics.startingCash)}
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  = 总投资 - 一次性支出（装修+物料+押金+首期租金）
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-amber-600 mb-1">零营收生存月数</p>
                <p className={`text-lg font-bold font-mono ${
                  cashFlowMetrics.survivalMonthsZeroRevenue < 4 ? 'text-red-600' : 'text-amber-700'
                }`}>
                  {cashFlowMetrics.survivalMonthsZeroRevenue === Infinity ? '∞' : `${cashFlowMetrics.survivalMonthsZeroRevenue} 个月`}
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  完全无营收情况下，现金可维持的时间
                </p>
              </div>
            </div>
            {cashFlowMetrics.startingCash < 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                初始现金为负！一次性支出已超过总投资，需要追加投资或削减开支。
              </div>
            )}
            {cashFlowMetrics.startingCash >= 0 && cashFlowMetrics.survivalMonthsZeroRevenue < 4 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-100 rounded-lg px-3 py-2 border border-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                生存缓冲不足4个月！建议预留至少4个月的固定成本作为应急资金（约 {formatCurrency(fixedCosts.monthly * 4)}）。
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Settings: 毛利率设置 ===== */}
      <section className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-sky-900 hover:bg-sky-50 transition-colors"
        >
          <span className="flex items-center gap-2 font-bold">
            <Fish className="h-5 w-5 text-sky-700" />
            毛利率设置
          </span>
          {settingsOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
        {settingsOpen && (
          <div className="px-5 pb-5 space-y-5 border-t border-sky-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <InputField
                label="水产海鲜毛利率"
                value={marginRates.seafood * 100}
                onChange={(v) => setMarginRates({ seafood: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="冰鲜毛利率"
                value={marginRates.chilled * 100}
                onChange={(v) => setMarginRates({ chilled: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="冻货毛利率"
                value={marginRates.frozen * 100}
                onChange={(v) => setMarginRates({ frozen: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="干货毛利率"
                value={marginRates.dry * 100}
                onChange={(v) => setMarginRates({ dry: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="加工毛利率"
                value={marginRates.processed * 100}
                onChange={(v) => setMarginRates({ processed: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <InputField
                label="水产销售占比"
                value={salesRatios.seafood * 100}
                onChange={(v) => setSalesRatios({ seafood: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="冰鲜销售占比"
                value={salesRatios.chilled * 100}
                onChange={(v) => setSalesRatios({ chilled: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="冻货销售占比"
                value={salesRatios.frozen * 100}
                onChange={(v) => setSalesRatios({ frozen: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="干货销售占比"
                value={salesRatios.dry * 100}
                onChange={(v) => setSalesRatios({ dry: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="加工销售占比"
                value={salesRatios.processed * 100}
                onChange={(v) => setSalesRatios({ processed: v / 100 })}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
            </div>
            {!salesRatioValid && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                销售占比之和必须为 100%（当前合计: {formatPercent(salesRatioSum * 100)}）
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="预警线"
                value={warningThreshold * 100}
                onChange={(v) => setWarningThreshold(v / 100)}
                unit="%"
                min={0}
                max={100}
                step={1}
              />
              <InputField
                label="目标年利润"
                value={targetAnnualProfit}
                onChange={(v) => setTargetAnnualProfit(v)}
                unit="元"
                min={0}
                step={10000}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
