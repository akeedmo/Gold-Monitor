import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Newspaper, 
  Info, 
  Settings, 
  Bell, 
  Menu, 
  X, 
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  BarChart3,
  Lightbulb,
  Calculator,
  Facebook,
  Twitter,
  Instagram,
  Users,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Helmet, HelmetProvider } from 'react-helmet-async';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Filler,
  Legend
);
import axios from 'axios';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// --- Components ---

const BottomNav = ({ activePage, setActivePage, onRefresh, refreshing }: any) => {
  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'charts', label: 'الرسوم', icon: BarChart3 },
    { id: 'news', label: 'الأخبار', icon: Newspaper },
    { id: 'tips', label: 'نصائح', icon: Lightbulb },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 border-t border-gold/20 backdrop-blur-lg z-50 px-4 py-2">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              activePage === item.id ? 'text-gold' : 'text-gray-500'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${refreshing ? 'text-gold animate-spin' : 'text-gray-500'}`}
        >
          <RefreshCw className="w-6 h-6" />
          <span className="text-[10px] font-medium">تحديث</span>
        </button>
      </div>
    </div>
  );
};

const Navbar = ({ activePage, setActivePage, settings, selectedCurrency, setSelectedCurrency, onRefresh, refreshing }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'charts', label: 'الرسوم البيانية', icon: BarChart3 },
    { id: 'news', label: 'الأخبار', icon: Newspaper },
    { id: 'tips', label: 'نصائح الاستثمار', icon: Lightbulb },
    { id: 'about', label: 'عن الموقع', icon: Info },
  ];

  const currencies = [
    { code: 'USD', label: 'USD - دولار أمريكي' },
    { code: 'EUR', label: 'EUR - يورو' },
    { code: 'SAR', label: 'SAR - ريال سعودي' },
    { code: 'AED', label: 'AED - درهم إماراتي' },
    { code: 'EGP', label: 'EGP - جنيه مصري' },
    { code: 'GBP', label: 'GBP - جنيه إسترليني' },
    { code: 'KWD', label: 'KWD - دينار كويتي' },
  ];

  return (
    <nav className="bg-black/90 border-b border-gold/20 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center shadow-lg shadow-gold/20">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-bold gold-text tracking-tight">
              {settings.site_name || 'مراقب الذهب'}
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-baseline space-x-reverse space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    activePage === item.id 
                    ? 'bg-gold text-black shadow-lg shadow-gold/20' 
                    : 'text-gray-300 hover:text-gold hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 border-r border-white/10 pr-6">
              {settings.ad_link && (
                <a 
                  href={settings.ad_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all animate-pulse"
                >
                  <TrendingUp className="w-3 h-3" />
                  عروض حصرية
                </a>
              )}
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-zinc-900 text-gold border border-gold/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold transition-colors cursor-pointer"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className={`p-2 transition-colors ${refreshing ? 'text-gold animate-spin' : 'text-gray-400 hover:text-gold'}`}
                title="تحديث الأسعار"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setActivePage('admin')}
                className="p-2 text-gray-400 hover:text-gold transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="bg-zinc-900 text-gold border border-gold/20 rounded-lg px-2 py-1 text-xs outline-none"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
            <button
              onClick={() => setActivePage('admin')}
              className="p-2 text-gray-400 hover:text-gold"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gold hover:bg-white/5 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 border-b border-gold/10 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsOpen(false);
                  }}
                  className={`block w-full text-right px-3 py-4 rounded-md text-base font-medium flex items-center gap-3 ${
                    activePage === item.id 
                    ? 'bg-gold text-black' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-gold'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const PriceCard = ({ title, price, unit = 'جرام', currency = 'USD', exchangeRate = 1 }: any) => {
  const convertedPrice = price ? price * exchangeRate : null;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl hover:border-gold/30 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full gold-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
      <h3 className="text-gray-400 text-sm font-medium mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">
          {convertedPrice ? convertedPrice.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '...'}
        </span>
        <span className="text-gold text-sm font-semibold">{currency} / {unit}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
        <TrendingUp className="w-4 h-4" />
        <span>+0.2% اليوم</span>
      </div>
    </motion.div>
  );
};

const NewsCard = ({ item }: any) => (
  <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-xl hover:bg-zinc-900/60 transition-all group">
    <div className="flex justify-between items-start mb-3">
      <span className="text-xs font-bold text-gold uppercase tracking-wider bg-gold/10 px-2 py-1 rounded">
        {item.source}
      </span>
      <span className="text-xs text-gray-500">
        {format(new Date(item.pubDate), 'dd MMMM yyyy', { locale: ar })}
      </span>
    </div>
    <h4 className="text-lg font-bold text-white mb-2 group-hover:text-gold transition-colors leading-tight">
      {item.title}
    </h4>
    <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
      {item.contentSnippet}
    </p>
    <a 
      href={item.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-gold text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
    >
      اقرأ المزيد <ChevronLeft className="w-4 h-4" />
    </a>
  </div>
);

// --- Pages ---

const GoldCalculator = ({ latestPrice, selectedCurrency, exchangeRate }: any) => {
  const [weight, setWeight] = useState(1);
  const [karat, setKarat] = useState('24k');

  const getPricePerGram = () => {
    if (!latestPrice) return 0;
    switch (karat) {
      case '24k': return latestPrice.price_24k;
      case '22k': return latestPrice.price_22k;
      case '21k': return latestPrice.price_21k;
      case '18k': return latestPrice.price_18k;
      default: return 0;
    }
  };

  const totalPrice = getPricePerGram() * weight * exchangeRate;

  return (
    <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl space-y-6">
      <h3 className="text-2xl font-bold flex items-center gap-2">
        <Calculator className="text-gold" />
        حاسبة الذهب
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">الوزن (جرام)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none text-white"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-400">العيار</label>
          <select
            value={karat}
            onChange={(e) => setKarat(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none text-white"
          >
            <option value="24k">عيار 24</option>
            <option value="22k">عيار 22</option>
            <option value="21k">عيار 21</option>
            <option value="18k">عيار 18</option>
          </select>
        </div>
      </div>
      <div className="pt-6 border-t border-white/5 flex flex-col items-center justify-center space-y-2">
        <span className="text-gray-400 text-sm">إجمالي القيمة التقريبية</span>
        <div className="text-4xl font-bold gold-text">
          {totalPrice.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {selectedCurrency}
        </div>
      </div>
    </div>
  );
};

const HomePage = ({ latestPrice, news, settings, selectedCurrency, exchangeRate, onRefresh, refreshing }: any) => {
  return (
    <div className="space-y-12 py-8">
      <section className="text-center space-y-4 relative">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight"
        >
          أسعار الذهب <span className="gold-text">مباشرة</span>
        </motion.h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          تغطية شاملة لأسعار الذهب العالمية والمحلية، محدثة لحظة بلحظة لمساعدتك في اتخاذ أفضل قرارات الاستثمار.
        </p>
      </section>

      {/* Live Prices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PriceCard title="ذهب عيار 24" price={latestPrice?.price_24k} currency={selectedCurrency} exchangeRate={exchangeRate} />
        <PriceCard title="ذهب عيار 22" price={latestPrice?.price_22k} currency={selectedCurrency} exchangeRate={exchangeRate} />
        <PriceCard title="ذهب عيار 21" price={latestPrice?.price_21k} currency={selectedCurrency} exchangeRate={exchangeRate} />
        <PriceCard title="ذهب عيار 18" price={latestPrice?.price_18k} currency={selectedCurrency} exchangeRate={exchangeRate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <GoldCalculator latestPrice={latestPrice} selectedCurrency={selectedCurrency} exchangeRate={exchangeRate} />
        </div>
        <div className="bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex items-center justify-center p-8 text-gray-500 text-center">
          <div dangerouslySetInnerHTML={{ __html: settings.ads_sidebar }} />
          {!settings.ads_sidebar && "مساحة إعلانية"}
        </div>
      </div>

      {/* Ads Placeholder */}
      {settings.ads_header && (
        <div className="bg-zinc-900/30 border border-dashed border-white/10 p-4 rounded-xl text-center text-gray-500 text-sm">
          {settings.ads_header}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content: News */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Newspaper className="text-gold" />
              أحدث الأخبار الاقتصادية
            </h2>
          </div>
          <div className="grid gap-6">
            {news.slice(0, 6).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-gold/5 border border-gold/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bell className="text-gold" />
              اشترك في التنبيهات
            </h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              احصل على إشعارات فورية عند تغير أسعار الذهب بشكل ملحوظ أو عند صدور أخبار عاجلة.
            </p>
            <button 
              onClick={async () => {
                const OneSignal = (window as any).OneSignal;
                if (OneSignal) {
                  try {
                    if (OneSignal.Notifications) {
                      await OneSignal.Notifications.requestPermission();
                    } else if (OneSignal.showNativePrompt) {
                      OneSignal.showNativePrompt();
                    }
                  } catch (err) {
                    console.error('OneSignal error:', err);
                  }
                } else {
                  alert('جاري تحميل نظام التنبيهات... يرجى المحاولة مرة أخرى');
                }
              }}
              className="w-full py-3 gold-gradient text-black font-bold rounded-xl shadow-lg shadow-gold/20 hover:scale-[1.02] transition-transform"
            >
              تفعيل الإشعارات
            </button>
          </div>

          {settings.ad_link && (
            <a 
              href={settings.ad_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl hover:bg-emerald-500/20 transition-all group"
            >
              <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                فرص استثمارية
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed group-hover:text-gray-300 transition-colors">
                اكتشف أفضل الفرص الاستثمارية والعروض الحصرية المتاحة حالياً في سوق الذهب والعملات.
              </p>
            </a>
          )}

          <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">أهمية متابعة السعر</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                تحديد الوقت الأمثل للشراء أو البيع.
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                متابعة تأثير التضخم على قيمة مدخراتك.
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                تحليل الاتجاهات السوقية طويلة الأمد.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const TradingChart = ({ data, selectedCurrency, exchangeRate, timeframe }: any) => {
  const getSlicedData = () => {
    const reversed = [...data].reverse();
    switch (timeframe) {
      case '1H': return reversed.slice(-12);
      case '4H': return reversed.slice(-48);
      case '1D': return reversed;
      default: return reversed;
    }
  };

  const slicedData = getSlicedData();
  const labels = slicedData.map((h: any) => {
    const date = h.timestamp ? new Date(h.timestamp) : new Date();
    return format(isNaN(date.getTime()) ? new Date() : date, timeframe === '1H' || timeframe === '4H' ? 'HH:mm' : 'dd/MM HH:mm', { locale: ar });
  });

  const prices = slicedData.map((h: any) => (h.price_24k || 0) * exchangeRate);
  const currentPrice = prices[prices.length - 1] || 0;

  const chartData = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'Price',
        data: prices,
        borderColor: '#D4AF37',
        borderWidth: 2,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
          gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
          return gradient;
        },
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#D4AF37',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#18181b',
        titleColor: '#9ca3af',
        bodyColor: '#D4AF37',
        bodyFont: {
          weight: 'bold',
          size: 16,
        },
        borderColor: 'rgba(212, 175, 55, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${selectedCurrency}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#444',
          font: {
            size: 10,
            family: 'monospace',
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        position: 'right',
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: '#444',
          font: {
            size: 10,
            family: 'monospace',
          },
          callback: (value: any) => value.toLocaleString(),
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="h-[500px] w-full bg-[#0a0a0a] rounded-3xl border border-white/5 overflow-hidden relative group">
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">XAU / {selectedCurrency}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {currentPrice.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-emerald-400 text-xs font-mono">+1.24%</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-gray-400">
            <div>O: <span className="text-white">2,345.20</span></div>
            <div>H: <span className="text-emerald-400">2,360.45</span></div>
            <div>L: <span className="text-rose-400">2,340.10</span></div>
            <div>C: <span className="text-white">2,355.80</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-500 font-mono uppercase tracking-tighter">Live Market</span>
        </div>
      </div>

      <div className="w-full h-full pt-20">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

const ChartsPage = ({ history, selectedCurrency, exchangeRate }: any) => {
  const [timeframe, setTimeframe] = useState('1H');

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">منصة التداول المباشرة</h1>
          <p className="text-gray-400">تحليل تقني متقدم لحركة أسعار الذهب العالمية والمحلية.</p>
        </div>
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5">
          {['1H', '4H', '1D', '1W', '1M'].map(p => (
            <button 
              key={p}
              onClick={() => setTimeframe(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-all ${p === timeframe ? 'bg-gold text-black font-bold' : 'text-gray-500 hover:text-white'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <TradingChart data={history} selectedCurrency={selectedCurrency} exchangeRate={exchangeRate} timeframe={timeframe} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl">
          <div className="text-gray-500 text-xs font-mono mb-1 uppercase">RSI (14)</div>
          <div className="text-2xl font-bold text-white font-mono">58.42</div>
          <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gold w-[58%]" />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-mono">
            <span>OVERSOLD</span>
            <span>OVERBOUGHT</span>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl">
          <div className="text-gray-500 text-xs font-mono mb-1 uppercase">Volatility (ATR)</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">Low</div>
          <p className="text-[10px] text-gray-500 mt-2">السوق مستقر حالياً مع تقلبات منخفضة.</p>
        </div>
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl">
          <div className="text-gray-500 text-xs font-mono mb-1 uppercase">Market Sentiment</div>
          <div className="text-2xl font-bold text-gold font-mono">Bullish</div>
          <p className="text-[10px] text-gray-500 mt-2">توقعات إيجابية باستمرار ارتفاع الأسعار.</p>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ settings, onUpdateSettings }: any) => {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [formData, setFormData] = useState(settings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (token) {
      const fetchStats = async () => {
        try {
          const res = await axios.get('/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStats(res.data);
        } catch (err) {
          console.error("Stats error:", err);
        }
      };
      fetchStats();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/login', { password });
      setToken(res.data.token);
      localStorage.setItem('admin_token', res.data.token);
      setError('');
    } catch (err) {
      setError('كلمة المرور غير صحيحة');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/settings', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdateSettings(formData);
      alert('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      alert('حدث خطأ أثناء الحفظ');
    }
    setLoading(false);
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMsg) return alert('يرجى ملء جميع الحقول');
    setLoading(true);
    try {
      await axios.post('/api/admin/notifications', { title: notifTitle, message: notifMsg }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم إرسال التنبيه بنجاح');
      setNotifTitle('');
      setNotifMsg('');
    } catch (err) {
      alert('حدث خطأ أثناء الإرسال');
    }
    setLoading(false);
  };

  const handleAddAnnouncement = async () => {
    if (!annTitle || !annContent) return alert('يرجى ملء جميع الحقول');
    setLoading(true);
    try {
      await axios.post('/api/admin/announcement', { title: annTitle, content: annContent }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم نشر الإعلان بنجاح');
      setAnnTitle('');
      setAnnContent('');
    } catch (err) {
      alert('حدث خطأ أثناء النشر');
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 6) return alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    setLoading(true);
    try {
      await axios.post('/api/admin/change-password', { newPassword: newAdminPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم تغيير كلمة المرور بنجاح');
      setNewAdminPassword('');
    } catch (err) {
      alert('حدث خطأ أثناء تغيير كلمة المرور');
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-zinc-900 p-8 rounded-3xl border border-white/5 shadow-2xl">
          <div className="w-16 h-16 gold-gradient rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Settings className="text-black w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-8">تسجيل دخول المسؤول</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            <button className="w-full py-3 gold-gradient text-black font-bold rounded-xl">
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <button 
          onClick={() => {
            setToken(null);
            localStorage.removeItem('admin_token');
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
              <Users className="text-gold w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">إجمالي الزيارات</p>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">زيارات اليوم</p>
              <p className="text-2xl font-bold">{stats.today.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Bell className="text-gold" />
            إرسال تنبيه للمشتركين
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">عنوان التنبيه</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none"
                placeholder="مثال: ارتفاع مفاجئ في الأسعار"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">نص الرسالة</label>
              <textarea
                value={notifMsg}
                onChange={(e) => setNotifMsg(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none h-24"
                placeholder="اكتب تفاصيل التنبيه هنا..."
              />
            </div>
            <button
              onClick={handleSendNotification}
              disabled={loading}
              className="w-full py-3 bg-white/5 hover:bg-gold hover:text-black text-gold font-bold rounded-xl transition-all"
            >
              إرسال الآن
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="text-gold" />
            نشر إعلان إداري
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">عنوان الإعلان</label>
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">محتوى الإعلان</label>
              <textarea
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none h-24"
              />
            </div>
            <button
              onClick={handleAddAnnouncement}
              disabled={loading}
              className="w-full py-3 bg-white/5 hover:bg-gold hover:text-black text-gold font-bold rounded-xl transition-all"
            >
              نشر في قسم الأخبار
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="text-gold" />
            إعدادات الموقع
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">اسم الموقع</label>
              <input
                type="text"
                value={formData.site_name}
                onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">اللون الأساسي</label>
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                  className="w-full h-12 bg-black border border-white/10 rounded-xl p-1 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">اللون الثانوي</label>
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                  className="w-full h-12 bg-black border border-white/10 rounded-xl p-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-gold" />
            إعدادات الإعلانات
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">كود إعلان الهيدر</label>
              <textarea
                value={formData.ads_header}
                onChange={(e) => setFormData({...formData, ads_header: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none h-24"
                placeholder="<script>...</script>"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">كود إعلان الشريط الجانبي</label>
              <textarea
                value={formData.ads_sidebar}
                onChange={(e) => setFormData({...formData, ads_sidebar: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none h-24"
                placeholder="<script>...</script>"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">رابط الربح من الإعلانات (Ad Link)</label>
              <input
                type="text"
                value={formData.ad_link}
                onChange={(e) => setFormData({...formData, ad_link: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none"
                placeholder="https://example.com/ads"
              />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <LogOut className="text-gold" />
            تغيير كلمة مرور الإدارة
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-gold outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full py-3 bg-white/5 hover:bg-rose-500 hover:text-white text-rose-400 font-bold rounded-xl transition-all"
            >
              تحديث كلمة المرور
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-12 py-4 gold-gradient text-black font-bold rounded-2xl shadow-xl shadow-gold/20 hover:scale-105 transition-transform disabled:opacity-50"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [latestPrice, setLatestPrice] = useState(null);
  const [history, setHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [settings, setSettings] = useState({});
  const [exchangeRates, setExchangeRates] = useState<any>({ USD: 1 });
  const [selectedCurrency, setSelectedCurrency] = useState(localStorage.getItem('selected_currency') || 'USD');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [priceRes, historyRes, newsRes, settingsRes, ratesRes] = await Promise.all([
        axios.get('/api/prices/latest'),
        axios.get('/api/prices/history'),
        axios.get('/api/news'),
        axios.get('/api/settings'),
        axios.get('/api/exchange-rates')
      ]);
      setLatestPrice(priceRes.data);
      setHistory(historyRes.data);
      setNews(newsRes.data);
      setSettings(settingsRes.data);
      setExchangeRates(ratesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('selected_currency', selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <HelmetProvider>
      <div className="min-h-screen flex flex-col font-sans">
        <Helmet>
          <title>{settings.site_name} | أسعار الذهب لحظة بلحظة</title>
          <meta name="description" content="موقع مراقب الذهب يوفر لك أسعار الذهب العالمية والمحلية مباشرة، مع تحليلات فنية وأخبار اقتصادية حصرية." />
          <meta name="keywords" content="سعر الذهب اليوم، أسعار الذهب، الذهب في السعودية، الذهب في مصر، الذهب في الإمارات، الذهب في الكويت، الذهب في اليمن، تحليلات الذهب، أخبار الذهب، استثمار الذهب، سبائك الذهب، عيار 21، عيار 24، عيار 18، بورصة الذهب، سعر الذهب مباشر" />
          <html lang="ar" dir="rtl" />
        </Helmet>

        <Navbar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          settings={settings} 
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
        />

        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activePage === 'home' && (
                <HomePage 
                  latestPrice={latestPrice} 
                  news={news} 
                  settings={settings} 
                  selectedCurrency={selectedCurrency}
                  exchangeRate={exchangeRates[selectedCurrency] || 1}
                  onRefresh={() => fetchData(true)}
                  refreshing={refreshing}
                />
              )}
              {activePage === 'charts' && (
                <ChartsPage 
                  history={history} 
                  selectedCurrency={selectedCurrency}
                  exchangeRate={exchangeRates[selectedCurrency] || 1}
                />
              )}
              {activePage === 'news' && (
                <div className="py-8 space-y-8">
                  <h1 className="text-3xl font-bold">أخبار الذهب والاقتصاد</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {news.map(item => <NewsCard key={item.id} item={item} />)}
                  </div>
                </div>
              )}
              {activePage === 'tips' && (
                <div className="py-8 max-w-3xl mx-auto space-y-8">
                  <h1 className="text-3xl font-bold text-center">نصائح الاستثمار في الذهب</h1>
                  <div className="space-y-6">
                    {[
                      { title: 'التنويع هو المفتاح', content: 'لا تضع كل أموالك في الذهب. يفضل أن يمثل الذهب من 5% إلى 10% من محفظتك الاستثمارية.' },
                      { title: 'الاستثمار طويل الأمد', content: 'الذهب هو ملاذ آمن ومخزن للقيمة على المدى الطويل. لا تتوقع أرباحاً سريعة من المضاربة اليومية.' },
                      { title: 'متابعة الأخبار العالمية', content: 'تتأثر أسعار الذهب بقوة بالقرارات السياسية والاقتصادية العالمية، خاصة قرارات الفيدرالي الأمريكي.' },
                      { title: 'اختيار السبائك والعملات', content: 'عند الاستثمار، يفضل شراء السبائك والعملات الذهبية لتقليل تكاليف المصنعية مقارنة بالمجوهرات.' }
                    ].map((tip, i) => (
                      <div key={i} className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                        <h3 className="text-xl font-bold text-gold mb-3">{tip.title}</h3>
                        <p className="text-gray-400 leading-relaxed">{tip.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activePage === 'about' && (
                <div className="py-8 max-w-3xl mx-auto text-center space-y-8">
                  <div className="w-24 h-24 gold-gradient rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-gold/20">
                    <TrendingUp className="text-black w-12 h-12" />
                  </div>
                  <h1 className="text-3xl font-bold">{settings.site_name}</h1>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    نحن منصة رائدة متخصصة في توفير بيانات دقيقة ولحظية لأسعار الذهب العالمية. هدفنا هو تمكين المستثمرين والأفراد من الوصول إلى المعلومات التي يحتاجونها لاتخاذ قرارات مالية حكيمة.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-8">
                    <div>
                      <div className="text-2xl font-bold text-gold">+10K</div>
                      <div className="text-xs text-gray-500">زائر يومي</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gold">24/7</div>
                      <div className="text-xs text-gray-500">تحديث مباشر</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gold">100%</div>
                      <div className="text-xs text-gray-500">دقة البيانات</div>
                    </div>
                  </div>
                </div>
              )}
              {activePage === 'admin' && <AdminPanel settings={settings} onUpdateSettings={setSettings} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav activePage={activePage} setActivePage={setActivePage} onRefresh={() => fetchData(true)} refreshing={refreshing} />

        <footer className="bg-black border-t border-white/5 py-12 mt-20 pb-32 md:pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 gold-gradient rounded flex items-center justify-center">
                    <TrendingUp className="text-black w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold gold-text">{settings.site_name}</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  منصتكم الموثوقة لمتابعة أسعار الذهب العالمية والمحلية. بيانات دقيقة، أخبار حصرية، وتحليلات فنية.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-white font-bold">روابط سريعة</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><button onClick={() => setActivePage('home')} className="hover:text-gold transition-colors">الرئيسية</button></li>
                  <li><button onClick={() => setActivePage('charts')} className="hover:text-gold transition-colors">الرسوم البيانية</button></li>
                  <li><button onClick={() => setActivePage('news')} className="hover:text-gold transition-colors">الأخبار</button></li>
                  <li><button onClick={() => setActivePage('tips')} className="hover:text-gold transition-colors">نصائح الاستثمار</button></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-white font-bold">تواصل معنا</h4>
                <a href="mailto:qydalrfyd@gmail.com" className="text-gray-500 text-sm hover:text-gold transition-colors">
                  qydalrfyd@gmail.com
                </a>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-gold hover:text-black transition-all cursor-pointer">
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-gold hover:text-black transition-all cursor-pointer">
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-gold hover:text-black transition-all cursor-pointer">
                    <Instagram className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/5 mt-12 pt-8 text-center text-gray-600 text-xs">
              جميع الحقوق محفوظة © {new Date().getFullYear()} {settings.site_name}
            </div>
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
}
