import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Globe, 
  Clock, 
  ChevronRight, 
  Bell, 
  Menu,
  RefreshCw,
  Calculator,
  Newspaper,
  BarChart2,
  Info,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Mail,
  Layout,
  Settings,
  Eye,
  Heart,
  Languages
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import AdminDashboard from './AdminDashboard';
import { useTranslation } from './i18n';

// --- Types ---
interface GoldPrice {
  id: string;
  type: string;
  price: number;
  change: number;
  changePercent: number;
}

interface ChartData {
  time: string;
  value: number;
}

interface NewsItem {
  id: number;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
}

// --- Components ---

const TickerBar = ({ prices, currency }: { prices: GoldPrice[], currency: string }) => {
  const { language } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  return (
    <div className="bg-[#050505] text-primary py-2 overflow-hidden whitespace-nowrap border-b border-gold/20">
      <div className="flex gap-12 items-center ticker-animation">
        {[...prices, ...prices, ...prices, ...prices].map((item, idx) => (
          <div key={`${item.id}-${idx}`} className="flex items-center gap-3">
            <span className="font-bold text-sm">{item.type} - {item.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
            <span className={`text-xs ${item.change >= 0 ? "text-up" : "text-down"}`}>
              {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.changePercent).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdPlaceholder = ({ type }: { type: 'header' | 'sidebar' | 'content' }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>({});
  useEffect(() => {
    axios.get('/api/settings').then(res => setSettings(res.data));
  }, []);

  const adCode = settings[`ads_${type}`];
  if (adCode) {
    return <div className="ad-container my-4 overflow-hidden flex justify-center" dangerouslySetInnerHTML={{ __html: adCode }} />;
  }

  return (
    <div className={`bg-gray-100 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-[10px] font-bold uppercase tracking-widest my-4 ${type === 'sidebar' ? 'h-64' : 'h-24 w-full'}`}>
      {t(`ad_${type}`)}
    </div>
  );
};

const NewsCard = (props: any) => {
  const { item, locale } = props;
  const [liked, setLiked] = useState(false);
  const [content, setContent] = useState(item.contentSnippet);
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${navigator.language}: "${item.contentSnippet}"`,
      });
      if (response.text) setContent(response.text);
    } catch (error) {
      console.error("Translation failed", error);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="bg-card p-5 rounded-2xl border border-gold/10 card-shadow hover:border-primary/30 transition-all group">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-1 rounded">{item.source}</span>
        <span className="text-[10px] text-gray-500">{new Date(item.pubDate).toLocaleDateString(locale)}</span>
      </div>
      <a href={item.link} target="_blank" rel="noopener noreferrer">
        <h4 className="text-white font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h4>
        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-4">{content}</p>
      </a>
      <div className="flex gap-2">
        <button onClick={() => setLiked(!liked)} className={`p-2 rounded-lg transition-colors ${liked ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:bg-white/5'}`}>
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
        <button onClick={handleTranslate} disabled={translating} className="p-2 text-gray-500 hover:bg-white/5 rounded-lg transition-colors">
          {translating ? <RefreshCw size={18} className="animate-spin" /> : <Languages size={18} />}
        </button>
      </div>
    </div>
  );
};

const CurrencyLanguageSelector = ({ currency, setCurrency, language, setLanguage }: any) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-gold/20">
      <Languages size={14} className="text-primary" />
      <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer">
        <option value="ar" className="bg-card">العربية</option>
        <option value="en" className="bg-card">English</option>
        <option value="tr" className="bg-card">Türkçe</option>
      </select>
      <div className="h-4 w-[1px] bg-white/10" />
      <Coins size={14} className="text-primary" />
      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer">
        {['USD', 'EUR', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'LYD', 'YER'].map(code => <option key={code} value={code} className="bg-card">{code}</option>)}
      </select>
    </div>
  );
};

const HomePage = ({ prices, chartData, news, currency, exchangeRates, lastUpdate, setCurrency, setLanguage, calcAmount, setCalcAmount, calcType, setCalcType }: any) => {
  const { t, language } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  const [email, setEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  const handleSubscribe = async () => {
    setSubLoading(true);
    try {
      await axios.post('/api/subscribe', { email });
      alert(t('subscribed_successfully'));
    } catch (error) {
      console.error("Subscription failed", error);
    } finally {
      setSubLoading(false);
    }
  };
  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <Helmet>
        <title>{t('site_title')}</title>
        <meta name="description" content={t('meta_desc_home')} />
        <meta name="keywords" content={t('meta_keywords_home')} />
        <meta property="og:title" content={t('site_title')} />
        <meta property="og:description" content={t('meta_desc_home')} />
      </Helmet>

      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CurrencyLanguageSelector currency={currency} setCurrency={setCurrency} language={language} setLanguage={setLanguage} />
        </div>
        <div className="flex flex-col md:items-end">
          <h2 className="text-3xl font-bold gold-text-gradient">{t('market_overview')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('last_update')} {lastUpdate.toLocaleTimeString(locale)}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-up bg-up/10 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-up animate-pulse" />
          {t('live_market')}
        </div>
      </div>

      {/* Price Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {prices.map((item: any) => (
          <motion.div key={item.id} whileHover={{ y: -5 }} className="bg-card p-6 rounded-2xl border border-gold/10 card-shadow transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Coins size={20} />
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded-full ${item.change >= 0 ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>
                {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </div>
            </div>
            <h3 className="text-gray-500 text-xs font-bold mb-1">{item.type}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {item.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-primary text-xs font-bold">{currency}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Calculator & News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <GoldCalculator prices={prices} currency={currency} amount={calcAmount} setAmount={setCalcAmount} type={calcType} setType={setCalcType} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Newspaper className="text-primary" />
              {t('latest_news')}
            </h3>
            <Link to="/news" className="text-xs font-bold text-primary hover:underline">{t('view_all_news')}</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.slice(0, 4).map((item: any) => (
              <NewsCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </div>
      </div>

      {/* Subscribe to Alerts */}
      <div className="bg-gradient-to-r from-gold/20 to-primary/10 rounded-3xl p-8 border border-gold/20 relative overflow-hidden mt-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">{t('subscribe_alerts')}</h3>
            <p className="text-gray-400 text-sm">{t('subscribe_desc')}</p>
          </div>
          <div className="flex flex-col w-full md:w-80 gap-3">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')} 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-white"
            />
            <button onClick={handleSubscribe} disabled={subLoading} className="w-full bg-primary text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">
              {subLoading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : t('subscribe_now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartsPage = ({ chartData, currency, setCurrency, language, setLanguage }: any) => {
  const { t } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  const [timeRange, setTimeRange] = useState('D1');
  const [isChanging, setIsChanging] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  const handleRangeChange = (range: string) => {
    setIsChanging(true);
    setTimeRange(range);
    setTimeout(() => setIsChanging(false), 800);
  };

  const formatXAxis = (tickItem: any) => {
    const date = new Date(tickItem);
    if (timeRange === 'H1' || timeRange === 'H2' || timeRange === 'D1') {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  // Filter data based on range (simulated)
  const filteredData = React.useMemo(() => {
    if (timeRange === 'H1') return chartData.slice(-12);
    if (timeRange === 'H2') return chartData.slice(-24);
    if (timeRange === 'D1') return chartData.slice(-48);
    return chartData;
  }, [chartData, timeRange]);

  return (
    <div className="space-y-8">
      <Helmet>
        <title>{t('charts_analysis')}</title>
        <meta name="description" content={t('meta_desc_charts')} />
      </Helmet>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CurrencyLanguageSelector currency={currency} setCurrency={setCurrency} language={language} setLanguage={setLanguage} />
        </div>
        <h2 className="text-3xl font-bold gold-text-gradient">{t('charts_analysis')}</h2>
        <div className="flex bg-[#161a1e] p-1 rounded-lg border border-white/5">
          {['H1', 'H2', 'D1', 'M1', 'Y1'].map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                timeRange === range ? 'bg-[#2b3139] text-primary' : 'text-gray-500 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[#0b0e11] rounded-xl p-4 border border-white/5 card-shadow relative overflow-hidden group">
        <div className="flex justify-between items-center mb-4 text-[10px] font-mono text-gray-500">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> GOLD/USD</span>
            <span>MA(5): <span className="text-yellow-500">2,154.20</span></span>
            <span>MA(10): <span className="text-purple-500">2,148.15</span></span>
          </div>
          <div className="flex gap-2">
            <span className="text-up">H: 2,165.40</span>
            <span className="text-down">L: 2,140.10</span>
          </div>
        </div>

        <AnimatePresence>
          {isChanging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0b0e11]/80 backdrop-blur-sm z-20 flex items-center justify-center"
            >
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={filteredData}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                  setSelectedPoint(data.activePayload[0].payload);
                }
              }}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorChart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#1e2329" vertical={true} horizontal={true} />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatXAxis}
                stroke="#474d57" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                minTickGap={30}
              />
              <YAxis 
                orientation="right"
                stroke="#474d57" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                domain={['auto', 'auto']} 
                tickFormatter={(val) => val.toLocaleString(locale)}
              />
              <Tooltip 
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const date = new Date(payload[0].payload.timestamp);
                    return (
                      <div className="bg-[#1e2329] border border-[#474d57] p-3 rounded shadow-2xl text-right text-[11px]">
                        <p className="text-white font-bold mb-1">{t('price')} <span className="text-primary">{payload[0].value.toLocaleString(locale, { minimumFractionDigits: 2 })} {currency}</span></p>
                        <p className="text-gray-400">{t('date')} {date.toLocaleDateString(locale)}</p>
                        <p className="text-gray-400">{t('time')} {date.toLocaleTimeString(locale)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: '#474d57', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#D4AF37" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorChart)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {selectedPoint && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-white/5 rounded-2xl border border-gold/20 flex justify-between items-center"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-bold uppercase">{t('selected_price')}</span>
              <span className="text-xl font-bold text-primary">{selectedPoint.value.toLocaleString(locale)} {currency}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 font-bold uppercase">{t('date_and_time')}</span>
              <p className="text-sm font-bold text-white">
                {new Date(selectedPoint.timestamp).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(selectedPoint.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        )}

        <div className="mt-6 flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span>{t('live_from_exchange')}</span>
            <span className="text-primary/40">|</span>
            <span>{t('range')} {timeRange}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-up animate-pulse" />
            <span>{t('updated_now')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewsPage = ({ news }: any) => {
  const { t, language } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  const [newsList, setNewsList] = useState(news);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setNewsList(news);
  }, [news]);

  const handleLike = async (id: number) => {
    try {
      await axios.post(`/api/news/${id}/like`);
      setNewsList(newsList.map((item: any) => 
        item.id === id ? { ...item, likes: (item.likes || 0) + 1 } : item
      ));
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleView = async (id: number) => {
    try {
      await axios.post(`/api/news/${id}/view`);
      setNewsList(newsList.map((item: any) => 
        item.id === id ? { ...item, views: (item.views || 0) + 1 } : item
      ));
    } catch (err) {
      console.error("View error:", err);
    }
  };

  return (
    <div className="space-y-8">
      <Helmet>
        <title>{t('gold_news_markets')}</title>
        <meta name="description" content={t('meta_desc_news')} />
      </Helmet>
      <h2 className="text-3xl font-bold gold-text-gradient">{t('gold_news_markets')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {newsList.map((item: any) => (
          <div key={item.id} className="bg-card p-6 rounded-3xl border border-gold/10 card-shadow hover:border-primary/30 transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{item.source}</span>
              <span className="text-xs text-gray-500">{new Date(item.pubDate).toLocaleDateString(locale)}</span>
            </div>
            <h4 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">{item.title}</h4>
            <div className={`text-gray-500 text-sm leading-relaxed mb-4 ${expandedId === item.id ? '' : 'line-clamp-3'}`}>
              {item.contentSnippet}
            </div>
            
            <div className="mt-auto space-y-4">
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLike(item.id)}
                    className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <TrendingUp size={14} className={item.likes > 0 ? "text-red-500" : ""} />
                    <span className="text-xs font-bold">{item.likes || 0}</span>
                  </button>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Eye size={14} />
                    <span className="text-xs font-bold">{item.views || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.contentSnippet && item.contentSnippet.length > 150 && (
                    <button 
                      onClick={() => {
                        if (expandedId !== item.id) handleView(item.id);
                        setExpandedId(expandedId === item.id ? null : item.id);
                      }}
                      className="text-primary text-xs font-bold hover:underline"
                    >
                      {expandedId === item.id ? t('close') : t('read_more')}
                    </button>
                  )}
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={() => handleView(item.id)}
                    className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-primary transition-colors"
                    title={t('original_source')}
                  >
                    <Globe size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TipsPage = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <Helmet>
        <title>{t('investment_tips')}</title>
        <meta name="description" content={t('meta_desc_tips')} />
      </Helmet>
      <h2 className="text-3xl font-bold gold-text-gradient">{t('investment_tips')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { title: t('tip_1_title'), content: t('tip_1_desc'), icon: Lightbulb },
          { title: t('tip_2_title'), content: t('tip_2_desc'), icon: Clock },
          { title: t('tip_3_title'), content: t('tip_3_desc'), icon: Coins },
          { title: t('tip_4_title'), content: t('tip_4_desc'), icon: Globe },
        ].map((tip, idx) => (
          <div key={idx} className="bg-card p-8 rounded-3xl border border-gold/10 card-shadow flex gap-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
              <tip.icon size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{tip.title}</h3>
              <p className="text-gray-500 leading-relaxed">{tip.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AboutPage = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <Helmet>
        <title>{t('about_title')}</title>
        <meta name="description" content={t('meta_desc_about')} />
      </Helmet>
      <div className="bg-card p-12 rounded-3xl border border-gold/10 card-shadow text-center space-y-6">
        <div className="w-20 h-20 gold-gradient rounded-3xl flex items-center justify-center text-black mx-auto shadow-xl">
          <Coins size={40} />
        </div>
        <h2 className="text-3xl font-bold gold-text-gradient">{t('about_title')}</h2>
        <p className="text-gray-400 leading-relaxed text-lg">
          {t('about_desc')}
        </p>
        <div className="flex flex-col items-center gap-2 text-primary">
          <Mail size={20} />
          <span className="text-sm font-bold">qydalrfyd@gmail.com</span>
        </div>
        <div className="pt-8 grid grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 rounded-2xl">
            <h4 className="font-bold text-primary text-xl">24/7</h4>
            <p className="text-[10px] text-gray-500 uppercase font-bold">{t('live_update')}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl">
            <h4 className="font-bold text-primary text-xl">100%</h4>
            <p className="text-[10px] text-gray-500 uppercase font-bold">{t('data_accuracy')}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl">
            <h4 className="font-bold text-primary text-xl">Free</h4>
            <p className="text-[10px] text-gray-500 uppercase font-bold">{t('free_service')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoldCalculator = ({ prices, currency, amount, setAmount, type, setType }: any) => {
  const { t, language } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  const selectedPrice = prices.find((p: any) => p.id === type)?.price || 0;
  const total = (Number(amount) || 0) * selectedPrice;

  return (
    <div className="bg-card rounded-2xl p-6 border border-gold/10 card-shadow">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-primary" />
        {t('gold_calculator')}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">{t('weight_grams')}</label>
          <input 
            type="text" 
            inputMode="decimal"
            value={amount} 
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setAmount(val);
              }
            }} 
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-white" 
            placeholder={t('enter_weight')}
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">{t('karat')}</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-white">
            {prices.map((p: any) => <option key={p.id} value={p.id} className="bg-card">{p.type}</option>)}
          </select>
        </div>
        <div className="pt-4 border-t border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('estimated_value')}</span>
            <span className="text-lg font-bold text-primary">{total.toLocaleString(locale, { minimumFractionDigits: 2 })} {currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BottomNav = ({ onRefresh }: { onRefresh: () => void }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navItems = [
    { id: '/', label: t('nav_home'), icon: Layout, path: '/' },
    { id: '/charts', label: t('nav_charts_short'), icon: BarChart2, path: '/charts' },
    { id: '/news', label: t('nav_news'), icon: Newspaper, path: '/news' },
    { id: '/tips', label: t('nav_tips'), icon: Lightbulb, path: '/tips' },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-gold/20 px-4 py-2 flex justify-between items-center z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`flex flex-col items-center gap-1 transition-all ${
            location.pathname === item.path ? 'text-primary' : 'text-gray-500'
          }`}
        >
          <item.icon size={20} />
          <span className="text-[10px] font-bold">{item.label}</span>
        </Link>
      ))}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${isRefreshing ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
      >
        <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} />
        <span className="text-[10px] font-bold">{isRefreshing ? t('refreshing') : t('refresh')}</span>
      </button>
    </div>
  );
};

function AppContent() {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  const [calcAmount, setCalcAmount] = useState<number | string>(1);
  const [calcType, setCalcType] = useState('24k');
  const [prices, setPrices] = useState<GoldPrice[]>([
    { id: '24k', type: t('gold_24k'), price: 0, change: 0, changePercent: 0 },
    { id: '22k', type: t('gold_22k'), price: 0, change: 0, changePercent: 0 },
    { id: '21k', type: t('gold_21k'), price: 0, change: 0, changePercent: 0 },
    { id: '18k', type: t('gold_18k'), price: 0, change: 0, changePercent: 0 },
  ]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currency, setCurrency] = useState(localStorage.getItem('selectedCurrency') || 'USD');
  const [yemenRegion, setYemenRegion] = useState(localStorage.getItem('yemenRegion') || 'ADEN');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1 });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('admin_token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('admin_token'));
  }, [isAdmin]);

  useEffect(() => {
    localStorage.setItem('selectedCurrency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('yemenRegion', yemenRegion);
  }, [yemenRegion]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const fetchData = async (force = false) => {
    const isInitial = prices[0].price === 0;
    if (isInitial) setLoading(true);
    try {
      if (force) {
        await axios.post('/api/refresh');
      }
      const [priceRes, historyRes, newsRes, ratesRes] = await Promise.all([
        axios.get('/api/prices/latest'),
        axios.get('/api/prices/history'),
        axios.get('/api/news'),
        axios.get('/api/exchange-rates')
      ]);

      const getRate = () => {
        if (currency === 'YER') {
          return ratesRes.data[`YER_${yemenRegion}`] || ratesRes.data['YER'] || 1650;
        }
        return ratesRes.data[currency] || 1;
      };

      const rate = getRate();
      setExchangeRates(ratesRes.data);

      const latest = priceRes.data || {};
      const historyData = historyRes.data || [];
      const previous = historyData.length > 1 ? historyData[1] : latest;
      
      const calculateChange = (current: number, prev: number) => {
        const change = (current || 0) - (prev || 0);
        const changePercent = (prev && prev !== 0) ? (change / prev) * 100 : 0;
        return { change: change * rate, changePercent };
      };

      const formattedPrices: GoldPrice[] = [
        { id: '24k', type: t('gold_24k'), price: (latest.price_24k || 0) * rate, ...calculateChange(latest.price_24k, previous.price_24k) },
        { id: '22k', type: t('gold_22k'), price: (latest.price_22k || 0) * rate, ...calculateChange(latest.price_22k, previous.price_22k) },
        { id: '21k', type: t('gold_21k'), price: (latest.price_21k || 0) * rate, ...calculateChange(latest.price_21k, previous.price_21k) },
        { id: '18k', type: t('gold_18k'), price: (latest.price_18k || 0) * rate, ...calculateChange(latest.price_18k, previous.price_18k) },
      ];
      setPrices(formattedPrices);

      const history = historyData.map((h: any) => ({
        timestamp: h.timestamp,
        value: h.price_24k * rate
      })).reverse();
      setChartData(history);

      setNews(newsRes.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 min
    return () => clearInterval(interval);
  }, [currency, yemenRegion]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard onBack={() => setIsAdmin(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-secondary" dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-card border-b border-gold/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto w-full px-6 py-2 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center text-black shadow-lg shrink-0">
              <Coins size={24} />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold gold-text-gradient whitespace-nowrap">{t('site_title')}</h1>
                <button 
                  onClick={() => setIsAdmin(true)} 
                  className="hidden sm:flex p-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-primary transition-all"
                  title={t('admin_login')}
                >
                  <Settings size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                <span>{currentTime.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="text-primary">•</span>
                <span>{currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <nav className="flex gap-6 text-sm font-semibold">
                <Link to="/" className={location.pathname === '/' ? 'text-primary' : 'text-gray-400 hover:text-primary'}>{t('nav_home')}</Link>
                <Link to="/charts" className={location.pathname === '/charts' ? 'text-primary' : 'text-gray-400 hover:text-primary'}>{t('nav_charts')}</Link>
                <Link to="/news" className={location.pathname === '/news' ? 'text-primary' : 'text-gray-400 hover:text-primary'}>{t('nav_news')}</Link>
                <Link to="/tips" className={location.pathname === '/tips' ? 'text-primary' : 'text-gray-400 hover:text-primary'}>{t('nav_tips')}</Link>
                <Link to="/about" className={location.pathname === '/about' ? 'text-primary' : 'text-gray-400 hover:text-primary'}>{t('nav_about')}</Link>
              </nav>
              <div className="h-4 w-[1px] bg-white/10" />
              <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                <Bell size={20} />
              </button>
            </div>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="p-3 text-gray-400 hover:text-primary transition-colors"
            >
              <Menu size={32} />
            </button>
          </div>

        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-card border-t border-white/5 mt-4"
            >
              <nav className="flex flex-col p-4 gap-4 text-sm font-bold">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_home')}</Link>
                <Link to="/charts" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_charts')}</Link>
                <Link to="/news" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_news')}</Link>
                <Link to="/tips" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_tips')}</Link>
                <Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_about')}</Link>
                <button 
                  onClick={() => { setIsAdmin(true); setIsMenuOpen(false); }} 
                  className="flex items-center gap-2 text-primary pt-4 border-t border-white/5"
                >
                  <Settings size={18} />
                  <span>{t('admin_settings')}</span>
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <TickerBar prices={prices} currency={currency} />

      {currency === 'YER' && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-card border border-gold/20 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white">{t('yemen_region_customization')}</h3>
                <p className="text-xs text-gray-500">{t('choose_region_desc')}</p>
              </div>
            </div>
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-full sm:w-auto">
              <button 
                onClick={() => setYemenRegion('SANAA')}
                className={`flex-1 sm:px-10 py-2.5 rounded-lg font-bold transition-all duration-300 ${yemenRegion === 'SANAA' ? 'gold-gradient text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {t('sanaa')}
              </button>
              <button 
                onClick={() => setYemenRegion('ADEN')}
                className={`flex-1 sm:px-10 py-2.5 rounded-lg font-bold transition-all duration-300 ${yemenRegion === 'ADEN' ? 'gold-gradient text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {t('aden')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {isLoggedIn && location.pathname === '/' && (
          <div className="mb-8 p-4 bg-gold-soft border border-gold/30 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 gold-gradient rounded-full flex items-center justify-center text-black">
                <Info size={16} />
              </div>
              <span className="text-sm font-bold">{t('logged_in_as_admin')}</span>
            </div>
            <button onClick={() => setIsAdmin(true)} className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary/80 transition-all">
              {t('open_dashboard')}
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage prices={prices} chartData={chartData} news={news} currency={currency} exchangeRates={exchangeRates} lastUpdate={lastUpdate} setCurrency={setCurrency} setLanguage={setLanguage} calcAmount={calcAmount} setCalcAmount={setCalcAmount} calcType={calcType} setCalcType={setCalcType} />} />
          <Route path="/charts" element={<ChartsPage chartData={chartData} currency={currency} setCurrency={setCurrency} language={language} setLanguage={setLanguage} />} />
          <Route path="/news" element={<NewsPage news={news} />} />
          <Route path="/tips" element={<TipsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      <BottomNav onRefresh={() => fetchData(true)} />

      <footer className="bg-card border-t border-gold/20 py-12 px-6 mt-auto pb-32 md:pb-12 text-center">
        <div className="max-w-7xl mx-auto w-full space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Coins size={32} />
              <span className="text-2xl font-bold gold-text-gradient">{t('site_title')}</span>
            </div>
            <p className="text-gray-500 text-sm max-w-md mx-auto">{t('footer_desc')}</p>
            <div className="flex items-center gap-2 text-primary text-sm font-bold">
              <Mail size={16} />
              <span>qydalrfyd@gmail.com</span>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs font-bold">
            <span>{t('all_rights_reserved')} {t('site_title')}</span>
            {isLoggedIn && (
              <button onClick={() => { localStorage.removeItem('admin_token'); window.location.reload(); }} className="hover:text-red-500 transition-colors">{t('logout')}</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <AppContent />
      </Router>
    </HelmetProvider>
  );
}
