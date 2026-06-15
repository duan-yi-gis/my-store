import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Tags, BarChart3, MapPin, Truck, Fish, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: '投资分析', icon: TrendingUp, path: '/' },
  { label: '促销模拟', icon: Tags, path: '/promotion' },
  { label: '经营看板', icon: BarChart3, path: '/dashboard' },
  { label: '选址地图', icon: MapPin, path: '/competition' },
  { label: '供应商', icon: Truck, path: '/supplier' },
];

const pageTitles: Record<string, string> = {
  '/': '投资分析',
  '/promotion': '促销模拟',
  '/dashboard': '经营看板',
  '/competition': '选址地图',
  '/supplier': '供应商看板',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentPath = location.pathname;
  const pageTitle = pageTitles[currentPath] ?? '鱼跃水产';

  return (
    <div className="min-h-screen bg-sky-100">
      {/* ===== Desktop Sidebar (≥1024px) ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-sky-900 text-white z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sky-800">
          <Fish className="h-8 w-8 text-amber-500 shrink-0" />
          <div>
            <div className="text-2xl font-bold tracking-wide">鱼跃</div>
            <div className="text-xs text-sky-300">经营分析平台</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sky-900 border-l-4 border-amber-500 text-white'
                    : 'text-sky-200 hover:bg-sky-800 hover:text-white border-l-4 border-transparent'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom branding */}
        <div className="px-6 py-4 border-t border-sky-800 text-xs text-sky-400 text-center">
          鱼跃水产·食品·餐饮
        </div>
      </aside>

      {/* ===== Tablet Top Bar (768-1023px) ===== */}
      <header className="hidden md:flex lg:hidden fixed inset-x-0 top-0 h-14 bg-sky-900 text-white z-30 items-center px-4 shadow-md">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-sky-800 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Fish className="h-5 w-5 text-amber-500" />
          <span className="font-bold text-lg">鱼跃</span>
          <span className="text-xs text-sky-300">经营分析平台</span>
        </div>
      </header>

      {/* Tablet dropdown nav */}
      {mobileMenuOpen && (
        <nav className="hidden md:flex lg:hidden fixed top-14 inset-x-0 bg-sky-900 text-white z-20 flex-col py-2 shadow-lg md:flex">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sky-800 border-l-4 border-amber-500 text-white'
                    : 'text-sky-200 hover:bg-sky-800 hover:text-white border-l-4 border-transparent'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* ===== Mobile Bottom Tab (<768px) ===== */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 h-16 bg-sky-900 text-white z-30 flex items-stretch shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-200',
                isActive ? 'text-amber-500' : 'text-sky-300 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="truncate w-full text-center px-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ===== Content Area ===== */}
      <main
        className={cn(
          'min-h-screen flex flex-col',
          'lg:ml-64',
          'md:pt-14',
          'pb-20 md:pb-0'
        )}
      >
        {/* Top bar with page title */}
        <div className="flex items-center gap-2 px-4 md:px-6 py-4 bg-white/60 backdrop-blur-sm border-b border-sky-200">
          <Fish className="h-5 w-5 text-sky-900 shrink-0" />
          <h1 className="text-lg md:text-xl font-bold text-sky-900">{pageTitle}</h1>
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
