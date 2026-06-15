import { useState, useMemo } from 'react';
import {
  Truck,
  Phone,
  Star,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Package,
  Fish,
  MapPin,
  Clock,
  DollarSign,
  Info,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { cn } from '@/lib/utils';

// ─── 供应商数据类型 ────────────────────────────────────────────────────────────

interface SupplierProduct {
  name: string;         // 品名
  category: 'seafood' | 'frozen' | 'dry' | 'processed' | 'seasoning';
  price: number;        // 进货价(元/斤)
  unit: string;         // 单位
  minOrder: number;     // 最小起订量
  quality: 'A' | 'B' | 'C';  // 品质等级
}

interface Supplier {
  id: string;
  name: string;               // 供应商名称
  contact: string;            // 联系人
  phone: string;              // 电话
  address: string;            // 地址
  source: 'wholesale' | 'direct' | 'farm' | 'market';  // 来源类型
  paymentTerms: 'cash' | 'weekly' | 'monthly';         // 结算方式
  deliveryTime: string;       // 配送时间
  rating: number;             // 评分 1-5
  notes: string;              // 备注
  products: SupplierProduct[];
  isActive: boolean;          // 是否合作中
}

// ─── 预置供应商数据 ────────────────────────────────────────────────────────────

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: '1',
    name: '石家庄海鲜批发市场-老王',
    contact: '王建国',
    phone: '138-0000-1111',
    address: '石家庄市桥西区海鲜批发市场A区12号',
    source: 'wholesale',
    paymentTerms: 'weekly',
    deliveryTime: '凌晨3:00-5:00',
    rating: 4.5,
    notes: '合作3年，活鲜品质稳定，死货率低。每周二、五送货。',
    isActive: true,
    products: [
      { name: '基围虾', category: 'seafood', price: 28, unit: '元/斤', minOrder: 20, quality: 'A' },
      { name: '鲈鱼', category: 'seafood', price: 12, unit: '元/斤', minOrder: 10, quality: 'A' },
      { name: '花甲', category: 'seafood', price: 6, unit: '元/斤', minOrder: 30, quality: 'A' },
      { name: '螃蟹(公)', category: 'seafood', price: 35, unit: '元/斤', minOrder: 10, quality: 'A' },
      { name: '海虹', category: 'seafood', price: 3, unit: '元/斤', minOrder: 50, quality: 'B' },
    ],
  },
  {
    id: '2',
    name: '青岛冷链直供-海达',
    contact: '李海达',
    phone: '159-0000-2222',
    address: '青岛市城阳区海鲜冷链物流园',
    source: 'direct',
    paymentTerms: 'monthly',
    deliveryTime: '隔日达',
    rating: 4.0,
    notes: '冻品为主，冷链运输，量大从优。月结需签合同。',
    isActive: true,
    products: [
      { name: '虾滑', category: 'frozen', price: 18, unit: '元/斤', minOrder: 10, quality: 'A' },
      { name: '扇贝肉', category: 'frozen', price: 22, unit: '元/斤', minOrder: 5, quality: 'A' },
      { name: '小龙虾', category: 'frozen', price: 15, unit: '元/斤', minOrder: 30, quality: 'B' },
      { name: '鳗鱼段', category: 'frozen', price: 32, unit: '元/斤', minOrder: 5, quality: 'A' },
      { name: '海参(即食)', category: 'frozen', price: 45, unit: '元/个', minOrder: 20, quality: 'A' },
    ],
  },
  {
    id: '3',
    name: '魏县本地鱼塘-张庄',
    contact: '张大叔',
    phone: '137-0000-3333',
    address: '魏县张庄乡鱼塘',
    source: 'farm',
    paymentTerms: 'cash',
    deliveryTime: '电话通知，当天送达',
    rating: 3.5,
    notes: '本地淡水鱼，鲶鱼、草鱼为主。现结，价格随行就市。',
    isActive: true,
    products: [
      { name: '鲶鱼', category: 'seafood', price: 7, unit: '元/斤', minOrder: 20, quality: 'B' },
      { name: '草鱼', category: 'seafood', price: 6, unit: '元/斤', minOrder: 20, quality: 'B' },
      { name: '鲤鱼', category: 'seafood', price: 5, unit: '元/斤', minOrder: 20, quality: 'C' },
    ],
  },
  {
    id: '4',
    name: '郑州干货调料行',
    contact: '赵经理',
    phone: '186-0000-4444',
    address: '郑州市万邦国际农产品物流城',
    source: 'wholesale',
    paymentTerms: 'monthly',
    deliveryTime: '3-5天物流',
    rating: 4.0,
    notes: '干货调料齐全，价格有优势。月结额度5000元。',
    isActive: true,
    products: [
      { name: '鱼干', category: 'dry', price: 15, unit: '元/斤', minOrder: 10, quality: 'A' },
      { name: '鱼排(半成品)', category: 'dry', price: 20, unit: '元/斤', minOrder: 5, quality: 'A' },
      { name: '烤鱼酱料', category: 'seasoning', price: 8, unit: '元/包', minOrder: 20, quality: 'A' },
      { name: '捞汁调料', category: 'seasoning', price: 12, unit: '元/瓶', minOrder: 10, quality: 'A' },
      { name: '生腌料', category: 'seasoning', price: 10, unit: '元/瓶', minOrder: 10, quality: 'B' },
    ],
  },
  {
    id: '5',
    name: '邯郸水产批发-老陈',
    contact: '陈老板',
    phone: '150-0000-5555',
    address: '邯郸市丛台区水产批发市场',
    source: 'market',
    paymentTerms: 'cash',
    deliveryTime: '当天自提',
    rating: 3.0,
    notes: '距离近，应急补货用。品种一般，价格中等。需自提。',
    isActive: true,
    products: [
      { name: '花甲', category: 'seafood', price: 7, unit: '元/斤', minOrder: 20, quality: 'B' },
      { name: '大虾', category: 'seafood', price: 35, unit: '元/斤', minOrder: 5, quality: 'B' },
      { name: '鲍鱼', category: 'seafood', price: 5, unit: '元/个', minOrder: 20, quality: 'C' },
    ],
  },
  {
    id: '6',
    name: '连云港海鲜直发',
    contact: '孙海',
    phone: '189-0000-6666',
    address: '连云港市赣榆区海头镇',
    source: 'direct',
    paymentTerms: 'weekly',
    deliveryTime: '次日达(冷链)',
    rating: 4.8,
    notes: '渔船直供，品质最好但价格偏高。适合高端品类。周结。',
    isActive: false,
    products: [
      { name: '帝王蟹', category: 'seafood', price: 120, unit: '元/斤', minOrder: 2, quality: 'A' },
      { name: '大龙虾', category: 'seafood', price: 95, unit: '元/斤', minOrder: 2, quality: 'A' },
      { name: '生蚝', category: 'seafood', price: 8, unit: '元/个', minOrder: 30, quality: 'A' },
      { name: '八爪鱼', category: 'seafood', price: 25, unit: '元/斤', minOrder: 5, quality: 'A' },
    ],
  },
];

