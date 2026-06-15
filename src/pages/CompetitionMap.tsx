import { useState, useMemo, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Tooltip as LeafletTooltip } from 'react-leaflet'
import { Shield, AlertTriangle, Eye, Fish, Info, MapPin, Building2, Search } from 'lucide-react'

// Fix leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ─── Haversine 距离计算 ────────────────────────────────────────────────────────
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // 地球半径(km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ─── 数据类型 ──────────────────────────────────────────────────────────────────

interface CompetitorPOI {
  id: string
  name: string
  type: 'aquatic' | 'restaurant' | 'market' | 'stall'
  address: string
  threat: 'high' | 'medium' | 'low'
  lat: number
  lng: number
  description: string
}

interface CommunityPOI {
  id: string
  name: string
  lat: number
  lng: number
  households: number   // 户数
  type: 'residential' | 'village'
}

// ─── 竞争者数据 ────────────────────────────────────────────────────────────────

const competitors: CompetitorPOI[] = [
  { id: '1', name: '魏县水产批发', type: 'aquatic', address: '魏城镇魏都大街', threat: 'high', lat: 36.361, lng: 114.935, description: '老牌水产店，价格低，客源稳定' },
  { id: '2', name: '鲜之海水产', type: 'aquatic', address: '魏城镇龙乡街', threat: 'high', lat: 36.355, lng: 114.928, description: '品种齐全，有固定批发客户' },
  { id: '3', name: '海味鲜水产', type: 'aquatic', address: '德政镇', threat: 'medium', lat: 36.340, lng: 114.910, description: '镇上唯一水产店，覆盖周边村庄' },
  { id: '4', name: '渔港水产', type: 'aquatic', address: '北皋镇', threat: 'low', lat: 36.380, lng: 114.960, description: '小型水产店，品种较少' },
  { id: '5', name: '海边人家海鲜酒楼', type: 'restaurant', address: '魏城镇魏都大街', threat: 'medium', lat: 36.365, lng: 114.940, description: '中高端海鲜餐饮，自带采购渠道' },
  { id: '6', name: '渔家乐海鲜大排档', type: 'restaurant', address: '魏城镇建设路', threat: 'low', lat: 36.358, lng: 114.932, description: '大排档形式，价格亲民' },
  { id: '7', name: '海之味餐厅', type: 'restaurant', address: '双井镇', threat: 'low', lat: 36.325, lng: 114.895, description: '小型海鲜餐厅' },
  { id: '8', name: '魏县中心市场', type: 'market', address: '魏城镇市场街', threat: 'high', lat: 36.363, lng: 114.930, description: '县城最大综合市场，内有3-4个水产摊位' },
  { id: '9', name: '东市场', type: 'market', address: '魏城镇东环路', threat: 'medium', lat: 36.368, lng: 114.945, description: '综合市场，水产摊位2个' },
  { id: '10', name: '德政镇集市', type: 'market', address: '德政镇', threat: 'low', lat: 36.338, lng: 114.908, description: '乡镇集市，逢集日有水产摊' },
  { id: '11', name: '早市水产摊', type: 'stall', address: '魏城镇政府路', threat: 'medium', lat: 36.360, lng: 114.925, description: '早市临时摊位，价格极低' },
  { id: '12', name: '路边鱼摊', type: 'stall', address: '北皋镇路口', threat: 'low', lat: 36.378, lng: 114.955, description: '路边临时摊，淡水鱼为主' },
]

// ─── 小区/村庄数据 ─────────────────────────────────────────────────────────────

