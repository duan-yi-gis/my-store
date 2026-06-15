import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Fish,
  Info,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/StatCard';
import { InputField } from '@/components/InputField';
import {
  calculateFixedCosts,
  calculateCompositeMargin,
  calculateBreakEven,
  calculatePaybackPeriod,
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

  // Break-even chart data
  const breakEvenChartData = useMemo(() => {
    const data = [];
    for (let rev = 0; rev <= 5000; rev += 250) {
      const cost = fixedCosts.daily + rev * (1 - compositeMargin);
      const profit = rev - cost;
      data.push({
        revenue: rev,
        营业额: rev,
        成本: cost,
        利润: Math.round(profit),
      });
    }
    return data;
  }, [fixedCosts.daily, compositeMargin]);

  // Payback scenarios
  const scenarios = useMemo(
    () =>
      calculatePaybackPeriod(investmentParams.totalInvestment, fixedCosts.monthly, compositeMargin, {
        conservative: 30000,
        moderate: 50000,
        optimistic: 80000,
      }),
    [investmentParams.totalInvestment, fixedCosts.monthly, compositeMargin]
  );

  const scenarioDetails = useMemo(() => {
    const build = (name: string, monthlyRev: number, months: number, theme: string) => {
      const monthlyProfit = monthlyRev * compositeMargin - fixedCosts.monthly;
      const paybackDate =
        months < Infinity
          ? new Date(Date.now() + months * 30 * 24 * 3600 * 1000).toLocaleDateString('zh-CN')
          : '无法回本';
      return { name, monthlyRev, monthlyProfit, months, paybackDate, theme };
    };
    return [
      build('保守', 30000, scenarios.conservative, 'blue'),
      build('稳健', 50000, scenarios.moderate, 'amber'),
      build('乐观', 80000, scenarios.optimistic, 'emerald'),
    ];
  }, [scenarios, compositeMargin, fixedCosts.monthly]);

  const paybackBarData = useMemo(
    () =>
      scenarioDetails.map((s) => ({
        name: s.name,
        回本月数: s.months < Infinity ? Math.round(s.months * 10) / 10 : 60,
      })),
    [scenarioDetails]
  );

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

  const themeStyles: Record<string, { card: string; header: string; accent: string }> = {
    blue: {
      card: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100',
      header: 'text-blue-800',
      accent: 'bg-blue-500',
    },
    amber: {
      card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100',
      header: 'text-amber-800',
      accent: 'bg-amber-500',
    },
    emerald: {
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100',
      header: 'text-emerald-800',
      accent: 'bg-emerald-500',
    },
  };

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
                { value: 'yearly' as const, label: '年付' },
                { value: 'quarterly' as const, label: '季度付' },
                { value: 'semiannual' as const, label: '半年付' },
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
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-sky-100">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={breakEvenChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis
                dataKey="revenue"
                type="number"
                domain={[0, 5000]}
                tickFormatter={(v: number) => `¥${v}`}
                stroke="#0c4a6e"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(v: number) => `¥${v}`}
                stroke="#0c4a6e"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === '利润') {
                    const prefix = value >= 0 ? '+' : '';
                    return [`${prefix}${formatCurrency(value)}`, name];
                  }
                  return [formatCurrency(value), name];
                }}
                labelFormatter={(label: number) => `日营业额: ¥${label}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #bae6fd' }}
              />
              <Area
                type="monotone"
                dataKey="营业额"
                stroke="#0ea5e9"
                fill="#bae6fd"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="成本"
                stroke="#ef4444"
                fill="#fecaca"
                fillOpacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="利润"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 2"
              />
              <ReferenceLine
                x={breakEven.daily}
                stroke="#0369a1"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `平衡点 ¥${Math.round(breakEven.daily)}`,
                  position: 'top',
                  fill: '#0369a1',
                  fontSize: 12,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-4 text-center text-sm text-sky-800">
            每日营业额需达到{' '}
            <span className="font-bold text-sky-900">
              {formatCurrency(breakEven.daily)}
            </span>{' '}
            才能覆盖固定成本
          </p>
        </div>
      </section>

      {/* ===== Section 3: 回本周期预测 ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-sky-900 mb-4">
          <Clock className="h-5 w-5 text-sky-700" />
          回本周期预测
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {scenarioDetails.map((s) => {
            const style = themeStyles[s.theme];
            return (
              <div
                key={s.name}
                className={`rounded-xl border-2 p-5 ${style.card}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${style.accent}`} />
                  <h3 className={`text-lg font-bold ${style.header}`}>
                    {s.name}方案
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">月营收</span>
                    <span className="font-mono font-semibold text-sky-900">
                      {formatCurrency(s.monthlyRev)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">月净利润<FormulaTip formula="月营收 × 综合毛利率 - 月固定成本" /></span>
                    <span
                      className={`font-mono font-semibold ${
                        s.monthlyProfit > 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(s.monthlyProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">回本周期<FormulaTip formula="总投资 ÷ 月净利润" /></span>
                    <span className="font-mono font-semibold text-sky-900">
                      {s.months < Infinity
                        ? `${Math.round(s.months * 10) / 10} 月`
                        : '无法回本'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">预计回本日期</span>
                    <span className="font-mono font-semibold text-sky-900">
                      {s.paybackDate}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-sky-100">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={paybackBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis dataKey="name" stroke="#0c4a6e" fontSize={13} />
              <YAxis
                stroke="#0c4a6e"
                fontSize={12}
                label={{
                  value: '月',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#0c4a6e',
                }}
              />
              <Tooltip
                formatter={(value: number) => `${value} 月`}
              />
              <Bar
                dataKey="回本月数"
                fill="#0284c7"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ===== Section 4: 现金流分析 ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-sky-900 mb-4">
          <TrendingUp className="h-5 w-5 text-sky-700" />
          现金流分析
          <FormulaTip formula="累计现金流 = 初始现金 + Σ(月营收 × 综合毛利率 - 月固定成本)" />
        </h2>
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-sky-100">
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

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
