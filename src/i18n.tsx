import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'en' | 'tr';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
    tr: string;
  };
}

export const translations: Translations = {
  "prices_in_country": {
    ar: "أسعار الذهب في",
    en: "Gold Prices in",
    tr: "Altın Fiyatları"
  },
  "USD": { ar: 'الدولار الأمريكي', en: 'US Dollar', tr: 'ABD Doları' },
  "EUR": { ar: 'اليورو', en: 'Euro', tr: 'Euro' },
  "GBP": { ar: 'الجنيه الإسترليني', en: 'British Pound', tr: 'İngiliz Sterlini' },
  "JOD": { ar: 'الأردن', en: 'Jordan', tr: 'Ürdün' },
  "EGP": { ar: 'مصر', en: 'Egypt', tr: 'Mısır' },
  "LYD": { ar: 'ليبيا', en: 'Libya', tr: 'Libya' },
  "SAR": { ar: 'السعودية', en: 'Saudi Arabia', tr: 'Suudi Arabistan' },
  "AED": { ar: 'الإمارات', en: 'UAE', tr: 'BAE' },
  "KWD": { ar: 'الكويت', en: 'Kuwait', tr: 'Kuveyt' },
  "QAR": { ar: 'قطر', en: 'Qatar', tr: 'Katar' },
  "BHD": { ar: 'البحرين', en: 'Bahrain', tr: 'Bahreyn' },
  "OMR": { ar: 'عمان', en: 'Oman', tr: 'Umman' },
  "YER": { ar: 'اليمن', en: 'Yemen', tr: 'Yemen' },
  "share_description": {
    ar: "تابع أسعار الذهب العالمية والمحلية لحظة بلحظة مع أدق التحليلات والأخبار الاقتصادية. وجهتك الأولى للاستثمار الآمن.",
    en: "Follow global and local gold prices moment by moment with the most accurate analysis and economic news. Your first destination for safe investment.",
    tr: "En doğru analiz ve ekonomi haberleri ile küresel ve yerel altın fiyatlarını an be an takip edin. Güvenli yatırım için ilk adresiniz."
  },
  "gold_prices_today": {
    ar: "أسعار الذهب اليوم",
    en: "Gold Prices Today",
    tr: "Bugünkü Altın Fiyatları"
  },
  "site_title": {
    ar: "أسعار الذهب المباشرة",
    en: "Live Gold Prices",
    tr: "Canlı Altın Fiyatları"
  },
  "market_overview": {
    ar: "نظرة عامة على السوق",
    en: "Market Overview",
    tr: "Piyasa Genel Bakış"
  },
  "last_update": {
    ar: "آخر تحديث:",
    en: "Last Update:",
    tr: "Son Güncelleme:"
  },
  "live_market": {
    ar: "السوق مباشر",
    en: "Live Market",
    tr: "Canlı Piyasa"
  },
  "gold_24k": {
    ar: "عيار 24",
    en: "24K Gold",
    tr: "24 Ayar Altın"
  },
  "gold_22k": {
    ar: "عيار 22",
    en: "22K Gold",
    tr: "22 Ayar Altın"
  },
  "gold_21k": {
    ar: "عيار 21",
    en: "21K Gold",
    tr: "21 Ayar Altın"
  },
  "gold_18k": {
    ar: "عيار 18",
    en: "18K Gold",
    tr: "18 Ayar Altın"
  },
  "gold_calculator": {
    ar: "حاسبة الذهب",
    en: "Gold Calculator",
    tr: "Altın Hesaplayıcı"
  },
  "weight_grams": {
    ar: "الوزن (جرام)",
    en: "Weight (Grams)",
    tr: "Ağırlık (Gram)"
  },
  "enter_weight": {
    ar: "أدخل الوزن...",
    en: "Enter weight...",
    tr: "Ağırlık girin..."
  },
  "karat": {
    ar: "العيار",
    en: "Karat",
    tr: "Ayar"
  },
  "estimated_value": {
    ar: "القيمة التقديرية",
    en: "Estimated Value",
    tr: "Tahmini Değer"
  },
  "latest_news": {
    ar: "أحدث الأخبار الاقتصادية",
    en: "Latest Economic News",
    tr: "En Son Ekonomi Haberleri"
  },
  "view_all_news": {
    ar: "عرض جميع الأخبار",
    en: "View All News",
    tr: "Tüm Haberleri Gör"
  },
  "share_app": {
    ar: "مشاركة الموقع",
    en: "Share App",
    tr: "Uygulamayı Paylaş"
  },
  "link_copied": {
    ar: "تم نسخ رابط المشاركة!",
    en: "Share link copied!",
    tr: "Paylaşım bağlantısı kopyalandı!"
  },
  "subscribers_list": {
    ar: "قائمة المشتركين",
    en: "Subscribers List",
    tr: "Aboneler Listesi"
  },
  "select_all": {
    ar: "تحديد الكل",
    en: "Select All",
    tr: "Tümünü Seç"
  },
  "no_subscribers": {
    ar: "لا يوجد مشتركون",
    en: "No subscribers",
    tr: "Abone yok"
  },
  "subscribers_selected": {
    ar: "مشترك محدد",
    en: "subscriber(s) selected",
    tr: "abone seçildi"
  },
  "no_subscribers_selected": {
    ar: "سيتم الإرسال لجميع المشتركين",
    en: "Will be sent to all subscribers",
    tr: "Tüm abonelere gönderilecek"
  },
  "subscribe_alerts": {
    ar: "اشترك في تنبيهات الأسعار",
    en: "Subscribe to Price Alerts",
    tr: "Fiyat Uyarılarına Abone Ol"
  },
  "subscribe_desc": {
    ar: "كن أول من يعلم عند تغير أسعار الذهب بشكل ملحوظ في السوق العالمي.",
    en: "Be the first to know when gold prices change significantly in the global market.",
    tr: "Küresel piyasada altın fiyatları önemli ölçüde değiştiğinde ilk bilen siz olun."
  },
  "email_placeholder": {
    ar: "بريدك الإلكتروني",
    en: "Your Email Address",
    tr: "E-posta Adresiniz"
  },
  "subscribe_now": {
    ar: "اشترك الآن",
    en: "Subscribe Now",
    tr: "Şimdi Abone Ol"
  },
  "subscribe_via_google": {
    ar: "الاشتراك عبر جوجل",
    en: "Subscribe via Google",
    tr: "Google ile Abone Ol"
  },
  "enable_push_notifications": {
    ar: "تفعيل التنبيهات",
    en: "Enable Push Notifications",
    tr: "Bildirimleri Etkinleştir"
  },
  "or": {
    ar: "أو",
    en: "OR",
    tr: "VEYA"
  },
  "invalid_email": {
    ar: "البريد الإلكتروني غير صالح",
    en: "Invalid email address",
    tr: "Geçersiz e-posta adresi"
  },
  "subscribed_successfully": {
    ar: "تم الاشتراك بنجاح!",
    en: "Subscribed successfully!",
    tr: "Başarıyla abone olundu!"
  },
  "subscription_failed": {
    ar: "فشل الاشتراك، يرجى المحاولة مرة أخرى",
    en: "Subscription failed, please try again",
    tr: "Abonelik başarısız oldu, lütfen tekrar deneyin"
  },
  "google_login_failed": {
    ar: "فشل تسجيل الدخول عبر جوجل",
    en: "Google login failed",
    tr: "Google girişi başarısız oldu"
  },
  "charts_analysis": {
    ar: "الرسوم البيانية والتحليلات",
    en: "Charts and Analysis",
    tr: "Grafikler ve Analiz"
  },
  "price": {
    ar: "السعر:",
    en: "Price:",
    tr: "Fiyat:"
  },
  "date": {
    ar: "التاريخ:",
    en: "Date:",
    tr: "Tarih:"
  },
  "time": {
    ar: "الوقت:",
    en: "Time:",
    tr: "Saat:"
  },
  "selected_price": {
    ar: "السعر المختار",
    en: "Selected Price",
    tr: "Seçilen Fiyat"
  },
  "date_and_time": {
    ar: "التاريخ والوقت",
    en: "Date and Time",
    tr: "Tarih ve Saat"
  },
  "live_from_exchange": {
    ar: "مباشر من البورصة العالمية",
    en: "Live from Global Exchange",
    tr: "Küresel Borsadan Canlı"
  },
  "range": {
    ar: "النطاق:",
    en: "Range:",
    tr: "Aralık:"
  },
  "updated_now": {
    ar: "محدث الآن",
    en: "Updated Now",
    tr: "Şimdi Güncellendi"
  },
  "gold_news_markets": {
    ar: "أخبار الذهب والأسواق",
    en: "Gold and Markets News",
    tr: "Altın ve Piyasa Haberleri"
  },
  "read_more": {
    ar: "اقرأ المزيد",
    en: "Read More",
    tr: "Daha Fazla Oku"
  },
  "close": {
    ar: "إغلاق",
    en: "Close",
    tr: "Kapat"
  },
  "original_source": {
    ar: "المصدر الأصلي",
    en: "Original Source",
    tr: "Orijinal Kaynak"
  },
  "investment_tips": {
    ar: "نصائح الاستثمار في الذهب",
    en: "Gold Investment Tips",
    tr: "Altın Yatırım İpuçları"
  },
  "tip_1_title": {
    ar: "لماذا الذهب؟",
    en: "Why Gold?",
    tr: "Neden Altın?"
  },
  "tip_1_desc": {
    ar: "يعتبر الذهب ملاذاً آمناً في أوقات الأزمات الاقتصادية والتضخم.",
    en: "Gold is considered a safe haven during economic crises and inflation.",
    tr: "Altın, ekonomik krizler ve enflasyon dönemlerinde güvenli bir liman olarak kabul edilir."
  },
  "tip_2_title": {
    ar: "أفضل وقت للشراء",
    en: "Best Time to Buy",
    tr: "Satın Almak İçin En İyi Zaman"
  },
  "tip_2_desc": {
    ar: "الشراء التدريجي (متوسط التكلفة) هو أفضل استراتيجية للمستثمر طويل الأمد.",
    en: "Gradual buying (dollar-cost averaging) is the best strategy for a long-term investor.",
    tr: "Kademeli alım (maliyet ortalaması), uzun vadeli bir yatırımcı için en iyi stratejidir."
  },
  "tip_3_title": {
    ar: "السبائك أم المشغولات؟",
    en: "Bars or Jewelry?",
    tr: "Külçe mi, Mücevher mi?"
  },
  "tip_3_desc": {
    ar: "السبائك والعملات الذهبية أفضل للاستثمار لقلة المصنعية مقارنة بالمشغولات.",
    en: "Gold bars and coins are better for investment due to lower making charges compared to jewelry.",
    tr: "Külçe ve altın paralar, mücevherlere kıyasla daha düşük işçilik maliyetleri nedeniyle yatırım için daha iyidir."
  },
  "tip_4_title": {
    ar: "التنويع",
    en: "Diversification",
    tr: "Çeşitlendirme"
  },
  "tip_4_desc": {
    ar: "لا تضع كل مدخراتك في الذهب؛ اجعل الذهب جزءاً من محفظة استثمارية متنوعة.",
    en: "Don't put all your savings in gold; make gold part of a diversified investment portfolio.",
    tr: "Tüm birikimlerinizi altına yatırmayın; altını çeşitlendirilmiş bir yatırım portföyünün parçası yapın."
  },
  "about_title": {
    ar: "عن مراقب الذهب",
    en: "About Gold Monitor",
    tr: "Altın Monitörü Hakkında"
  },
  "about_desc": {
    ar: "منصة \"مراقب الذهب\" هي وجهتك الأولى لمتابعة أسعار الذهب العالمية والمحلية لحظة بلحظة. نهدف إلى تقديم بيانات دقيقة وموثوقة للمستثمرين والمهتمين بسوق الذهب، مع توفير أدوات تحليلية وأخبار اقتصادية شاملة.",
    en: "The \"Gold Monitor\" platform is your first destination to follow global and local gold prices moment by moment. We aim to provide accurate and reliable data for investors and those interested in the gold market, while providing comprehensive analytical tools and economic news.",
    tr: "\"Altın Monitörü\" platformu, küresel ve yerel altın fiyatlarını an be an takip etmek için ilk durağınızdır. Yatırımcılar ve altın piyasasıyla ilgilenenler için doğru ve güvenilir veriler sunmayı, aynı zamanda kapsamlı analitik araçlar ve ekonomi haberleri sağlamayı hedefliyoruz."
  },
  "live_update": {
    ar: "تحديث مباشر",
    en: "Live Update",
    tr: "Canlı Güncelleme"
  },
  "data_accuracy": {
    ar: "دقة البيانات",
    en: "Data Accuracy",
    tr: "Veri Doğruluğu"
  },
  "free_service": {
    ar: "خدمة مجانية",
    en: "Free Service",
    tr: "Ücretsiz Hizmet"
  },
  "nav_home": {
    ar: "الرئيسية",
    en: "Home",
    tr: "Ana Sayfa"
  },
  "nav_charts": {
    ar: "الرسوم البيانية",
    en: "Charts",
    tr: "Grafikler"
  },
  "nav_charts_short": {
    ar: "الرسوم",
    en: "Charts",
    tr: "Grafikler"
  },
  "nav_news": {
    ar: "الأخبار",
    en: "News",
    tr: "Haberler"
  },
  "nav_tips": {
    ar: "نصائح",
    en: "Tips",
    tr: "İpuçları"
  },
  "nav_about": {
    ar: "عن الموقع",
    en: "About",
    tr: "Hakkında"
  },
  "refreshing": {
    ar: "تحديث...",
    en: "Refreshing...",
    tr: "Yenileniyor..."
  },
  "refresh": {
    ar: "تحديث",
    en: "Refresh",
    tr: "Yenile"
  },
  "admin_login": {
    ar: "دخول المشرف",
    en: "Admin Login",
    tr: "Yönetici Girişi"
  },
  "ad_header": {
    ar: "إعلان الهيدر",
    en: "Header Ad",
    tr: "Üst Reklam"
  },
  "ad_sidebar": {
    ar: "إعلان جانبي",
    en: "Sidebar Ad",
    tr: "Yan Reklam"
  },
  "admin_settings": {
    ar: "إعدادات المشرف",
    en: "Admin Settings",
    tr: "Yönetici Ayarları"
  },
  "yemen_region_customization": {
    ar: "تخصيص المنطقة (اليمن)",
    en: "Region Customization (Yemen)",
    tr: "Bölge Özelleştirme (Yemen)"
  },
  "choose_region_desc": {
    ar: "اختر المنطقة لعرض الأسعار المحلية بدقة حسب السوق",
    en: "Choose the region to display local prices accurately according to the market",
    tr: "Piyasaya göre yerel fiyatları doğru bir şekilde görüntülemek için bölgeyi seçin"
  },
  "sanaa": {
    ar: "صنعاء",
    en: "Sanaa",
    tr: "Sana"
  },
  "aden": {
    ar: "عدن",
    en: "Aden",
    tr: "Aden"
  },
  "logged_in_as_admin": {
    ar: "أنت مسجل دخول كمسؤول",
    en: "You are logged in as an admin",
    tr: "Yönetici olarak giriş yaptınız"
  },
  "open_dashboard": {
    ar: "فتح لوحة التحكم",
    en: "Open Dashboard",
    tr: "Kontrol Panelini Aç"
  },
  "footer_desc": {
    ar: "أدق منصة لمتابعة أسعار الذهب العالمية والمحلية لحظة بلحظة مع تحليلات فنية شاملة.",
    en: "The most accurate platform to follow global and local gold prices moment by moment with comprehensive technical analysis.",
    tr: "Kapsamlı teknik analizlerle küresel ve yerel altın fiyatlarını an be an takip etmek için en doğru platform."
  },
  "all_rights_reserved": {
    ar: "جميع الحقوق محفوظة © 2026",
    en: "All rights reserved © 2026",
    tr: "Tüm hakları saklıdır © 2026"
  },
  "logout": {
    ar: "تسجيل الخروج",
    en: "Logout",
    tr: "Çıkış Yap"
  },
  "meta_desc_home": {
    ar: "تابع أسعار الذهب العالمية والمحلية لحظة بلحظة مع رسوم بيانية تفاعلية وأحدث الأخبار الاقتصادية.",
    en: "Follow global and local gold prices moment by moment with interactive charts and the latest economic news.",
    tr: "Etkileşimli grafikler ve en son ekonomi haberleriyle küresel ve yerel altın fiyatlarını an be an takip edin."
  },
  "meta_keywords_home": {
    ar: "أسعار الذهب اليوم, سعر الذهب مباشر, الذهب في السعودية, الذهب في الإمارات, الذهب في الكويت, الذهب في قطر, الذهب في البحرين, الذهب في عمان, حاسبة الذهب, اخبار الذهب اليوم",
    en: "gold prices today, live gold price, gold in Saudi Arabia, gold in UAE, gold in Kuwait, gold in Qatar, gold in Bahrain, gold in Oman, gold calculator, gold news today",
    tr: "bugün altın fiyatları, canlı altın fiyatı, Suudi Arabistan'da altın, BAE'de altın, Kuveyt'te altın, Katar'da altın, Bahreyn'de altın, Umman'da altın, altın hesaplayıcı, bugün altın haberleri"
  },
  "meta_desc_charts": {
    ar: "تحليل تقني ورسوم بيانية تفاعلية لأسعار الذهب العالمية والمحلية.",
    en: "Technical analysis and interactive charts for global and local gold prices.",
    tr: "Küresel ve yerel altın fiyatları için teknik analiz ve etkileşimli grafikler."
  },
  "meta_desc_news": {
    ar: "تغطية شاملة لأحدث أخبار الذهب والأسواق المالية العالمية.",
    en: "Comprehensive coverage of the latest gold news and global financial markets.",
    tr: "En son altın haberleri ve küresel finans piyasalarının kapsamlı kapsamı."
  },
  "meta_desc_tips": {
    ar: "دليلك الشامل للاستثمار في الذهب وكيفية الحفاظ على قيمة مدخراتك.",
    en: "Your comprehensive guide to investing in gold and how to preserve the value of your savings.",
    tr: "Altına yatırım yapmak ve tasarruflarınızın değerini nasıl koruyacağınız konusunda kapsamlı rehberiniz."
  },
  "meta_desc_about": {
    ar: "تعرف على منصة مراقب الذهب وأهدافنا في تقديم أدق البيانات المالية.",
    en: "Learn about the Gold Monitor platform and our goals in providing the most accurate financial data.",
    tr: "Altın Monitörü platformu ve en doğru finansal verileri sağlama hedeflerimiz hakkında bilgi edinin."
  },
  "ad_content": {
    ar: "إعلان وسط المحتوى",
    en: "Content Ad",
    tr: "İçerik Reklamı"
  },
  // Admin Dashboard
  "admin_dashboard": { ar: 'لوحة التحكم', en: 'Admin Dashboard', tr: 'Yönetici Paneli' },
  "enter_password": { ar: 'أدخل كلمة المرور للمتابعة', en: 'Enter password to continue', tr: 'Devam etmek için şifreyi girin' },
  "password": { ar: 'كلمة المرور', en: 'Password', tr: 'Şifre' },
  "verifying": { ar: 'جاري التحقق...', en: 'Verifying...', tr: 'Doğrulanıyor...' },
  "login": { ar: 'تسجيل الدخول', en: 'Login', tr: 'Giriş Yap' },
  "back_to_site": { ar: 'العودة للموقع', en: 'Back to Site', tr: 'Siteye Dön' },
  "admin_panel": { ar: 'لوحة الإدارة', en: 'Admin Panel', tr: 'Yönetim Paneli' },
  "overview": { ar: 'نظرة عامة', en: 'Overview', tr: 'Genel Bakış' },
  "notifications": { ar: 'التنبيهات', en: 'Notifications', tr: 'Bildirimler' },
  "news_and_ads": { ar: 'الأخبار والإعلانات', en: 'News & Ads', tr: 'Haberler ve Reklamlar' },
  "exchange_rates": { ar: 'أسعار الصرف', en: 'Exchange Rates', tr: 'Döviz Kurları' },
  "settings_and_ads": { ar: 'الإعدادات والإعلانات', en: 'Settings & Ads', tr: 'Ayarlar ve Reklamlar' },
  "monetization": { ar: 'الربح من الإعلانات', en: 'Monetization', tr: 'Para Kazanma' },
  "manage_notifications": { ar: 'إدارة التنبيهات', en: 'Manage Notifications', tr: 'Bildirimleri Yönet' },
  "manage_news": { ar: 'إدارة الأخبار', en: 'Manage News', tr: 'Haberleri Yönet' },
  "manage_rates": { ar: 'إدارة أسعار الصرف', en: 'Manage Exchange Rates', tr: 'Kurları Yönet' },
  "site_settings": { ar: 'إعدادات الموقع', en: 'Site Settings', tr: 'Site Ayarları' },
  "today_visits": { ar: 'زيارات اليوم', en: 'Today\'s Visits', tr: 'Bugünkü Ziyaretler' },
  "week_visits": { ar: 'زيارات الأسبوع', en: 'Week\'s Visits', tr: 'Haftalık Ziyaretler' },
  "total_news": { ar: 'إجمالي الأخبار', en: 'Total News', tr: 'Toplam Haberler' },
  "total_visits": { ar: 'إجمالي الزيارات', en: 'Total Visits', tr: 'Toplam Ziyaretler' },
  "traffic_analysis": { ar: 'تحليل الزيارات (آخر 30 يوم)', en: 'Traffic Analysis (Last 30 Days)', tr: 'Trafik Analizi (Son 30 Gün)' },
  "send_new_alert": { ar: 'إرسال تنبيه جديد', en: 'Send New Alert', tr: 'Yeni Uyarı Gönder' },
  "alert_title": { ar: 'عنوان التنبيه', en: 'Alert Title', tr: 'Uyarı Başlığı' },
  "alert_content": { ar: 'محتوى التنبيه', en: 'Alert Content', tr: 'Uyarı İçeriği' },
  "send_now": { ar: 'إرسال الآن', en: 'Send Now', tr: 'Şimdi Gönder' },
  "alert_history": { ar: 'سجل التنبيهات', en: 'Alert History', tr: 'Uyarı Geçmişi' },
  "back_to_list": { ar: 'العودة للقائمة', en: 'Back to List', tr: 'Listeye Dön' },
  "likes": { ar: 'إعجاب', en: 'Likes', tr: 'Beğeniler' },
  "views": { ar: 'مشاهدة', en: 'Views', tr: 'Görüntülenmeler' },
  "original_source_link": { ar: 'المصدر الأصلي', en: 'Original Source', tr: 'Orijinal Kaynak' },
  "publish_admin_ad": { ar: 'نشر إعلان إداري', en: 'Publish Admin Ad', tr: 'Yönetici Reklamı Yayınla' },
  "ad_title": { ar: 'عنوان الإعلان', en: 'Ad Title', tr: 'Reklam Başlığı' },
  "ad_content_placeholder": { ar: 'محتوى الإعلان', en: 'Ad Content', tr: 'Reklam İçeriği' },
  "publish_ad": { ar: 'نشر الإعلان', en: 'Publish Ad', tr: 'Reklamı Yayınla' },
  "news_table_header": { ar: 'الخبر', en: 'News', tr: 'Haber' },
  "source_table_header": { ar: 'المصدر', en: 'Source', tr: 'Kaynak' },
  "interaction_table_header": { ar: 'التفاعل', en: 'Interaction', tr: 'Etkileşim' },
  "actions_table_header": { ar: 'إجراءات', en: 'Actions', tr: 'İşlemler' },
  "edit_exchange_rates": { ar: 'تعديل أسعار الصرف (مقابل الدولار)', en: 'Edit Exchange Rates (vs USD)', tr: 'Döviz Kurlarını Düzenle (USD\'ye karşı)' },
  "rates_note": { ar: 'ملاحظة: يتم تحديث هذه الأسعار تلقائياً كل ساعة، ولكن يمكنك تعديلها يدوياً هنا.', en: 'Note: These rates are updated automatically every hour, but you can edit them manually here.', tr: 'Not: Bu kurlar her saat otomatik olarak güncellenir, ancak buradan manuel olarak düzenleyebilirsiniz.' },
  "save_rates": { ar: 'حفظ أسعار الصرف', en: 'Save Exchange Rates', tr: 'Kurları Kaydet' },
  "saving": { ar: 'جاري الحفظ...', en: 'Saving...', tr: 'Kaydediliyor...' },
  "basic_site_settings": { ar: 'إعدادات الموقع الأساسية', en: 'Basic Site Settings', tr: 'Temel Site Ayarları' },
  "site_name": { ar: 'اسم الموقع', en: 'Site Name', tr: 'Site Adı' },
  "email": { ar: 'البريد الإلكتروني', en: 'Email', tr: 'E-posta' },
  "primary_color": { ar: 'اللون الأساسي', en: 'Primary Color', tr: 'Birincil Renk' },
  "secondary_color": { ar: 'اللون الثانوي', en: 'Secondary Color', tr: 'İkincil Renk' },
  "adsense_management": { ar: 'إدارة الإعلانات (AdSense)', en: 'Ad Management (AdSense)', tr: 'Reklam Yönetimi (AdSense)' },
  "header_ad": { ar: 'إعلان الهيدر (Header)', en: 'Header Ad', tr: 'Üst Reklam (Header)' },
  "sidebar_ad": { ar: 'إعلان الشريط الجانبي (Sidebar)', en: 'Sidebar Ad', tr: 'Kenar Çubuğu Reklamı (Sidebar)' },
  "content_ad": { ar: 'إعلان وسط المحتوى', en: 'Content Ad', tr: 'İçerik Reklamı' },
  "ad_code_placeholder": { ar: 'كود الإعلان هنا...', en: 'Ad code here...', tr: 'Reklam kodu buraya...' },
  "save_all_settings": { ar: 'حفظ جميع الإعدادات', en: 'Save All Settings', tr: 'Tüm Ayarları Kaydet' },
  "change_admin_password": { ar: 'تغيير كلمة مرور الإدارة', en: 'Change Admin Password', tr: 'Yönetici Şifresini Değiştir' },
  "new_password": { ar: 'كلمة المرور الجديدة', en: 'New Password', tr: 'Yeni Şifre' },
  "password_min_length": { ar: '6 أحرف على الأقل', en: 'At least 6 characters', tr: 'En az 6 karakter' },
  "update_password": { ar: 'تحديث كلمة المرور', en: 'Update Password', tr: 'Şifreyi Güncelle' },
  "enable_monetization": { ar: 'تفعيل الربح من الإعلانات', en: 'Enable Monetization', tr: 'Para Kazanmayı Etkinleştir' },
  "monetization_desc": { ar: 'يمكنك البدء في جني الأرباح من خلال دمج كود Google AdSense في موقعك. تأكد من مراجعة سياسات الإعلانات قبل البدء.', en: 'You can start earning by integrating Google AdSense code into your site. Make sure to review ad policies before starting.', tr: 'Sitenize Google AdSense kodunu entegre ederek para kazanmaya başlayabilirsiniz. Başlamadan önce reklam politikalarını incelediğinizden emin olun.' },
  "adsense_dashboard_link": { ar: 'رابط لوحة تحكم الإعلانات', en: 'Ad Dashboard Link', tr: 'Reklam Paneli Bağlantısı' },
  "open_adsense_dashboard": { ar: 'فتح لوحة تحكم AdSense', en: 'Open AdSense Dashboard', tr: 'AdSense Panelini Aç' },
  "save_changes": { ar: 'حفظ التغييرات', en: 'Save Changes', tr: 'Değişiklikleri Kaydet' },
  "error_password_length": { ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', en: 'Password must be at least 6 characters', tr: 'Şifre en az 6 karakter olmalıdır' },
  "success_password_changed": { ar: 'تم تغيير كلمة المرور بنجاح', en: 'Password changed successfully', tr: 'Şifre başarıyla değiştirildi' },
  "error_password_change_failed": { ar: 'فشل تغيير كلمة المرور', en: 'Failed to change password', tr: 'Şifre değiştirilemedi' },
  "success_settings_saved": { ar: 'تم حفظ الإعدادات بنجاح', en: 'Settings saved successfully', tr: 'Ayarlar başarıyla kaydedildi' },
  "error_settings_save_failed": { ar: 'فشل حفظ الإعدادات', en: 'Failed to save settings', tr: 'Ayarlar kaydedilemedi' },
  "success_rates_saved": { ar: 'تم حفظ أسعار الصرف بنجاح', en: 'Exchange rates saved successfully', tr: 'Döviz kurları başarıyla kaydedildi' },
  "error_rates_save_failed": { ar: 'فشل حفظ أسعار الصرف', en: 'Failed to save exchange rates', tr: 'Döviz kurları kaydedilemedi' },
  "success_alert_sent": { ar: 'تم إرسال التنبيه بنجاح', en: 'Alert sent successfully', tr: 'Uyarı başarıyla gönderildi' },
  "error_alert_send_failed": { ar: 'فشل إرسال التنبيه', en: 'Failed to send alert', tr: 'Uyarı gönderilemedi' },
  "success_ad_published": { ar: 'تم نشر الإعلان بنجاح', en: 'Ad published successfully', tr: 'Reklam başarıyla yayınlandı' },
  "error_ad_publish_failed": { ar: 'فشل نشر الإعلان', en: 'Failed to publish ad', tr: 'Reklam yayınlanamadı' },
  "confirm_delete_news": { ar: 'هل أنت متأكد من حذف هذا الخبر؟', en: 'Are you sure you want to delete this news?', tr: 'Bu haberi silmek istediğinizden emin misiniz?' },
  "success_news_deleted": { ar: 'تم حذف الخبر بنجاح', en: 'News deleted successfully', tr: 'Haber başarıyla silindi' },
  "error_news_delete_failed": { ar: 'فشل حذف الخبر', en: 'Failed to delete news', tr: 'Haber silinemedi' },
  "yemen_rial_sanaa": { ar: 'الريال اليمني (صنعاء)', en: 'Yemeni Rial (Sanaa)', tr: 'Yemen Riyali (Sana)' },
  "yemen_rial_aden": { ar: 'الريال اليمني (عدن)', en: 'Yemeni Rial (Aden)', tr: 'Yemen Riyali (Aden)' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    // Detect language on mount
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && ['ar', 'en', 'tr'].includes(savedLang)) {
      setLanguage(savedLang);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('ar')) {
        setLanguage('ar');
      } else if (browserLang.startsWith('tr')) {
        setLanguage('tr');
      } else {
        setLanguage('en');
      }
    }
  }, []);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