const communities: CommunityPOI[] = [
  // 县城小区
  { id: 'c1', name: '魏都花园', lat: 36.362, lng: 114.933, households: 1200, type: 'residential' },
  { id: 'c2', name: '龙乡小区', lat: 36.356, lng: 114.929, households: 800, type: 'residential' },
  { id: 'c3', name: '建设路小区', lat: 36.359, lng: 114.937, households: 600, type: 'residential' },
  { id: 'c4', name: '和谐家园', lat: 36.366, lng: 114.928, households: 950, type: 'residential' },
  { id: 'c5', name: '阳光小区', lat: 36.353, lng: 114.935, households: 500, type: 'residential' },
  { id: 'c6', name: '金穗小区', lat: 36.364, lng: 114.942, households: 700, type: 'residential' },
  { id: 'c7', name: '东方小区', lat: 36.370, lng: 114.938, households: 450, type: 'residential' },
  { id: 'c8', name: '幸福小区', lat: 36.357, lng: 114.922, households: 650, type: 'residential' },
  // 乡镇村庄
  { id: 'c9', name: '德政村', lat: 36.339, lng: 114.909, households: 350, type: 'village' },
  { id: 'c10', name: '双井村', lat: 36.326, lng: 114.896, households: 280, type: 'village' },
  { id: 'c11', name: '北皋村', lat: 36.379, lng: 114.958, households: 400, type: 'village' },
  { id: 'c12', name: '张二庄村', lat: 36.345, lng: 114.920, households: 220, type: 'village' },
  { id: 'c13', name: '泊口村', lat: 36.335, lng: 114.915, households: 300, type: 'village' },
  { id: 'c14', name: '野胡拐村', lat: 36.350, lng: 114.945, households: 180, type: 'village' },
]

// ─── 配置 ──────────────────────────────────────────────────────────────────────

const typeConfig: Record<CompetitorPOI['type'], { label: string; color: string }> = {
  aquatic: { label: '水产店', color: '#ef4444' },
  restaurant: { label: '餐饮', color: '#f97316' },
  market: { label: '市场', color: '#3b82f6' },
  stall: { label: '路边摊', color: '#9ca3af' },
}

