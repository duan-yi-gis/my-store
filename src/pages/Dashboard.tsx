import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
  LineChart,
} from 'recharts';
import {
  Fish,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Plus,
  AlertTriangle,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/StatCard';
import { InputField } from '@/components/InputField';
import {
  calculateFixedCosts,
  calculateCompositeMargin,
  calculateBreakEven,
  formatCurrency,
  formatPercent,
} from '@/utils/calculations';

// ─── Sample data generator ────────────────────────────────────────────────────
function generateSampleRecords() {
  const records: Array<{
    date: string;
    revenue: number;
    cost: number;
    loss: number;
    newMembers: number;
    orders: number;
  }> = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseRevenue = isWeekend
      ? 2500 + Math.random() * 1000
      : 1500 + Math.random() * 1500;
    const revenue = Math.round(baseRevenue);
    const cost = Math.round(revenue * (0.55 + Math.random() * 0.1));
    const loss = Math.round(revenue * (0.02 + Math.random() * 0.06));
    const newMembers = Math.floor(Math.random() * 6);
    const orders = 20 + Math.floor(Math.random() * 41);

    records.push({ date: dateStr, revenue, cost, loss, newMembers, orders });
  }
  return records;
}

// ─── Custom tooltip for charts ────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (name: string, value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-sky-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm border border-sky-700">
      <p className="mb-1 font-semibold text-sky-200">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {formatter ? formatter(entry.name, entry.value) : `${entry.name}: ${entry.value.toLocaleString()}`}
        </p>
      ))}
    </div>
  );
}