// ─── 常量映射 ──────────────────────────────────────────────────────────────────

const sourceLabels: Record<Supplier['source'], string> = {
  wholesale: '批发市场',
  direct: '产地直供',
  farm: '养殖基地',
  market: '本地市场',
};

const sourceColors: Record<Supplier['source'], string> = {
  wholesale: 'bg-blue-100 text-blue-700',
  direct: 'bg-emerald-100 text-emerald-700',
  farm: 'bg-amber-100 text-amber-700',
  market: 'bg-purple-100 text-purple-700',
};

const paymentLabels: Record<Supplier['paymentTerms'], string> = {
  cash: '现结',
  weekly: '周结',
  monthly: '月结',
};

const categoryLabels: Record<SupplierProduct['category'], string> = {
  seafood: '水产活鲜',
  frozen: '冻品',
  dry: '干货',
  processed: '加工品',
  seasoning: '调料',
};

const categoryColors: Record<SupplierProduct['category'], string> = {
  seafood: 'bg-sky-100 text-sky-700',
  frozen: 'bg-blue-100 text-blue-700',
  dry: 'bg-amber-100 text-amber-700',
  processed: 'bg-emerald-100 text-emerald-700',
  seasoning: 'bg-orange-100 text-orange-700',
};

const qualityColors: Record<SupplierProduct['quality'], string> = {
  A: 'text-emerald-600',
  B: 'text-amber-600',
  C: 'text-red-600',
};