const threatConfig: Record<CompetitorPOI['threat'], { label: string; color: string; icon: typeof Shield }> = {
  high: { label: '高', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
  medium: { label: '中', color: 'text-amber-600 bg-amber-50', icon: Eye },
  low: { label: '低', color: 'text-green-600 bg-green-50', icon: Shield },
}

const communityTypeConfig: Record<CommunityPOI['type'], { label: string; color: string }> = {
  residential: { label: '小区', color: '#8b5cf6' },
  village: { label: '村庄', color: '#22c55e' },
}

const createColoredIcon = (color: string, label?: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${label || ''}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const communityIcon = (type: CommunityPOI['type']) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:${communityTypeConfig[type].color};width:20px;height:20px;border-radius:4px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:bold;">${type === 'residential' ? '住' : '村'}</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const selectedPointIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:#f59e0b;width:28px;height:28px;border-radius:50%;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

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
)

// ─── 地图点击选点组件 ──────────────────────────────────────────────────────────

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────

export default function CompetitionMap() {
  // 选址点
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null)
  // 搜索半径(km)，空值=全域
  const [radiusInput, setRadiusInput] = useState<string>('3')
  const radius = radiusInput.trim() === '' ? null : parseFloat(radiusInput)

  // 筛选
  const [activeTypes, setActiveTypes] = useState<Set<CompetitorPOI['type']>>(
    new Set(['aquatic', 'restaurant', 'market', 'stall'])
  )
  const [activeThreats, setActiveThreats] = useState<Set<CompetitorPOI['threat']>>(
    new Set(['high', 'medium', 'low'])
  )
  const [activeCommunityTypes, setActiveCommunityTypes] = useState<Set<CommunityPOI['type']>>(
    new Set(['residential', 'village'])
  )

  const toggleType = (type: CompetitorPOI['type']) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const toggleThreat = (threat: CompetitorPOI['threat']) => {
    setActiveThreats(prev => {
      const next = new Set(prev)
      if (next.has(threat)) next.delete(threat)
      else next.add(threat)
      return next
    })
  }

  const toggleCommunityType = (type: CommunityPOI['type']) => {
    setActiveCommunityTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // 计算距离
  const getDist = useCallback((lat: number, lng: number) => {
    if (!selectedPoint) return null
    return getDistance(selectedPoint.lat, selectedPoint.lng, lat, lng)
  }, [selectedPoint])

  // 筛选竞争者
  const filteredCompetitors = useMemo(() => {
    return competitors
      .filter(c => activeTypes.has(c.type) && activeThreats.has(c.threat))
      .filter(c => {
        if (!selectedPoint || radius === null) return true
        const dist = getDist(c.lat, c.lng)
        return dist !== null && dist <= radius
      })
      .map(c => ({ ...c, distance: getDist(c.lat, c.lng) }))
  }, [activeTypes, activeThreats, selectedPoint, radius, getDist])

  // 筛选小区
  const filteredCommunities = useMemo(() => {
    return communities
      .filter(c => activeCommunityTypes.has(c.type))
      .filter(c => {
        if (!selectedPoint || radius === null) return true
        const dist = getDist(c.lat, c.lng)
        return dist !== null && dist <= radius
      })
      .map(c => ({ ...c, distance: getDist(c.lat, c.lng) }))
  }, [activeCommunityTypes, selectedPoint, radius, getDist])

  // 统计
  const totalHouseholds = filteredCommunities.reduce((s, c) => s + c.households, 0)
  const highThreatCount = filteredCompetitors.filter(c => c.threat === 'high').length

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedPoint({ lat, lng })
  }, [])

  const handleClearPoint = useCallback(() => {
    setSelectedPoint(null)
  }, [])

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
            <Fish className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500 flex items-center gap-1">周边竞争者<FormulaTip formula="筛选半径内的竞争对手数量" /></div>
            <div className="text-2xl font-bold text-sky-900">{filteredCompetitors.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500 flex items-center gap-1">高威胁<FormulaTip formula="威胁等级为'高'的竞争者" /></div>
            <div className="text-2xl font-bold text-red-600">{highThreatCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500 flex items-center gap-1">周边小区/村<FormulaTip formula="筛选半径内的居民区数量" /></div>
            <div className="text-2xl font-bold text-violet-600">{filteredCommunities.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500 flex items-center gap-1">覆盖户数<FormulaTip formula="半径内小区总户数" /></div>
            <div className="text-2xl font-bold text-amber-600">{totalHouseholds.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 选址控制 + 筛选 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        {/* 选址点 + 半径 */}
        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">选址点</span>
          </div>
          {selectedPoint ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-200">
                {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
              </span>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">半径</label>
                <input
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.5}
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="全域"
                  className="w-16 h-7 text-center text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-400">km（空=全域）</span>
              </div>
              <button
                onClick={handleClearPoint}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                清除选点
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">点击地图选择选址点</span>
          )}
        </div>

        {/* 竞争类型筛选 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">竞争类型</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(typeConfig) as CompetitorPOI['type'][]).map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                  activeTypes.has(type)
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
                style={activeTypes.has(type) ? { background: typeConfig[type].color } : undefined}
              >
                {typeConfig[type].label}
              </button>
            ))}
          </div>
        </div>

        {/* 威胁等级 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">威胁等级</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(threatConfig) as CompetitorPOI['threat'][]).map(threat => (
              <button
                key={threat}
                onClick={() => toggleThreat(threat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                  activeThreats.has(threat)
                    ? `${threatConfig[threat].color} border-transparent`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {threatConfig[threat].label}
              </button>
            ))}
          </div>
        </div>

        {/* 居民区类型 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">居民区类型</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(communityTypeConfig) as CommunityPOI['type'][]).map(type => (
              <button
                key={type}
                onClick={() => toggleCommunityType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                  activeCommunityTypes.has(type)
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
                style={activeCommunityTypes.has(type) ? { background: communityTypeConfig[type].color } : undefined}
              >
                {communityTypeConfig[type].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 地图 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="h-[400px] md:h-[500px]">
          <MapContainer
            center={[36.36, 114.93]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onSelect={handleMapClick} />

            {/* 选址点 + 半径圆 */}
            {selectedPoint && (
              <>
                <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={selectedPointIcon}>
                  <Popup>
                    <div className="text-center">
                      <div className="font-bold text-amber-600 text-sm">📍 选址点</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        半径内：{filteredCompetitors.length}竞争者 / {filteredCommunities.length}居民区
                      </div>
                    </div>
                  </Popup>
                </Marker>
                {radius !== null && radius > 0 && (
                  <Circle
                    center={[selectedPoint.lat, selectedPoint.lng]}
                    radius={radius * 1000}
                    pathOptions={{
                      color: '#f59e0b',
                      fillColor: '#fbbf24',
                      fillOpacity: 0.08,
                      weight: 2,
                      dashArray: '8 4',
                    }}
                  >
                    <LeafletTooltip permanent direction="center" className="radius-label">
                      {radius}km
                    </LeafletTooltip>
                  </Circle>
                )}
              </>
            )}

            {/* 竞争者标记 */}
            {filteredCompetitors.map(c => (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={createColoredIcon(typeConfig[c.type].color)}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="font-bold text-gray-900">{c.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: typeConfig[c.type].color }}
                      />
                      <span className="text-xs text-gray-600">{typeConfig[c.type].label}</span>
                      <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${threatConfig[c.threat].color}`}>
                        {threatConfig[c.threat].label}威胁
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">📍 {c.address}</div>
                    {c.distance !== null && c.distance !== undefined && (
                      <div className="text-xs text-amber-600 mt-1 font-mono">
                        距选址点 {c.distance.toFixed(2)} km
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mt-1 border-t pt-1">{c.description}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 小区标记 */}
            {filteredCommunities.map(c => (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={communityIcon(c.type)}
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <div className="font-bold text-gray-900">{c.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded"
                        style={{ background: communityTypeConfig[c.type].color }}
                      />
                      <span className="text-xs text-gray-600">{communityTypeConfig[c.type].label}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">住户：{c.households} 户</div>
                    {c.distance !== null && c.distance !== undefined && (
                      <div className="text-xs text-amber-600 mt-1 font-mono">
                        距选址点 {c.distance.toFixed(2)} km
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* 周边详情列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 竞争者列表 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">竞争者（{filteredCompetitors.length}）</h3>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-gray-600">
                  <th className="text-left px-3 py-2 font-medium text-xs">名称</th>
                  <th className="text-left px-3 py-2 font-medium text-xs">类型</th>
                  <th className="text-left px-3 py-2 font-medium text-xs">威胁</th>
                  <th className="text-right px-3 py-2 font-medium text-xs">距离</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitors
                  .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
                  .map(c => {
                  const ThreatIcon = threatConfig[c.threat].icon
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-sky-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-gray-900 text-xs">{c.name}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: typeConfig[c.type].color }} />
                          {typeConfig[c.type].label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${threatConfig[c.threat].color}`}>
                          <ThreatIcon className="h-3 w-3" />
                          {threatConfig[c.threat].label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-amber-600">
                        {c.distance !== null && c.distance !== undefined ? `${c.distance.toFixed(2)}km` : '—'}
                      </td>
                    </tr>
                  )
                })}
                {filteredCompetitors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                      暂无匹配的竞争者
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 小区列表 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">周边居民区（{filteredCommunities.length}）</h3>
            <span className="text-xs text-gray-400">总 {totalHouseholds.toLocaleString()} 户</span>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-gray-600">
                  <th className="text-left px-3 py-2 font-medium text-xs">名称</th>
                  <th className="text-left px-3 py-2 font-medium text-xs">类型</th>
                  <th className="text-right px-3 py-2 font-medium text-xs">户数</th>
                  <th className="text-right px-3 py-2 font-medium text-xs">距离</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommunities
                  .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
                  .map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-violet-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-900 text-xs">{c.name}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className="w-2 h-2 rounded inline-block" style={{ background: communityTypeConfig[c.type].color }} />
                        {communityTypeConfig[c.type].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-gray-700">{c.households}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-amber-600">
                      {c.distance !== null && c.distance !== undefined ? `${c.distance.toFixed(2)}km` : '—'}
                    </td>
                  </tr>
                ))}
                {filteredCommunities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                      暂无匹配的居民区
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
