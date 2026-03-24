import React, { useState, useEffect, Suspense, lazy } from 'react';
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
  Languages,
  Share2
} from 'lucide-react';
import axios from 'axios';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, increment } from 'firebase/firestore';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useTranslation } from './i18n';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const ChartComponent = lazy(() => import('./ChartComponent'));

// --- Types ---
interface GoldPrice {
  id: string;
  type: string;
  price: number;
  change: number;
  changePercent: number;
  isFallback?: boolean;
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
            <span className="font-bold text-sm">
              {item.type} - {item.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              {item.isFallback && <span className="text-[8px] ml-1 opacity-50 font-normal">(تقديري)</span>}
            </span>
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
    getDoc(doc(db, 'settings', 'general')).then(res => {
      if (res.exists()) {
        setSettings(res.data());
      }
    }).catch(console.error);
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
      const { GoogleGenAI } = await import("@google/genai");
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
        {['USD', 'EUR', 'SAR', 'AED', 'GBP', 'TRY', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'LYD', 'YER'].map(code => <option key={code} value={code} className="bg-card">{code}</option>)}
      </select>
    </div>
  );
};

const HomePage = ({ prices, chartData, news, currency, exchangeRates, lastUpdate, setCurrency, setLanguage, calcAmount, setCalcAmount, calcType, setCalcType, handleShare }: any) => {
  const { t, language } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  const [email, setEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  const handleSubscribe = async (e?: any, googleEmail?: string) => {
    const emailToUse = googleEmail || email;
    if (!emailToUse || !emailToUse.includes('@')) {
      alert(t('invalid_email') || 'البريد الإلكتروني غير صالح');
      return;
    }
    setSubLoading(true);
    try {
      await setDoc(doc(db, 'subscribers', emailToUse), {
        email: emailToUse,
        subscribedAt: new Date().toISOString()
      });
      alert(t('subscribed_successfully'));
      setEmail('');
    } catch (error) {
      console.error("Subscription failed", error);
      alert(t('subscription_failed') || 'فشل الاشتراك');
    } finally {
      setSubLoading(false);
    }
  };

  const handleGoogleSubscribe = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Call signInWithPopup immediately without any state changes before it
      // to preserve the user gesture and prevent popup blocking.
      const result = await signInWithPopup(auth, provider);
      
      setSubLoading(true);
      if (result.user.email) {
        await handleSubscribe(null, result.user.email);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.log('User closed the login popup');
        return;
      }
      console.error(err);
      alert((t('google_login_failed') || 'فشل الاشتراك عبر جوجل') + ': ' + (err.message || err));
    } finally {
      setSubLoading(false);
    }
  };
  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <Helmet>
        <title>مراقب الذهب | أسعار الذهب اليوم مباشرة</title>
        <meta name="description" content="تابع أسعار الذهب العالمية والمحلية لحظة بلحظة. أدق الأسعار بجميع العملات واللغات. وجهتك الأولى للاستثمار الآمن." />
        <meta name="keywords" content="أسعار الذهب, سعر الذهب اليوم, Gold Price, اسعار الذهب مباشر" />
        <meta property="og:title" content="مراقب الذهب | أسعار الذهب اليوم مباشرة" />
        <meta property="og:description" content="تابع أسعار الذهب العالمية والمحلية لحظة بلحظة. أدق الأسعار بجميع العملات واللغات. وجهتك الأولى للاستثمار الآمن." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
        <meta property="og:url" content="https://ais-dev-7cu4clajx54jrmaysp6ap2-57287700371.europe-west2.run.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="مراقب الذهب | أسعار الذهب اليوم مباشرة" />
        <meta name="twitter:description" content="تابع أسعار الذهب العالمية والمحلية لحظة بلحظة. أدق الأسعار بجميع العملات واللغات." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
      </Helmet>

      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CurrencyLanguageSelector currency={currency} setCurrency={setCurrency} language={language} setLanguage={setLanguage} />
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <h2 className="text-3xl font-bold gold-text-gradient">{t('market_overview')}</h2>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">{t('last_update')} {lastUpdate.toLocaleTimeString(locale)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-up bg-up/10 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-up animate-pulse" />
          {t('live_market')}
        </div>
      </div>

      {/* Price Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {prices.map((item: any) => (
          <div key={item.id} className="bg-card p-6 rounded-2xl border border-gold/10 card-shadow transition-all hover:-translate-y-1">
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
          </div>
        ))}

        {/* Ounce Price Card */}
        <div className="bg-card p-6 rounded-2xl border border-gold/10 card-shadow transition-all hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <Globe size={20} />
            </div>
            <div className={`text-xs font-bold px-2 py-1 rounded-full ${prices[0]?.change >= 0 ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>
              {prices[0]?.change >= 0 ? '+' : ''}{(prices[0]?.changePercent || 0).toFixed(2)}%
            </div>
          </div>
          <h3 className="text-gray-500 text-xs font-bold mb-1">{language === 'ar' ? 'سعر الأونصة (الأوقية)' : language === 'tr' ? 'Ons Fiyatı' : 'Ounce Price'}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {(prices[0]?.price * 31.1035).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-primary text-xs font-bold">{currency}</span>
          </div>
        </div>
      </div>

      {/* Share Button Below Prices */}
      <div className="flex justify-center mt-4">
        <button 
          onClick={() => handleShare('prices')}
          className="w-full max-w-md gold-gradient text-black px-6 py-5 rounded-2xl font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)] group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
          <div className="bg-black/10 p-2 rounded-xl group-hover:bg-black/20 transition-colors relative z-10">
            <Share2 size={24} />
          </div>
          <span className="relative z-10 text-lg">
            {language === 'ar' ? 'اضغط لمشاركة الاسعار المحدثه على صفحتك' : 'Click to share updated prices on your page'}
          </span>
        </button>
      </div>

      {/* Calculator */}
      <div className="max-w-2xl mx-auto w-full">
        <GoldCalculator prices={prices} currency={currency} amount={calcAmount} setAmount={setCalcAmount} type={calcType} setType={setCalcType} />
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
            <button onClick={() => handleSubscribe()} disabled={subLoading} className="w-full bg-primary text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">
              {subLoading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : t('subscribe_now')}
            </button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-transparent px-2 text-gray-500">{t('or') || 'أو'}</span>
              </div>
            </div>
            <button 
              onClick={handleGoogleSubscribe} 
              disabled={subLoading} 
              className="w-full bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Globe size={18} className="text-primary" />
              {t('subscribe_via_google') || 'الاشتراك عبر جوجل'}
            </button>
            <button 
              onClick={() => {
                const OneSignal = (window as any).OneSignal;
                if (OneSignal) {
                  OneSignal.showNativePrompt();
                } else {
                  alert('OneSignal is not loaded yet');
                }
              }}
              className="w-full bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Bell size={18} className="text-primary" />
              {t('enable_push_notifications') || 'تفعيل التنبيهات'}
            </button>
          </div>
        </div>
      </div>

      {/* SEO Description Section (Moved from top) */}
      <div className="relative w-full rounded-3xl overflow-hidden mt-12 shadow-2xl border border-gold/20">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1612831455540-48b1ebca68d7')" }}
        />
        <div className="absolute inset-0 bg-black/70 z-10" />
        <div className="relative z-20 p-8 md:p-12 flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            أسعار الذهب اليوم مباشرة <span className="gold-text-gradient">| Gold Price Live</span>
          </h1>
          <p className="text-gray-300 max-w-2xl text-sm md:text-base leading-relaxed mb-6">
            موقع مراقب الذهب لمتابعة أسعار الذهب العالمية والمحلية لحظة بلحظة مع دعم عدة عملات ولغات. 
            تعرف على سعر الذهب الآن بسهولة من الجوال والكمبيوتر.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs font-bold">
            <span className="bg-primary/20 text-primary px-3 py-1.5 rounded-full border border-primary/30">أسعار الذهب</span>
            <span className="bg-primary/20 text-primary px-3 py-1.5 rounded-full border border-primary/30">سعر الذهب اليوم</span>
            <span className="bg-primary/20 text-primary px-3 py-1.5 rounded-full border border-primary/30">اسعار الذهب مباشر</span>
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
        <meta property="og:title" content={t('charts_analysis')} />
        <meta property="og:description" content={t('meta_desc_charts')} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('charts_analysis')} />
        <meta name="twitter:description" content={t('meta_desc_charts')} />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
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

        {isChanging && (
          <div className="absolute inset-0 bg-[#0b0e11]/80 backdrop-blur-sm z-20 flex items-center justify-center transition-opacity duration-300">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        <div className="h-[500px] w-full">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-primary"><RefreshCw className="animate-spin w-8 h-8" /></div>}>
            <ChartComponent 
              filteredData={filteredData} 
              formatXAxis={formatXAxis} 
              locale={locale} 
              currency={currency} 
              t={t} 
              setSelectedPoint={setSelectedPoint} 
            />
          </Suspense>
        </div>
        
        {selectedPoint && (
          <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-gold/20 flex justify-between items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          </div>
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
      // Mock API call for Firebase Hosting
      setNewsList(newsList.map((item: any) => 
        item.id === id ? { ...item, likes: (item.likes || 0) + 1 } : item
      ));
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleView = async (id: number) => {
    try {
      // Mock API call for Firebase Hosting
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
        <meta property="og:title" content={t('gold_news_markets')} />
        <meta property="og:description" content={t('meta_desc_news')} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('gold_news_markets')} />
        <meta name="twitter:description" content={t('meta_desc_news')} />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
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
        <meta property="og:title" content={t('investment_tips')} />
        <meta property="og:description" content={t('meta_desc_tips')} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('investment_tips')} />
        <meta name="twitter:description" content={t('meta_desc_tips')} />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
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
        <meta property="og:title" content={t('about_title')} />
        <meta property="og:description" content={t('meta_desc_about')} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('about_title')} />
        <meta name="twitter:description" content={t('meta_desc_about')} />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630" />
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

const LiveClock = ({ locale }: { locale: string }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
      <span>{currentTime.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      <span className="text-primary">•</span>
      <span>{currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
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
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('admin_token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const trackVisitor = async () => {
      try {
        let ipData = { ip: 'Unknown', country_name: 'Unknown', city: 'Unknown' };
        
        try {
          // Try ipapi.co first
          const res = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
          ipData = {
            ip: res.data.ip || 'Unknown',
            country_name: res.data.country_name || 'Unknown',
            city: res.data.city || 'Unknown'
          };
        } catch (e1) {
          try {
            // Fallback to ip-api.com
            const res = await axios.get('http://ip-api.com/json/', { timeout: 5000 });
            ipData = {
              ip: res.data.query || 'Unknown',
              country_name: res.data.country || 'Unknown',
              city: res.data.city || 'Unknown'
            };
          } catch (e2) {
            // If both fail, we still want to track the visit
            console.warn("Could not fetch IP details, tracking visit anonymously");
          }
        }

        await addDoc(collection(db, 'visitors'), {
          ...ipData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        
        const statsRef = doc(db, 'settings', 'stats');
        const statsDoc = await getDoc(statsRef);
        if (!statsDoc.exists()) {
          await setDoc(statsRef, { total: 1, today: 1, week: 1, month: 1, history: [], totalNews: 0 });
        } else {
          await setDoc(statsRef, { 
            total: increment(1), 
            today: increment(1),
            week: increment(1),
            month: increment(1)
          }, { merge: true });
        }
      } catch (e) {
        // Silently fail visitor tracking to avoid annoying the user
        // console.error("Visitor tracking failed", e);
      }
    };
    trackVisitor();
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

  const handleShare = async (type: 'prices' | 'general' = 'prices') => {
    let shareText = '';
    const hashtags = "\n\n#السعودية #اليمن #صنعاء #عدن #الذهب #اسعار_الذهب #مصر";
    
    if (type === 'prices') {
      let countryName = t(currency);
      if (currency === 'YER') {
        countryName = `${t('YER')} - ${t(yemenRegion.toLowerCase())}`;
      }
      
      const formattedDate = lastUpdate.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = lastUpdate.toLocaleTimeString(locale);
      
      const priceList = prices.map(p => `${p.type}: ${p.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`).join('\n');
      shareText = `🌟 ${t('site_title')} 🌟\n\n${t('prices_in_country')} ${countryName}:\n${priceList}\n\n🕒 ${t('last_update')}: ${formattedDate} ${formattedTime}\n\n${t('footer_desc')}${hashtags}`;
    } else {
      shareText = `🌟 ${t('site_title')} 🌟\n\n${t('share_description')}\n\n${t('footer_desc')}${hashtags}`;
    }
    
    const shareData = {
      title: t('site_title'),
      text: shareText,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert(t('link_copied') || 'تم نسخ رابط المشاركة!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  };

  const fetchData = async (force = false) => {
    const isInitial = prices[0].price === 0;
    if (isInitial) setLoading(true);
    try {
      // Fetch gold price from our server-side proxy (which handles caching and rate limits)
      // The server returns the price of 1 ounce of gold in USD.
      const timestamp = new Date().getTime();
      const goldResponse = await axios.get(`/api/gold-price?t=${timestamp}${force ? '&force=true' : ''}`, { timeout: 15000 });
      const { price, isFallback } = goldResponse.data;
      const goldPriceOunce = Number(price) || 2150;

      // Fetch exchange rates from Firestore
      let ratesData = { YER_SANAA: 530, YER_ADEN: 1650 };
      try {
        const ratesDoc = await getDoc(doc(db, 'settings', 'exchangeRates'));
        if (ratesDoc.exists()) {
          ratesData = ratesDoc.data() as any;
        }
      } catch (e) {
        console.error("Failed to fetch exchange rates from Firestore", e);
      }
      setExchangeRates(ratesData);

      // Convert ounce to gram (1 ounce = 31.1035 grams)
      let pricePerGram = goldPriceOunce / 31.1035;
      if (!Number.isFinite(pricePerGram) || pricePerGram <= 0) {
        pricePerGram = 2150 / 31.1035;
      }

      // Apply currency conversion
      if (currency !== 'USD') {
        let rate = 1;
        if (currency === 'YER') {
          rate = yemenRegion === 'SANAA' ? (Number(ratesData.YER_SANAA) || 530) : (Number(ratesData.YER_ADEN) || 1650);
        } else {
          // For other currencies, use the rate from Firestore
          rate = Number(ratesData[currency]) || 1;
          
          // If rate is 1 and it's not USD, it might be missing in Firestore
          // We can provide some default common rates just in case
          if (rate === 1) {
            const defaults: any = {
              'SAR': 3.75,
              'AED': 3.67,
              'EUR': 0.92,
              'EGP': 47.0,
              'TRY': 32.0,
              'GBP': 0.79,
              'KWD': 0.31,
              'QAR': 3.64,
              'BHD': 0.38,
              'OMR': 0.38,
              'JOD': 0.71,
              'LYD': 4.8
            };
            rate = defaults[currency] || 1;
          }
        }
        pricePerGram = pricePerGram * rate;
      }

      const calculateChange = (current: number, prev: number) => {
        const change = (current || 0) - (prev || 0);
        const changePercent = (prev && prev !== 0) ? (change / prev) * 100 : 0;
        return { change: change, changePercent };
      };

      const p24 = pricePerGram;
      const p22 = p24 * 22 / 24;
      const p21 = p24 * 21 / 24;
      const p18 = p24 * 18 / 24;

      const formattedPrices: GoldPrice[] = [
        { id: '24k', type: t('gold_24k'), price: p24, ...calculateChange(p24, p24), isFallback: isFallback },
        { id: '22k', type: t('gold_22k'), price: p22, ...calculateChange(p22, p22), isFallback: isFallback },
        { id: '21k', type: t('gold_21k'), price: p21, ...calculateChange(p21, p21), isFallback: isFallback },
        { id: '18k', type: t('gold_18k'), price: p18, ...calculateChange(p18, p18), isFallback: isFallback },
      ];

      setPrices(formattedPrices);
      setChartData([]);
      setNews([]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      // Hardcoded fallback as last resort
      const fallbackPriceOunce = 2150;
      let fallbackPriceGram = fallbackPriceOunce / 31.1035;
      
      if (currency !== 'USD') {
        let rate = 1;
        if (currency === 'YER') {
          rate = yemenRegion === 'SANAA' ? 530 : 1650;
        } else {
          const defaults: any = { 
            'SAR': 3.75, 'AED': 3.67, 'EUR': 0.92, 'EGP': 47.0, 'TRY': 32.0,
            'GBP': 0.79, 'KWD': 0.31, 'QAR': 3.64, 'BHD': 0.38, 'OMR': 0.38,
            'JOD': 0.71, 'LYD': 4.8
          };
          rate = defaults[currency] || 1;
        }
        fallbackPriceGram = fallbackPriceGram * rate;
      }

      const p24 = fallbackPriceGram;
      setPrices([
        { id: '24k', type: t('gold_24k'), price: p24, change: 0, changePercent: 0, isFallback: true },
        { id: '22k', type: t('gold_22k'), price: p24 * (22 / 24), change: 0, changePercent: 0, isFallback: true },
        { id: '21k', type: t('gold_21k'), price: p24 * (21 / 24), change: 0, changePercent: 0, isFallback: true },
        { id: '18k', type: t('gold_18k'), price: p24 * (18 / 24), change: 0, changePercent: 0, isFallback: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 420000); // 7 min (approx 8.5 requests/hour)
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
    return (
      <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><RefreshCw className="w-10 h-10 text-primary animate-spin" /></div>}>
        <AdminDashboard onBack={() => setIsAdmin(false)} />
      </Suspense>
    );
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
              <LiveClock locale={locale} />
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
                <button onClick={() => handleShare('general')} className="text-gray-400 hover:text-primary flex items-center gap-1">
                  <Share2 size={16} />
                  {t('share_app') || 'مشاركة'}
                </button>
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
        {isMenuOpen && (
          <div className="md:hidden overflow-hidden bg-card border-t border-white/5 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <nav className="flex flex-col p-4 gap-4 text-sm font-bold">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_home')}</Link>
              <Link to="/charts" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_charts')}</Link>
              <Link to="/news" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_news')}</Link>
              <Link to="/tips" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_tips')}</Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-primary">{t('nav_about')}</Link>
              <button 
                onClick={() => { handleShare('general'); setIsMenuOpen(false); }} 
                className="flex items-center gap-2 text-gray-400 hover:text-primary text-right"
              >
                <Share2 size={18} />
                <span>{t('share_app') || 'مشاركة الموقع'}</span>
              </button>
              <button 
                onClick={() => { setIsAdmin(true); setIsMenuOpen(false); }} 
                className="flex items-center gap-2 text-primary pt-4 border-t border-white/5"
              >
                <Settings size={18} />
                <span>{t('admin_settings')}</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      <TickerBar prices={prices} currency={currency} />

      {prices.some(p => p.isFallback) && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 py-2 px-4 text-center">
          <p className="text-[10px] text-yellow-500 font-bold flex items-center justify-center gap-2">
            <Info size={12} />
            يواجه النظام حالياً صعوبة في الاتصال بمزود الأسعار العالمي. الأسعار المعروضة هي آخر أسعار مسجلة (تقديرية).
          </p>
        </div>
      )}

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
          <Route path="/" element={<HomePage prices={prices} chartData={chartData} news={news} currency={currency} exchangeRates={exchangeRates} lastUpdate={lastUpdate} setCurrency={setCurrency} setLanguage={setLanguage} calcAmount={calcAmount} setCalcAmount={setCalcAmount} calcType={calcType} setCalcType={setCalcType} handleShare={handleShare} />} />
          <Route path="/charts" element={<ChartsPage chartData={chartData} currency={currency} setCurrency={setCurrency} language={language} setLanguage={setLanguage} />} />
          <Route path="/news" element={<NewsPage news={news} />} />
          <Route path="/tips" element={<TipsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/admin" element={<Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><RefreshCw className="w-10 h-10 text-primary animate-spin" /></div>}><AdminDashboard onBack={() => window.location.href = '/'} /></Suspense>} />
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