// ─── 公式提示组件 ──────────────────────────────────────────────────────────────

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

// ─── 供应商看板 ────────────────────────────────────────────────────────────────

export default function SupplierBoard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<Supplier['source'] | 'all'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // 新增供应商表单
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '', contact: '', phone: '', address: '',
    source: 'wholesale', paymentTerms: 'cash', deliveryTime: '',
    rating: 4, notes: '', isActive: true, products: [],
  });

  // 筛选后的供应商
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (filterSource !== 'all' && s.source !== filterSource) return false;
      if (filterActive === 'active' && !s.isActive) return false;
      if (filterActive === 'inactive' && s.isActive) return false;
      if (searchText && !s.name.includes(searchText) && !s.contact.includes(searchText) && !s.phone.includes(searchText)) return false;
      return true;
    });
  }, [suppliers, filterSource, filterActive, searchText]);

  // 统计数据
  const stats = useMemo(() => {
    const active = suppliers.filter((s) => s.isActive);
    const allProducts = suppliers.flatMap((s) => s.products);
    const avgRating = active.length > 0 ? active.reduce((s, sp) => s + sp.rating, 0) / active.length : 0;
    const cashCount = active.filter((s) => s.paymentTerms === 'cash').length;
    const creditCount = active.filter((s) => s.paymentTerms !== 'cash').length;
    return {
      total: suppliers.length,
      activeCount: active.length,
      productCount: allProducts.length,
      avgRating: avgRating,
      cashCount,
      creditCount,
    };
  }, [suppliers]);

  // 星级渲染
  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              'h-4 w-4',
              i <= full ? 'text-amber-400 fill-amber-400' :
              i === full + 1 && half ? 'text-amber-400 fill-amber-200' :
              'text-gray-300'
            )}
          />
        ))}
        <span className="ml-1 text-xs font-mono text-sky-900">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // 添加供应商
  const handleAdd = () => {
    if (!newSupplier.name || !newSupplier.contact || !newSupplier.phone) return;
    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplier.name || '',
      contact: newSupplier.contact || '',
      phone: newSupplier.phone || '',
      address: newSupplier.address || '',
      source: newSupplier.source || 'wholesale',
      paymentTerms: newSupplier.paymentTerms || 'cash',
      deliveryTime: newSupplier.deliveryTime || '',
      rating: newSupplier.rating || 4,
      notes: newSupplier.notes || '',
      isActive: true,
      products: [],
    };
    setSuppliers((prev) => [...prev, supplier]);
    setShowAddForm(false);
    setNewSupplier({ name: '', contact: '', phone: '', address: '', source: 'wholesale', paymentTerms: 'cash', deliveryTime: '', rating: 4, notes: '', isActive: true, products: [] });
  };

  // 删除供应商
  const handleDelete = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  // 切换合作状态
  const toggleActive = (id: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ===== 统计卡片 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative group">
          <StatCard
            title="供应商总数"
            value={stats.total}
            unit="家"
            icon={<Truck className="h-5 w-5" />}
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
            <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
              所有录入的供应商数量（含已停用）
            </div>
          </div>
        </div>
        <div className="relative group">
          <StatCard
            title="合作中"
            value={stats.activeCount}
            unit="家"
            icon={<Check className="h-5 w-5" />}
            variant="success"
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
            <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
              isActive = true 的供应商数量
            </div>
          </div>
        </div>
        <div className="relative group">
          <StatCard
            title="供应品类"
            value={stats.productCount}
            unit="种"
            icon={<Package className="h-5 w-5" />}
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
            <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
              所有供应商产品去重后的品类总数
            </div>
          </div>
        </div>
        <div className="relative group">
          <StatCard
            title="平均评分"
            value={stats.avgRating.toFixed(1)}
            icon={<Star className="h-5 w-5" />}
            variant={stats.avgRating >= 4 ? 'success' : 'warning'}
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 hidden group-hover:block">
            <div className="relative bg-sky-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-900 rotate-45" />
              合作中供应商评分的算术平均值
            </div>
          </div>
        </div>
      </div>

      {/* ===== 结算方式提醒 ===== */}
      <div className="flex items-center gap-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
        <div className="flex-1">
          <span className="text-amber-800 font-medium">结算方式分布：<FormulaTip formula="现结 = 货到付款；账期 = 周结或月结，需签合同明确额度" /></span>
          <span className="text-amber-700">现结 {stats.cashCount} 家</span>
          <span className="mx-2 text-amber-400">|</span>
          <span className="text-amber-700">账期(周结/月结) {stats.creditCount} 家</span>
          <span className="mx-2 text-amber-400">|</span>
          <span className="text-amber-600 text-xs">初期坚持现结或周结，对信誉好的大客户可谈月结，但必须有明确额度和合同</span>
        </div>
      </div>

      {/* ===== 筛选和搜索 ===== */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-sky-100">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* 搜索 */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="搜索供应商名称、联系人、电话..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 pl-9 text-sm text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-400" />
          </div>

          {/* 来源筛选 */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'wholesale', 'direct', 'farm', 'market'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setFilterSource(val)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  filterSource === val
                    ? 'bg-sky-900 text-white'
                    : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                )}
              >
                {val === 'all' ? '全部来源' : sourceLabels[val]}
              </button>
            ))}
          </div>

          {/* 状态筛选 */}
          <div className="flex gap-1.5">
            {(['all', 'active', 'inactive'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setFilterActive(val)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  filterActive === val
                    ? 'bg-sky-900 text-white'
                    : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                )}
              >
                {val === 'all' ? '全部状态' : val === 'active' ? '合作中' : '已停用'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 添加供应商按钮 ===== */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            showAddForm
              ? 'bg-gray-200 text-gray-600'
              : 'bg-sky-900 text-white hover:bg-sky-800'
          )}
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? '取消添加' : '添加供应商'}
        </button>
      </div>

      {/* ===== 添加供应商表单 ===== */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-5 shadow-md border-2 border-sky-200">
          <h3 className="text-base font-bold text-sky-900 mb-4">新增供应商</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">供应商名称 *</label>
              <input
                type="text"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="如：石家庄海鲜批发-老王"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">联系人 *</label>
              <input
                type="text"
                value={newSupplier.contact}
                onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">电话 *</label>
              <input
                type="text"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">地址</label>
              <input
                type="text"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">来源类型</label>
              <select
                value={newSupplier.source}
                onChange={(e) => setNewSupplier({ ...newSupplier, source: e.target.value as Supplier['source'] })}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="wholesale">批发市场</option>
                <option value="direct">产地直供</option>
                <option value="farm">养殖基地</option>
                <option value="market">本地市场</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">结算方式</label>
              <select
                value={newSupplier.paymentTerms}
                onChange={(e) => setNewSupplier({ ...newSupplier, paymentTerms: e.target.value as Supplier['paymentTerms'] })}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="cash">现结</option>
                <option value="weekly">周结</option>
                <option value="monthly">月结</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">配送时间</label>
              <input
                type="text"
                value={newSupplier.deliveryTime}
                onChange={(e) => setNewSupplier({ ...newSupplier, deliveryTime: e.target.value })}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="如：凌晨3:00-5:00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-900 mb-1">评分</label>
              <input
                type="number"
                value={newSupplier.rating}
                onChange={(e) => setNewSupplier({ ...newSupplier, rating: parseFloat(e.target.value) || 0 })}
                min={1}
                max={5}
                step={0.5}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-sky-900 mb-1">备注</label>
              <textarea
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="合作情况、注意事项等"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAdd}
              disabled={!newSupplier.name || !newSupplier.contact || !newSupplier.phone}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                newSupplier.name && newSupplier.contact && newSupplier.phone
                  ? 'bg-sky-900 text-white hover:bg-sky-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              <Check className="h-4 w-4" />
              确认添加
            </button>
          </div>
        </div>
      )}

      {/* ===== 供应商列表 ===== */}
      <div className="space-y-4">
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-16 text-sky-400">
            <Fish className="h-16 w-16 mx-auto mb-3 opacity-40" />
            <p className="text-base">暂无匹配的供应商</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => {
            const isExpanded = expandedId === supplier.id;
            return (
              <div
                key={supplier.id}
                className={cn(
                  'bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all duration-200',
                  supplier.isActive ? 'border-sky-100' : 'border-gray-200 opacity-75'
                )}
              >
                {/* 供应商头部 */}
                <div
                  className="px-4 md:px-5 py-4 cursor-pointer hover:bg-sky-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn(
                          'text-base font-bold',
                          supplier.isActive ? 'text-sky-900' : 'text-gray-500'
                        )}>
                          {supplier.name}
                        </h3>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', sourceColors[supplier.source])}>
                          {sourceLabels[supplier.source]}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          supplier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        )}>
                          {supplier.isActive ? '合作中' : '已停用'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-sky-700 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {supplier.contact} {supplier.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {paymentLabels[supplier.paymentTerms]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {supplier.deliveryTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {supplier.address}
                        </span>
                      </div>
                      <div className="mt-1.5">{renderStars(supplier.rating)}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleActive(supplier.id); }}
                        className={cn(
                          'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                          supplier.isActive
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        )}
                      >
                        {supplier.isActive ? '停用' : '启用'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-sky-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-sky-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 展开详情：产品列表 + 备注 */}
                {isExpanded && (
                  <div className="border-t border-sky-100 px-4 md:px-5 py-4 bg-sky-50/30">
                    {/* 产品列表 */}
                    {supplier.products.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-sky-900 mb-2 flex items-center gap-1.5">
                          <Package className="h-4 w-4" />
                          供应产品 ({supplier.products.length})
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-sky-200 text-sky-800">
                                <th className="text-left py-2 px-3 font-medium">品名</th>
                                <th className="text-left py-2 px-3 font-medium">分类</th>
                                <th className="text-right py-2 px-3 font-medium">进货价</th>
                                <th className="text-right py-2 px-3 font-medium">起订量</th>
                                <th className="text-center py-2 px-3 font-medium">品质</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supplier.products.map((product, idx) => (
                                <tr key={idx} className="border-b border-sky-100 hover:bg-white/50">
                                  <td className="py-2 px-3 font-medium text-sky-900">{product.name}</td>
                                  <td className="py-2 px-3">
                                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', categoryColors[product.category])}>
                                      {categoryLabels[product.category]}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-sky-900">
                                    {product.price}<span className="text-xs text-sky-500">/{product.unit}</span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-sky-700">
                                    {product.minOrder}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={cn('font-bold text-sm', qualityColors[product.quality])}>
                                      {product.quality}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 备注 */}
                    {supplier.notes && (
                      <div className="rounded-lg bg-white p-3 border border-sky-100">
                        <p className="text-xs text-sky-500 mb-1 font-medium">备注</p>
                        <p className="text-sm text-sky-800">{supplier.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ===== 采购注意事项 ===== */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-sky-100">
        <h3 className="text-sm font-bold text-sky-900 mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          采购注意事项
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-sky-800">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 shrink-0">1.</span>
            <span>初期坚持<strong>现结或周结</strong>，对信誉好的大客户可谈月结，但必须有明确额度和合同</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 shrink-0">2.</span>
            <span>提供<strong>装袋清单，一单一清</strong>，避免账目混乱</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 shrink-0">3.</span>
            <span>进货时<strong>挑出货品</strong>，不精神的坚决不卖，拍视频留证</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 shrink-0">4.</span>
            <span>前期减少高端海鲜备货，<strong>主打平价亲民款</strong>，降低损耗风险</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 shrink-0">5.</span>
            <span>每天早上检查鱼缸盐度、温度、死亡情况，<strong>死货及时分拣处理</strong></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 shrink-0">6.</span>
            <span>当天卖不完的，直接做捞汁、烤鱼、预制菜，<strong>绝不养到第二天再赌</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
