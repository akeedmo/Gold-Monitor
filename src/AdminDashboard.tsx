import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  TrendingUp, 
  ArrowLeft, 
  Lock,
  Eye,
  Clock,
  LogOut,
  ChevronRight,
  Settings,
  Bell,
  Newspaper,
  Layout,
  Save,
  Trash2,
  Plus,
  DollarSign,
  Mail,
  Menu,
  X,
  RefreshCw,
  Globe,
  Key
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import axios from 'axios';
import { useTranslation } from './i18n';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface Stats {
  total: number;
  today: number;
  week: number;
  month: number;
  history: { date: string; count: number }[];
  latestPrice: any;
  totalNews: number;
}

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { t, language, isRTL } = useTranslation();
  const locale = language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US';
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [exchangeRates, setExchangeRates] = useState<any>({});
  const [apiKeys, setApiKeys] = useState({ activeKey: '', pendingKeys: [] as string[], expiredKeys: [] as string[] });
  const [newApiKey, setNewApiKey] = useState('');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user is admin in Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
        const isDefaultAdmin = firebaseUser.email === "qydalrfyd@gmail.com";
        
        if (isAdmin || isDefaultAdmin) {
          setUser(firebaseUser);
          // For backward compatibility with existing API calls that use JWT
          // We might need to generate a token or update the backend to accept Firebase tokens
          // For now, we'll just use the firebaseUser object to show the dashboard
          setToken('firebase-auth-active'); 
        } else {
          setError('You are not authorized as an admin');
          auth.signOut();
        }
      } else {
        setUser(null);
        setToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setLoading(true);
      setError('');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.log('User closed the login popup');
        return;
      }
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  // Form states
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError(t('error_password_length'));
      return;
    }
    setLoading(true);
    setError('');
    setPasswordSuccess('');
    try {
      await setDoc(doc(db, 'settings', 'admin'), { password: newPassword }, { merge: true });
      setPasswordSuccess(t('success_password_changed'));
      setNewPassword('');
    } catch (err: any) {
      setError(t('error_password_change_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
      const actualPassword = adminDoc.exists() && adminDoc.data().password ? adminDoc.data().password : 'admin123';
      
      if (password === actualPassword) {
        const mockToken = 'mock_token_' + Date.now();
        localStorage.setItem('admin_token', mockToken);
        setToken(mockToken);
      } else {
        throw new Error('كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      let realStats = { total: 0, today: 0, week: 0, month: 0, history: [], latestPrice: { price: 0 }, totalNews: 0 };
      try {
        const statsDoc = await getDoc(doc(db, 'settings', 'stats'));
        if (statsDoc.exists()) {
          realStats = { ...realStats, ...statsDoc.data() };
        }
      } catch (e) {
        console.error("Failed to fetch stats from Firestore", e);
      }

      try {
        const visitorsQuery = query(collection(db, 'visitors'), orderBy('timestamp', 'desc'), limit(50));
        const visitorsSnap = await getDocs(visitorsQuery);
        const visitorsData = visitorsSnap.docs.map(d => d.data());
        setVisitors(visitorsData);
      } catch (e) {
        console.error("Failed to fetch visitors from Firestore", e);
      }
      
      let settingsRes = { data: { siteName: "مراقب الذهب", contactEmail: "qydalrfyd@gmail.com", maintenanceMode: false } };
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
          settingsRes.data = { ...settingsRes.data, ...settingsDoc.data() };
        }
      } catch (e) {
        console.error("Failed to fetch settings from Firestore", e);
      }

      const newsRes = { data: [] };
      const notifRes = { data: [] };
      const subsRes = { data: [] };
      
      let ratesData = { YER_SANAA: 530, YER_ADEN: 1650 };
      try {
        const ratesDoc = await getDoc(doc(db, 'settings', 'exchangeRates'));
        if (ratesDoc.exists()) {
          ratesData = ratesDoc.data() as any;
        }
      } catch (e) {
        console.error("Failed to fetch exchange rates from Firestore", e);
      }

      let apiKeysData = { activeKey: '', pendingKeys: [] as string[], expiredKeys: [] as string[] };
      try {
        const keysDoc = await getDoc(doc(db, 'settings', 'apiKeys'));
        if (keysDoc.exists()) {
          apiKeysData = keysDoc.data() as any;
        } else {
          apiKeysData = { activeKey: "1bda868b4ac2385f9e5ceb205450a0f8", pendingKeys: [], expiredKeys: [] };
        }
      } catch (e) {
        console.error("Failed to fetch api keys from Firestore", e);
      }

      setStats(realStats);
      setSettings(settingsRes.data);
      setNews(newsRes.data);
      setNotifications(notifRes.data);
      setExchangeRates(ratesData);
      setApiKeys(apiKeysData);
      setSubscribers(subsRes.data);
    } catch (err) {
      console.error("fetchData error:", err);
      // localStorage.removeItem('admin_token');
      // setToken(null);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    setError('');
    try {
      await setDoc(doc(db, 'settings', 'general'), settings);
      showSuccess(t('success_settings_saved'));
    } catch (err) {
      setError(t('error_settings_save_failed'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveRates = async () => {
    setSaveLoading(true);
    setError('');
    try {
      await setDoc(doc(db, 'settings', 'exchangeRates'), exchangeRates);
      showSuccess(t('success_rates_saved'));
    } catch (err) {
      setError(t('error_rates_save_failed'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddApiKey = () => {
    if (!newApiKey.trim()) return;
    setApiKeys(prev => ({
      ...prev,
      pendingKeys: [...(prev.pendingKeys || []), newApiKey.trim()]
    }));
    setNewApiKey('');
  };

  const handleSwitchKey = () => {
    setApiKeys(prev => {
      const newExpired = prev.activeKey ? [...(prev.expiredKeys || []), prev.activeKey] : (prev.expiredKeys || []);
      const newActive = (prev.pendingKeys && prev.pendingKeys.length > 0) ? prev.pendingKeys[0] : '';
      const newPending = (prev.pendingKeys && prev.pendingKeys.length > 0) ? prev.pendingKeys.slice(1) : [];
      return {
        activeKey: newActive,
        pendingKeys: newPending,
        expiredKeys: newExpired
      };
    });
  };

  const handleSaveApiKeys = async () => {
    setSaveLoading(true);
    setError('');
    try {
      await setDoc(doc(db, 'settings', 'apiKeys'), apiKeys);
      showSuccess(t('success_settings_saved') || 'تم حفظ المفاتيح بنجاح');
    } catch (err) {
      setError(t('error_settings_save_failed') || 'فشل حفظ المفاتيح');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSendNotification = async () => {
    setSaveLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/notifications', { title: notifTitle, message: notifMessage, emails: selectedEmails }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(t('success_alert_sent'));
      setNotifTitle('');
      setNotifMessage('');
      setSelectedEmails([]);
      fetchData();
    } catch (err) {
      setError(t('error_alert_send_failed'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePostAnnouncement = async () => {
    setSaveLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/announcement', { title: announcementTitle, content: announcementContent }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(t('success_ad_published'));
      setAnnouncementTitle('');
      setAnnouncementContent('');
      fetchData();
    } catch (err) {
      setError(t('error_ad_publish_failed'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!confirm(t('confirm_delete_news'))) return;
    setLoading(true);
    try {
      await axios.delete(`/api/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(t('success_news_deleted'));
      fetchData();
    } catch (err) {
      setError(t('error_news_delete_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-card p-8 rounded-2xl shadow-xl w-full max-w-md border border-gold/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="text-primary" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('admin_dashboard')}</h2>
            <p className="text-gray-400 text-sm">{t('enter_password')}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="password" 
              placeholder={t('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-4 gold-gradient text-black rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? t('verifying') : t('login')}
            </button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-gray-500">{t('or_continue_with') || 'أو المتابعة عبر'}</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleGoogleLogin} 
              disabled={loading} 
              className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <Globe size={20} className="text-primary" />
              {t('login_with_google') || 'الدخول عبر جوجل'}
            </button>
            <button type="button" onClick={onBack} className="w-full py-2 text-gray-400 text-sm hover:text-primary transition-colors">{t('back_to_site')}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-white flex flex-col md:flex-row" dir={isRTL ? "rtl" : "ltr"}>
      {/* Mobile Header */}
      <div className="md:hidden bg-card border-b border-gold/10 p-4 flex justify-between items-center sticky top-0 z-[60]">
        <h2 className="text-lg font-bold gold-text-gradient flex items-center gap-2">
          <Layout className="text-primary" size={20} />
          {t('admin_panel')}
        </h2>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-primary">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 h-screen w-64 bg-card text-white flex flex-col border-l border-gold/10 z-[70] transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-white/10 hidden md:block">
          <h2 className="text-xl font-bold flex items-center gap-2 gold-text-gradient">
            <Layout className="text-primary" />
            {t('admin_panel')}
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'overview', label: t('overview'), icon: BarChart3 },
            { id: 'notifications', label: t('notifications'), icon: Bell },
            { id: 'news', label: t('news_and_ads'), icon: Newspaper },
            { id: 'rates', label: t('exchange_rates'), icon: DollarSign },
            { id: 'settings', label: t('settings_and_ads'), icon: Settings },
            { id: 'monetization', label: t('monetization'), icon: DollarSign },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'gold-gradient text-black' : 'hover:bg-white/5 text-white/60'}`}
            >
              <item.icon size={18} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => { 
              auth.signOut();
              localStorage.removeItem('admin_token'); 
              setToken(null); 
            }} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={18} />
            <span className="font-bold text-sm">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold gold-text-gradient">
              {activeTab === 'overview' && t('overview')}
              {activeTab === 'notifications' && t('manage_notifications')}
              {activeTab === 'news' && t('manage_news')}
              {activeTab === 'rates' && t('manage_rates')}
              {activeTab === 'settings' && t('site_settings')}
              {activeTab === 'monetization' && t('monetization')}
            </h1>
            <div className="flex items-center gap-4">
              {successMessage && (
                <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm font-bold border border-green-500/30 animate-in fade-in slide-in-from-right-4 duration-300">
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/30 animate-in fade-in slide-in-from-right-4 duration-300">
                  {error}
                </div>
              )}
              <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
                <ArrowLeft size={18} />
                {t('back_to_site')}
              </button>
            </div>
          </div>

          {activeTab === 'overview' && stats && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: t('today_visits'), value: stats.today, icon: Clock, color: 'text-primary' },
                  { label: t('week_visits'), value: stats.week, icon: Calendar, color: 'text-blue-400' },
                  { label: t('total_news'), value: stats.totalNews, icon: Newspaper, color: 'text-purple-400' },
                  { label: t('total_visits'), value: stats.total, icon: Users, color: 'text-green-400' },
                ].map(item => (
                  <div key={item.label} className="bg-card p-6 rounded-2xl border border-gold/10 shadow-lg">
                    <div className={`p-2 rounded-lg bg-white/5 w-fit mb-4 ${item.color}`}>
                      <item.icon size={20} />
                    </div>
                    <p className="text-gray-400 text-xs font-bold mb-1">{item.label}</p>
                    <h3 className="text-2xl font-bold text-white">{item.value.toLocaleString(locale)}</h3>
                  </div>
                ))}
              </div>

              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-lg">
                <h3 className="text-lg font-bold mb-6 text-white">{t('traffic_analysis')}</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#D4AF37', color: '#fff' }} />
                      <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-lg mt-8">
                <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                  <Globe size={20} className="text-primary" />
                  سجل الزيارات الأخير
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left rtl:text-right text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-white/5 border-b border-white/10">
                      <tr>
                        <th scope="col" className="px-6 py-3">الوقت والتاريخ</th>
                        <th scope="col" className="px-6 py-3">البلد</th>
                        <th scope="col" className="px-6 py-3">المدينة</th>
                        <th scope="col" className="px-6 py-3">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors && visitors.length > 0 ? (
                        visitors.map((visitor, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs">
                              {new Date(visitor.timestamp).toLocaleString(locale)}
                            </td>
                            <td className="px-6 py-4 font-bold text-white">
                              {visitor.country || 'غير معروف'}
                            </td>
                            <td className="px-6 py-4">
                              {visitor.city || '-'}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs">
                              {visitor.ip || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            لا توجد زيارات مسجلة بعد
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{t('subscribers_list') || 'قائمة المشتركين'}</h3>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md">{subscribers.length}</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="checkbox" 
                    id="selectAll"
                    checked={selectedEmails.length === subscribers.length && subscribers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmails(subscribers.map(s => s.email));
                      } else {
                        setSelectedEmails([]);
                      }
                    }}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="selectAll" className="text-sm text-gray-300 cursor-pointer">{t('select_all') || 'تحديد الكل'}</label>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {subscribers.map(sub => (
                    <div key={sub.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-primary/30 transition-colors">
                      <input 
                        type="checkbox" 
                        id={`sub-${sub.id}`}
                        checked={selectedEmails.includes(sub.email)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmails([...selectedEmails, sub.email]);
                          } else {
                            setSelectedEmails(selectedEmails.filter(email => email !== sub.email));
                          }
                        }}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <label htmlFor={`sub-${sub.id}`} className="text-sm text-gray-300 cursor-pointer flex-1 truncate" dir="ltr">
                        {sub.email}
                      </label>
                    </div>
                  ))}
                  {subscribers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">{t('no_subscribers') || 'لا يوجد مشتركون'}</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1 bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Plus size={20} className="text-primary" />
                  {t('send_new_alert')}
                </h3>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder={t('alert_title')}
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                  />
                  <textarea 
                    placeholder={t('alert_content')}
                    rows={4}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-gray-400">
                    {selectedEmails.length > 0 ? 
                      <span className="text-primary">{selectedEmails.length} {t('subscribers_selected') || 'مشترك محدد'}</span> : 
                      <span>{t('no_subscribers_selected') || 'سيتم الإرسال لجميع المشتركين'}</span>
                    }
                  </div>
                  <button onClick={handleSendNotification} disabled={saveLoading || !notifTitle || !notifMessage} className="w-full py-3 gold-gradient text-black rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saveLoading ? <RefreshCw className="animate-spin" size={18} /> : t('send_now')}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-1 bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6">
                <h3 className="text-lg font-bold text-white">{t('alert_history')}</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-bold text-sm mb-1 text-white">{n.title}</h4>
                      <p className="text-xs text-gray-400 mb-2">{n.message}</p>
                      <span className="text-[10px] text-gray-500">{new Date(n.sent_at.replace(' ', 'T') + 'Z').toLocaleString(locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-8">
              {selectedItem && (
                <div className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-md p-6 md:p-12 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all mb-8"
                    >
                      <ArrowLeft size={20} />
                      {t('back_to_list')}
                    </button>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{selectedItem.source}</span>
                        <span className="text-xs text-gray-500">{new Date(selectedItem.pubDate).toLocaleString(locale)}</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">{selectedItem.title}</h2>
                      <div className="flex items-center gap-6 text-gray-400 text-sm border-y border-white/5 py-4">
                        <span className="flex items-center gap-2"><TrendingUp size={16} /> {selectedItem.likes || 0} {t('likes')}</span>
                        <span className="flex items-center gap-2"><Eye size={16} /> {selectedItem.views || 0} {t('views')}</span>
                      </div>
                      <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap pt-4">
                        {selectedItem.contentSnippet}
                      </div>
                      {selectedItem.link && (
                        <div className="pt-8">
                          <a 
                            href={selectedItem.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
                          >
                            {t('original_source_link')} <ChevronRight size={18} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Plus size={20} className="text-primary" />
                  {t('publish_admin_ad')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder={t('ad_title')}
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                  />
                  <input 
                    type="text" 
                    placeholder={t('ad_content_placeholder')}
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <button onClick={handlePostAnnouncement} disabled={saveLoading} className="py-3 px-8 gold-gradient text-black rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saveLoading ? <RefreshCw className="animate-spin" size={18} /> : t('publish_ad')}
                </button>
              </div>

              <div className="bg-card rounded-2xl border border-gold/10 shadow-lg overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{t('news_table_header')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{t('source_table_header')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{t('interaction_table_header')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{t('actions_table_header')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {news.map(item => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                          <td className="px-6 py-4" onClick={() => setSelectedItem(item)}>
                            <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">{item.title}</p>
                          </td>
                          <td className="px-6 py-4" onClick={() => setSelectedItem(item)}>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{item.source}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500" onClick={() => setSelectedItem(item)}>
                            <div className="flex gap-3">
                              <span>{item.likes || 0} <TrendingUp size={12} className="inline" /></span>
                              <span>{item.views || 0} <Eye size={12} className="inline" /></span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNews(item.id); }} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden divide-y divide-white/5">
                  {news.map(item => (
                    <div key={item.id} className="p-4 space-y-3 active:bg-white/5" onClick={() => setSelectedItem(item)}>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{item.source}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteNews(item.id); }} className="text-red-400 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-2">{item.title}</h4>
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>{new Date(item.pubDate).toLocaleDateString(locale)}</span>
                        <div className="flex gap-3">
                          <span>{item.likes || 0} <TrendingUp size={10} className="inline" /></span>
                          <span>{item.views || 0} <Eye size={10} className="inline" /></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rates' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <DollarSign size={20} className="text-primary" />
                  {t('edit_exchange_rates')}
                </h3>
                <p className="text-gray-400 text-sm">
                  {t('rates_note')}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.keys(exchangeRates).sort().map(currency => (
                    <div key={currency} className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 block">
                        {currency === 'YER_SANAA' ? t('yer_sanaa') : 
                         currency === 'YER_ADEN' ? t('yer_aden') : 
                         currency}
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.01"
                          value={exchangeRates[currency]}
                          onChange={(e) => setExchangeRates({...exchangeRates, [currency]: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button onClick={handleSaveRates} disabled={saveLoading} className="w-full py-4 gold-gradient text-black rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
                    {saveLoading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {saveLoading ? t('saving') : t('save_rates')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Settings size={20} className="text-primary" />
                  {t('basic_site_settings')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{t('site_name')}</label>
                    <input 
                      type="text" 
                      value={settings.site_name || ''}
                      onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{t('email')}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input 
                        type="email" 
                        value={settings.admin_email || ''}
                        onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-12 py-3 text-sm text-white focus:outline-none focus:border-primary"
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">{t('primary_color')}</label>
                      <input 
                        type="color" 
                        value={settings.primary_color || '#D4AF37'}
                        onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-2 py-1 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">{t('secondary_color')}</label>
                      <input 
                        type="color" 
                        value={settings.secondary_color || '#1a1a1a'}
                        onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-2 py-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Layout size={20} className="text-primary" />
                  {t('adsense_management')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{t('header_ad')}</label>
                    <textarea 
                      placeholder={t('ad_code_placeholder')}
                      rows={2}
                      value={settings.ads_header || ''}
                      onChange={(e) => setSettings({...settings, ads_header: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{t('sidebar_ad')}</label>
                    <textarea 
                      placeholder={t('ad_code_placeholder')}
                      rows={2}
                      value={settings.ads_sidebar || ''}
                      onChange={(e) => setSettings({...settings, ads_sidebar: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">{t('content_ad')}</label>
                    <textarea 
                      placeholder={t('ad_code_placeholder')}
                      rows={2}
                      value={settings.ads_content || ''}
                      onChange={(e) => setSettings({...settings, ads_content: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <button onClick={handleSaveSettings} disabled={saveLoading} className="w-full py-4 gold-gradient text-black rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
                  {saveLoading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                  {saveLoading ? t('saving') : t('save_all_settings')}
                </button>
              </div>

              <div className="lg:col-span-2 bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6 mt-8">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Key size={20} className="text-primary" />
                  إدارة مفاتيح API (MetalPrice)
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-400 mb-2">المفتاح النشط حالياً:</p>
                    <div className="flex items-center justify-between gap-4">
                      <code className="text-primary font-mono bg-black/50 px-3 py-2 rounded-lg flex-1 overflow-x-auto">
                        {apiKeys.activeKey || 'لا يوجد مفتاح نشط'}
                      </code>
                      <button 
                        onClick={handleSwitchKey}
                        className="bg-red-500/20 text-red-500 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                      >
                        إلغاء وتفعيل التالي
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-400 mb-2">إضافة مفتاح جديد (احتياطي):</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="أدخل مفتاح API جديد..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                      />
                      <button 
                        onClick={handleAddApiKey}
                        className="bg-primary/20 text-primary hover:bg-primary/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        إضافة
                      </button>
                    </div>
                  </div>

                  {apiKeys.pendingKeys && apiKeys.pendingKeys.length > 0 && (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-sm text-gray-400 mb-2">المفاتيح الاحتياطية ({apiKeys.pendingKeys.length}):</p>
                      <ul className="space-y-2">
                        {apiKeys.pendingKeys.map((key, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm bg-black/30 px-3 py-2 rounded-lg">
                            <code className="text-gray-300 font-mono">{key}</code>
                            <button 
                              onClick={() => {
                                setApiKeys(prev => ({
                                  ...prev,
                                  pendingKeys: prev.pendingKeys.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {apiKeys.expiredKeys && apiKeys.expiredKeys.length > 0 && (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 opacity-70">
                      <p className="text-sm text-gray-400 mb-2">المفاتيح المنتهية ({apiKeys.expiredKeys.length}):</p>
                      <ul className="space-y-2">
                        {apiKeys.expiredKeys.map((key, idx) => (
                          <li key={idx} className="text-sm bg-black/30 px-3 py-2 rounded-lg">
                            <code className="text-gray-500 font-mono line-through">{key}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button 
                    onClick={handleSaveApiKeys} 
                    disabled={saveLoading} 
                    className="w-full py-3 gold-gradient text-black rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 mt-4"
                  >
                    {saveLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    حفظ تغييرات المفاتيح
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2 bg-card p-8 rounded-2xl border border-gold/10 shadow-lg space-y-6 mt-8">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Lock size={20} className="text-primary" />
                  {t('change_admin_password')}
                </h3>
                <div className="max-w-md space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">{t('new_password')}</label>
                    <input 
                      type="password" 
                      placeholder={t('password_min_length')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  {passwordSuccess && <p className="text-green-500 text-xs font-bold">{passwordSuccess}</p>}
                  <button 
                    onClick={handleChangePassword} 
                    disabled={loading}
                    className="py-3 px-8 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {t('update_password')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'monetization' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-lg text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
                  <DollarSign size={40} />
                </div>
                <h2 className="text-2xl font-bold">{t('enable_monetization')}</h2>
                <p className="text-gray-400">
                  {t('monetization_desc')}
                </p>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-right">
                  <label className="text-xs font-bold text-gray-500 mb-2 block">{t('adsense_dashboard_link')}</label>
                  <input 
                    type="text" 
                    value={settings.monetization_link || ''}
                    onChange={(e) => setSettings({...settings, monetization_link: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary mb-4"
                  />
                  <a 
                    href={settings.monetization_link || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
                  >
                    {t('open_adsense_dashboard')} <ChevronRight size={16} />
                  </a>
                </div>
                <button onClick={handleSaveSettings} disabled={saveLoading} className="w-full py-4 gold-gradient text-black rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
                  {saveLoading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                  {saveLoading ? t('saving') : t('save_changes')}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