// ─── Formula tooltip ────────────────────────────────────────────────────────
const FormulaTip = ({ formula }: { formula: string }) => (
  <div className="relative inline-flex group ml-1">
    <Info className="h-4 w-4 text-sky-400 cursor-help" />
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 hidden group-hover:block">
      <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap max-w-[280px]">
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
        {formula}
      </div>
    </div>
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    dailyRecords,
    addDailyRecord,
    removeDailyRecord,
    investmentParams,
    marginRates,
    salesRatios,
  } = useStore();

  // Form state
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formRevenue, setFormRevenue] = useState(0);
  const [formCost, setFormCost] = useState(0);
  const [formLoss, setFormLoss] = useState(0);
  const [formNewMembers, setFormNewMembers] = useState(0);
  const [formOrders, setFormOrders] = useState(0);

  // Derived calculations
  const fixedCosts = useMemo(() => calculateFixedCosts(investmentParams), [investmentParams]);
  const compositeMargin = useMemo(
    () => calculateCompositeMargin(marginRates, salesRatios),
    [marginRates, salesRatios]
  );
  const breakEven = useMemo(
    () => calculateBreakEven(fixedCosts, compositeMargin),
    [fixedCosts, compositeMargin]
  );

  // Sorted records
  const sortedRecords = useMemo(
    () => [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRecords]
  );

  // Revenue metrics
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = sortedRecords.find((r) => r.date === today);

  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    return start.toISOString().slice(0, 10);
  }, []);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);

  const weekRevenue = sortedRecords
    .filter((r) => r.date >= weekStart)
    .reduce((sum, r) => sum + r.revenue, 0);

  const monthRevenue = sortedRecords
    .filter((r) => r.date >= monthStart)
    .reduce((sum, r) => sum + r.revenue, 0);

  const todayOrders = todayRecord?.orders ?? 0;

  // Chart data for revenue tracking
  const revenueChartData = useMemo(
    () =>
      sortedRecords.map((r) => ({
        date: r.date.slice(5),
        营收: r.revenue,
        成本: r.cost,
        净利润: r.revenue - r.cost - r.loss,
      })),
    [sortedRecords]
  );

  // Cost analysis pie data
  const monthlyRent = investmentParams.annualRent / 12;
  const monthlyLabor = investmentParams.monthlyLabor;
  const monthlyUtility = investmentParams.monthlyUtility;
  const monthlyFixedTotal = fixedCosts.monthly;

  const costPieData = [
    { name: '房租', value: monthlyRent, color: '#082f49' },
    { name: '人工', value: monthlyLabor, color: '#f59e0b' },
    { name: '水电', value: monthlyUtility, color: '#10b981' },
  ];

  const utilityEfficiency =
    monthlyUtility > 0
      ? monthRevenue / monthlyUtility
      : 0;

  // Profit trend chart data
  const profitChartData = useMemo(
    () =>
      sortedRecords.map((r) => ({
        date: r.date.slice(5),
        毛利: Math.round(r.revenue * compositeMargin),
        净利: Math.round(r.revenue * compositeMargin - fixedCosts.daily),
      })),
    [sortedRecords, compositeMargin, fixedCosts.daily]
  );

  const avgGrossProfit =
    sortedRecords.length > 0
      ? sortedRecords.reduce((s, r) => s + r.revenue * compositeMargin, 0) / sortedRecords.length
      : 0;

  const avgNetProfit =
    sortedRecords.length > 0
      ? sortedRecords.reduce(
          (s, r) => s + (r.revenue * compositeMargin - fixedCosts.daily),
          0
        ) / sortedRecords.length
      : 0;

  const marginTrend =
    sortedRecords.length >= 2
      ? (() => {
          const recent = sortedRecords.slice(-7);
          const avgRecent =
            recent.reduce((s, r) => s + (r.revenue - r.cost) / r.revenue, 0) / recent.length;
          return avgRecent;
        })()
      : compositeMargin;

  // Loss monitoring
  const lossChartData = useMemo(
    () =>
      sortedRecords.map((r) => ({
        date: r.date.slice(5),
        损耗率: r.revenue > 0 ? parseFloat(((r.loss / r.revenue) * 100).toFixed(2)) : 0,
      })),
    [sortedRecords]
  );

  const latestLossRate =
    sortedRecords.length > 0 && sortedRecords[sortedRecords.length - 1].revenue > 0
      ? (sortedRecords[sortedRecords.length - 1].loss /
          sortedRecords[sortedRecords.length - 1].revenue) *
        100
      : 0;

  const highLossRecords = useMemo(
    () =>
      sortedRecords
        .filter((r) => r.revenue > 0 && (r.loss / r.revenue) * 100 > 5)
        .map((r) => ({
          ...r,
          lossRate: ((r.loss / r.revenue) * 100).toFixed(2),
        })),
    [sortedRecords]
  );

  // Handlers
  const handleAddRecord = () => {
    if (!formDate) return;
    const existing = dailyRecords.find((r) => r.date === formDate);
    if (existing) {
      alert('该日期已有记录，请先删除后再添加');
      return;
    }
    addDailyRecord({
      date: formDate,
      revenue: formRevenue,
      cost: formCost,
      loss: formLoss,
      newMembers: formNewMembers,
      orders: formOrders,
    });
    setFormRevenue(0);
    setFormCost(0);
    setFormLoss(0);
    setFormNewMembers(0);
    setFormOrders(0);
  };

  const handleGenerateSample = () => {
    const records = generateSampleRecords();
    for (const record of records) {
      const exists = dailyRecords.find((r) => r.date === record.date);
      if (!exists) {
        addDailyRecord(record);
      }
    }
  };

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (dailyRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Fish className="h-20 w-20 text-sky-300 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-sky-900 mb-2">暂无经营数据</h2>
        <p className="text-sky-600 mb-6">开始记录第一天的营业情况吧</p>
        <button
          onClick={handleGenerateSample}
          className="flex items-center gap-2 rounded-xl bg-sky-900 px-6 py-3 text-white font-medium shadow-lg hover:bg-sky-800 transition-colors"
        >
          <Sparkles className="h-5 w-5" />
          生成示例数据
        </button>
      </div>
    );
  }

  // ─── Main dashboard ───────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── Section 1: 营收追踪 ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-500" />
          营收追踪
          <FormulaTip formula="营收 = 日营收累计；净利润 = 营收 × 综合毛利率 - 固定成本" />
        </h2>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="relative group">
            <StatCard
              title="今日营收"
              value={todayRecord ? todayRecord.revenue.toLocaleString() : '—'}
              unit="元"
              icon={<DollarSign className="h-5 w-5" />}
              variant="default"
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                当日录入的营收金额
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="本周营收"
              value={weekRevenue.toLocaleString()}
              unit="元"
              icon={<TrendingUp className="h-5 w-5" />}
              variant="success"
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                本周一至今的营收累计
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="本月营收"
              value={monthRevenue.toLocaleString()}
              unit="元"
              icon={<TrendingUp className="h-5 w-5" />}
              variant="success"
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                本月1日至今的营收累计
              </div>
            </div>
          </div>
          <StatCard
            title="订单数"
            value={todayOrders || '—'}
            unit="单"
            icon={<ShoppingCart className="h-5 w-5" />}
            variant="default"
          />
        </div>

        {/* Add record form */}
        <div className="rounded-xl bg-white p-4 shadow-md border border-sky-100 mb-6">
          <h3 className="text-sm font-semibold text-sky-900 mb-3">添加每日记录</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
            <div className="w-full">
              <label className="block text-sm font-medium text-sky-900 mb-1">日期</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sky-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <InputField label="营收" value={formRevenue} onChange={setFormRevenue} unit="元" min={0} />
            <InputField label="成本" value={formCost} onChange={setFormCost} unit="元" min={0} />
            <InputField label="损耗" value={formLoss} onChange={setFormLoss} unit="元" min={0} />
            <InputField label="新增会员" value={formNewMembers} onChange={setFormNewMembers} min={0} />
            <InputField label="订单数" value={formOrders} onChange={setFormOrders} min={0} />
            <button
              onClick={handleAddRecord}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-900 px-4 py-2 text-white text-sm font-medium hover:bg-sky-800 transition-colors h-[38px] mt-auto"
            >
              <Plus className="h-4 w-4" />
              添加记录
            </button>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="rounded-xl bg-white p-4 shadow-md border border-sky-100">
          <h3 className="text-sm font-semibold text-sky-900 mb-3">营收·成本·净利润趋势</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#082f49' }} />
                <YAxis tick={{ fontSize: 11, fill: '#082f49' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={breakEven.daily}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  label={{ value: '日盈亏平衡线', position: 'insideTopRight', fill: '#f59e0b', fontSize: 11 }}
                />
                <Bar dataKey="营收" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="成本" fill="#fbbf24" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="净利润" stroke="#10b981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Record list */}
          {sortedRecords.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-sky-50">
                  <tr className="text-sky-900">
                    <th className="text-left py-1.5 px-2">日期</th>
                    <th className="text-right py-1.5 px-2">营收</th>
                    <th className="text-right py-1.5 px-2">成本</th>
                    <th className="text-right py-1.5 px-2">损耗</th>
                    <th className="text-right py-1.5 px-2">会员</th>
                    <th className="text-right py-1.5 px-2">订单</th>
                    <th className="py-1.5 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...sortedRecords].reverse().map((r) => (
                    <tr key={r.date} className="border-t border-sky-50 text-sky-800 hover:bg-sky-50/50">
                      <td className="py-1.5 px-2">{r.date}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{r.revenue.toLocaleString()}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{r.cost.toLocaleString()}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{r.loss.toLocaleString()}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{r.newMembers}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{r.orders}</td>
                      <td className="py-1.5 px-2">
                        <button
                          onClick={() => removeDailyRecord(r.date)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: 成本分析 ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          成本分析
          <FormulaTip formula="固定成本 = 房租 + 人工 + 水电" />
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie chart */}
          <div className="rounded-xl bg-white p-4 shadow-md border border-sky-100">
            <h3 className="text-sm font-semibold text-sky-900 mb-3">月固定成本构成</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  >
                    {costPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail list */}
          <div className="rounded-xl bg-white p-4 shadow-md border border-sky-100 flex flex-col">
            <h3 className="text-sm font-semibold text-sky-900 mb-3">成本明细</h3>
            <div className="space-y-3 flex-1">
              {costPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-sky-900">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-semibold text-sky-900">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="ml-2 text-xs text-sky-500">
                      {((item.value / monthlyFixedTotal) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-sky-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-sky-900">月固定成本合计</span>
                <span className="text-sm font-mono font-bold text-sky-900">
                  {formatCurrency(monthlyFixedTotal)}
                </span>
              </div>
            </div>

            {/* Utility efficiency */}
            <div className="mt-4 rounded-lg bg-sky-50 p-3 border border-sky-100">
              <p className="text-xs text-sky-600 mb-1">水电效率指标<FormulaTip formula="水电效率 = 月营收 ÷ 月水电费" /></p>
              <p className="text-sm text-sky-900">
                每元水电费产出营收：
                <span className="font-mono font-bold text-emerald-600">
                  {utilityEfficiency.toFixed(2)}
                </span>
                {' '}元
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: 利润趋势 ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          利润趋势
          <FormulaTip formula="毛利 = 营收 × 综合毛利率；净利 = 毛利 - 日固定成本" />
        </h2>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="relative group">
            <StatCard
              title="平均日毛利"
              value={Math.round(avgGrossProfit).toLocaleString()}
              unit="元"
              variant="default"
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                Σ(营收 × 综合毛利率) ÷ 天数
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="平均日净利"
              value={Math.round(avgNetProfit).toLocaleString()}
              unit="元"
              variant={avgNetProfit > 0 ? 'success' : 'danger'}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                Σ(营收 × 综合毛利率 - 日固定成本) ÷ 天数
              </div>
            </div>
          </div>
          <div className="relative group">
            <StatCard
              title="毛利率趋势"
              value={formatPercent(marginTrend * 100)}
              trend={marginTrend >= compositeMargin ? 'up' : 'down'}
              trendValue={
                marginTrend >= compositeMargin
                  ? `高于目标 ${formatPercent(compositeMargin * 100)}`
                  : `低于目标 ${formatPercent(compositeMargin * 100)}`
              }
              variant={marginTrend >= compositeMargin ? 'success' : 'warning'}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
              <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
                近7天平均毛利率 = Σ((营收-成本)/营收) ÷ 7
              </div>
            </div>
          </div>
        </div>

        {/* Area chart */}
        <div className="rounded-xl bg-white p-4 shadow-md border border-sky-100">
          <h3 className="text-sm font-semibold text-sky-900 mb-3">毛利·净利趋势</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#082f49' }} />
                <YAxis tick={{ fontSize: 11, fill: '#082f49' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="毛利"
                  stroke="#38bdf8"
                  fill="#bae6fd"
                  fillOpacity={0.5}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="净利"
                  stroke="#10b981"
                  fill="#a7f3d0"
                  fillOpacity={0.5}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Section 4: 损耗监控 ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          损耗监控
          <FormulaTip formula="损耗率 = 损耗金额 ÷ 营收 × 100%；安全线: 5%" />
        </h2>

        {/* Warning alert */}
        {latestLossRate > 5 && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ 损耗率超标！当前损耗率 {latestLossRate.toFixed(2)}%，超过5%安全线
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-red-600">• 检查鱼缸设备运行状态</p>
                  <p className="text-xs text-red-600">• 优化进货量减少积压</p>
                  <p className="text-xs text-red-600">• 及时处理不活跃海鲜</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Line chart */}
        <div className="rounded-xl bg-white p-4 shadow-md border border-sky-100 mb-6">
          <h3 className="text-sm font-semibold text-sky-900 mb-3">损耗率趋势</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#082f49' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#082f49' }}
                  unit="%"
                  domain={[0, 'auto']}
                />
                <Tooltip content={<ChartTooltip formatter={(n, v) => `${n}: ${v}%`} />} />
                <ReferenceLine
                  y={5}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  label={{ value: '5% 安全线', position: 'insideTopRight', fill: '#f59e0b', fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="损耗率"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* High loss records table */}
        {highLossRecords.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-md border border-sky-100">
            <h3 className="text-sm font-semibold text-sky-900 mb-3">
              损耗超标记录（&gt;5%）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-sky-900 border-b border-sky-100">
                    <th className="text-left py-2 px-3">日期</th>
                    <th className="text-right py-2 px-3">营收</th>
                    <th className="text-right py-2 px-3">损耗金额</th>
                    <th className="text-right py-2 px-3">损耗率</th>
                  </tr>
                </thead>
                <tbody>
                  {highLossRecords.map((r) => (
                    <tr key={r.date} className="border-t border-sky-50 text-red-700 hover:bg-red-50/50">
                      <td className="py-2 px-3">{r.date}</td>
                      <td className="text-right py-2 px-3 font-mono">{r.revenue.toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-mono">{r.loss.toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-mono font-semibold">{r.lossRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Generate sample data button (shown when records exist) */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          onClick={handleGenerateSample}
          className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700 hover:bg-sky-100 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          生成示例数据（补充缺失日期）
        </button>
      </div>
    </div>
  );
}
