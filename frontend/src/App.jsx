import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Shield, TrendingUp, Briefcase, FileText, ShoppingCart, 
  MapPin, Phone, Truck, HardDrive, HelpCircle, Loader, MessageSquare, AlertTriangle, Check
} from 'lucide-react';
import './App.css';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://127.0.0.1:8000/api/v1"
  : "https://agrobalance-backend-image.onrender.com/api/v1";

const TRANSLATIONS = {
  ru: {
    app_title: "🌾 AgroBalance",
    trust_index: "ТИ",
    wallet: "Кошелек ⚡",
    profile: "Профиль",
    market: "Рынок",
    ai_advice: "AI Советы",
    select_lang: "Выберите язык / Select Language",
    select_lang_desc: "Выберите язык интерфейса для продолжения / Select language to continue",
    step1_role: "Шаг 1: Роль на рынке",
    step2_contacts: "Шаг 2: Контакты",
    org_name: "Организация / Имя",
    phone_num: "Телефон",
    region: "Регион деятельности",
    next: "Далее",
    back: "Назад",
    register: "Зарегистрироваться",
    rank_title: "Репутация AgroBalance",
    rank_ti: "TI",
    rank_bonus: "⚡ Привилегии:",
    lvl2_title: "⭐ Верификация деятельности",
    lvl2_desc: "Заполните сведения, чтобы разблокировать создание сделок и повысить рейтинг (+30 TI).",
    farm_area: "Площадь хозяйства (га)",
    primary_crop: "Основная культура",
    expected_yield: "Ожидаемый урожай (тонн)",
    field_photo_url: "Фото поля (ссылка)",
    gps_lat: "Широта GPS",
    gps_lng: "Долгота GPS",
    needed_crops: "Закупаемые культуры",
    payment_terms: "Условия оплаты",
    delivery_terms: "Условия доставки",
    truck_type: "Тип зерновоза",
    truck_capacity: "Грузоподъемность (тонн)",
    tariff_km: "Тариф (руб / км)",
    wh_capacity: "Емкость элеватора (тонн)",
    wh_storage_price: "Цена хранения (руб/тонна в месяц)",
    btn_verify: "Подтвердить данные",
    card_title: "Карточка",
    card_name: "Имя:",
    card_phone: "Телефон:",
    card_region: "Регион:",
    card_area: "Площадь:",
    card_crop: "Культура:",
    card_expected: "Урожай:",
    card_purchases: "Закупки:",
    card_terms: "Условия:",
    deals_title: "Сделки",
    no_deals: "Сделок нет",
    sale_offers: "Продажа (Фермеры)",
    purchase_requests: "Покупка (Покупатели)",
    propose_deal: "Предложить сделку",
    deal_locked: "🔒 Требуется верификация в Профиле.",
    ai_title: "AI Аналитика спроса и цен",
    ai_desc: "AI-анализ спроса, цен и погодных рисков в вашем регионе.",
    ai_update: "Обновить данные AI",
    ai_locked: "🔒 Требуется верификация в Профиле.",
    risk_level: "Уровень риска",
    sell_timeline: "Сроки реализации",
    why_profitable: "Преимущества:",
    what_wrong: "Риски:",
    what_next: "Шаги к сделке:",
    matching_buyers: "🎯 Рекомендуемые контрагенты:",
    trust_index_label: "Доверие (TI):",
    deal_back: "← Назад",
    deal_details: "Детали сделки",
    deal_crop: "Культура:",
    deal_volume: "Объем:",
    deal_price: "Цена за тонну:",
    deal_total: "Итого:",
    deal_status: "Статус:",
    escrow_title: "🛡️ Escrow-счет (Безопасная сделка)",
    escrow_total_product: "Товар:",
    escrow_fee: "Сервисный сбор (1%):",
    escrow_total_pay: "К блокировке в Escrow:",
    btn_accept: "Принять условия",
    btn_pay_method: "💳 Выберите способ оплаты:",
    btn_card: "Карта 💳",
    btn_stars: "Stars ⭐",
    btn_ton: "TON 💎",
    btn_confirm_pay: "Оплатить",
    btn_confirm_delivery: "Доставка завершена",
    btn_confirm_recv: "Приемка подтверждена",
    btn_dispute: "Открыть спор (Арбитраж)",
    btn_cancel: "Отменить сделку",
    chat_title: "Чат (Защита от обхода Escrow)",
    chat_placeholder: "Сообщение...",
    chat_send: "Отправить",
    alert_verification_success: "Данные верифицированы! Ваш статус повышен.",
    alert_wallet_connect_first: "Подключите TON-кошелек кнопкой Wallet ⚡ вверху экрана!",
    alert_tx_confirmed: "🚀 Транзакция подтверждена! Средства заблокированы в TON.",
    alert_bypass_warning: "Внимание! Обнаружена попытка отправки контактов в обход комиссии. Рейтинг снижен!",
    roles: {
      Farmer: "Фермер",
      Buyer: "Покупатель",
      Carrier: "Перевозчик",
      Warehouse: "Склад / Элеватор",
      Processor: "Переработчик",
      Supplier: "Поставщик",
      Agronomist: "Агроэксперт",
      Admin: "Администратор"
    },
    role_descriptions: {
      Farmer: "Продажа урожая",
      Buyer: "Закупка зерновых и культур",
      Carrier: "Перевозка зерновозами",
      Warehouse: "Хранение продукции",
      Processor: "Переработка сырья",
      Supplier: "Удобрения, техника, семена",
      Agronomist: "Консалтинг и аудит",
    },
    regions: {
      "Европа": "Европа",
      "СНГ": "СНГ",
      "Азия": "Азия и Океания",
      "Северная Америка": "Северная Америка",
      "Латинская Америка": "Латинская Америка",
      "Ближний Восток": "Ближний Восток и Африка"
    },
    countries: {
      "Германия": "Германия", "Франция": "Франция", "Италия": "Италия", "Испания": "Испания",
      "Польша": "Польша", "Нидерланды": "Нидерланды", "Великобритания": "Великобритания",
      "Румыния": "Румыния", "Другая страна": "Другая страна",
      "Россия": "Россия", "Казахстан": "Казахстан", "Беларусь": "Беларусь", "Узбекистан": "Узбекистан",
      "Азербайджан": "Азербайджан", "Кыргызстан": "Кыргызстан", "Армения": "Армения",
      "Таджикистан": "Таджикистан", "Молдова": "Молдова",
      "Китай": "Китай", "Индия": "Индия", "Турция": "Турция", "Иран": "Иран",
      "Вьетнам": "Вьетнам", "Таиланд": "Таиланд", "Пакистан": "Пакистан",
      "США": "США", "Канада": "Канада", "Мексика": "Мексика",
      "Бразилия": "Бразилия", "Аргентина": "Аргентина", "Колумбия": "Колумбия",
      "Чили": "Чили", "Перу": "Перу",
      "ОАЭ": "ОАЭ", "Саудовская Аравия": "Саудовская Аравия", "Египет": "Египет",
      "ЮАР": "ЮАР", "Нигерия": "Нигерия", "Кения": "Кения"
    },
    tiers: {
      gold: { name: "🏆 Золотой Партнер", desc: "Комиссия 1% • Скидка 10% на складах • Макс. приоритет" },
      silver: { name: "🥈 Серебряный Партнер", desc: "Повышенные лимиты • Приоритетный подбор транспорта" },
      bronze: { name: "🥉 Бронзовый Участник", desc: "Стандартный доступ к рынку и аналитике" },
      novice: { name: "⚠️ Новичок", desc: "Лимитированный доступ. Требуется верификация" }
    },
    statuses: {
      proposed: "Предложена",
      accepted: "Согласована",
      paid_to_escrow: "Оплачена (Escrow)",
      delivered: "Доставлена",
      completed: "Завершена",
      disputed: "Спор",
      cancelled: "Отменена"
    },
    unit_ha: "га",
    unit_tons: "т",
    rubles: "руб.",
    payment_method_val: {
      ton: "TON Crypto",
      stars: "Stars",
      card: "Рубли"
    }
  },
  en: {
    app_title: "🌾 AgroBalance",
    trust_index: "TI",
    wallet: "Wallet ⚡",
    profile: "Profile",
    market: "Market",
    ai_advice: "AI Advice",
    select_lang: "Select Language / Выберите язык",
    select_lang_desc: "Select language to continue / Выберите язык интерфейса для продолжения",
    step1_role: "Step 1: Market Role",
    step2_contacts: "Step 2: Contacts",
    org_name: "Organization / Name",
    phone_num: "Phone",
    region: "Region of activity",
    next: "Next",
    back: "Back",
    register: "Register",
    rank_title: "AgroBalance Reputation",
    rank_ti: "TI",
    rank_bonus: "⚡ Privileges:",
    lvl2_title: "⭐ Activity Verification",
    lvl2_desc: "Fill in activity details to unlock deal creation and gain +30 TI.",
    farm_area: "Farm area (ha)",
    primary_crop: "Primary crop",
    expected_yield: "Expected yield (tons)",
    field_photo_url: "Field photo link",
    gps_lat: "GPS Latitude",
    gps_lng: "GPS Longitude",
    needed_crops: "Crops to purchase",
    payment_terms: "Payment terms",
    delivery_terms: "Delivery terms",
    truck_type: "Truck type",
    truck_capacity: "Capacity (tons)",
    tariff_km: "Tariff (RUB / km)",
    wh_capacity: "Warehouse capacity (tons)",
    wh_storage_price: "Storage fee (RUB/ton per month)",
    btn_verify: "Submit Details",
    card_title: "Card",
    card_name: "Name:",
    card_phone: "Phone:",
    card_region: "Region:",
    card_area: "Area:",
    card_crop: "Crop:",
    card_expected: "Yield:",
    card_purchases: "Purchases:",
    card_terms: "Terms:",
    deals_title: "Deals",
    no_deals: "No deals",
    sale_offers: "Sale Offers (Farmers)",
    purchase_requests: "Purchase Requests (Buyers)",
    propose_deal: "Propose Deal",
    deal_locked: "🔒 Profile verification required.",
    ai_title: "AI Demand & Price Analytics",
    ai_desc: "AI analysis of local demand, prices, and weather risks.",
    ai_update: "Update AI Data",
    ai_locked: "🔒 Profile verification required.",
    risk_level: "Risk level",
    sell_timeline: "Sales timeline",
    why_profitable: "Benefits:",
    what_wrong: "Risks:",
    what_next: "Next steps:",
    matching_buyers: "🎯 Recommended Counterparties:",
    trust_index_label: "Trust Index (TI):",
    deal_back: "← Back",
    deal_details: "Deal Details",
    deal_crop: "Crop:",
    deal_volume: "Volume:",
    deal_price: "Price per ton:",
    deal_total: "Total:",
    deal_status: "Status:",
    escrow_title: "🛡️ Escrow Account (Secure Deal)",
    escrow_total_product: "Goods:",
    escrow_fee: "Service Fee (1%):",
    escrow_total_pay: "To Lock in Escrow:",
    btn_accept: "Accept Conditions",
    btn_pay_method: "💳 Choose payment method:",
    btn_card: "Card 💳",
    btn_stars: "Stars ⭐",
    btn_ton: "TON 💎",
    btn_confirm_pay: "Pay",
    btn_confirm_delivery: "Delivery Completed",
    btn_confirm_recv: "Receipt Confirmed",
    btn_dispute: "Open dispute (Arbitration)",
    btn_cancel: "Cancel Deal",
    chat_title: "Chat (Escrow bypass protection)",
    chat_placeholder: "Message...",
    chat_send: "Send",
    alert_verification_success: "Details verified! Your rank has been upgraded.",
    alert_wallet_connect_first: "Connect TON wallet using the Wallet ⚡ button at the top!",
    alert_tx_confirmed: "🚀 Transaction confirmed! Funds locked in TON.",
    alert_bypass_warning: "Warning! Attempt to share contacts outside escrow. Rating penalized!",
    roles: {
      Farmer: "Farmer",
      Buyer: "Buyer",
      Carrier: "Carrier",
      Warehouse: "Warehouse / Storage",
      Processor: "Processor",
      Supplier: "Supplier",
      Agronomist: "Agronomist",
      Admin: "Administrator"
    },
    role_descriptions: {
      Farmer: "Selling harvest",
      Buyer: "Purchasing crops",
      Carrier: "Transporting crops",
      Warehouse: "Storing crops",
      Processor: "Processing crops",
      Supplier: "Seeds & fertilizers",
      Agronomist: "Consulting & audits",
    },
    regions: {
      "Европа": "Europe",
      "СНГ": "CIS",
      "Азия": "Asia & Pacific",
      "Северная Америка": "North America",
      "Латинская Америка": "Latin America",
      "Ближний Восток": "Middle East & Africa"
    },
    countries: {
      "Германия": "Germany", "Франция": "France", "Италия": "Italy", "Испания": "Spain",
      "Польша": "Poland", "Нидерланды": "Netherlands", "Великобритания": "United Kingdom",
      "Румыния": "Romania", "Другая страна": "Other Country",
      "Россия": "Russia", "Казахстан": "Kazakhstan", "Беларусь": "Belarus", "Узбекистан": "Uzbekistan",
      "Азербайджан": "Azerbaijan", "Кыргызстан": "Kyrgyzstan", "Армения": "Armenia",
      "Таджикистан": "Tajikistan", "Молдова": "Moldova",
      "Китай": "China", "Индия": "India", "Турция": "Turkey", "Иран": "Iran",
      "Вьетнам": "Vietnam", "Таиланд": "Thailand", "Пакистан": "Pakistan",
      "США": "USA", "Канада": "Canada", "Мексика": "Mexico",
      "Бразилия": "Brazil", "Аргентина": "Argentina", "Колумбия": "Colombia",
      "Чили": "Chile", "Перу": "Peru",
      "ОАЭ": "UAE", "Саудовская Аравия": "Saudi Arabia", "Египет": "Egypt",
      "ЮАР": "South Africa", "Нигерия": "Nigeria", "Кения": "Kenya"
    },
    tiers: {
      gold: { name: "🏆 Gold Partner", desc: "1% fee • 10% storage discount • Max priority" },
      silver: { name: "🥈 Silver Partner", desc: "Increased limits • Transport matchmaking priority" },
      bronze: { name: "🥉 Bronze Member", desc: "Standard market & analytics access" },
      novice: { name: "⚠️ Novice", desc: "Limited access. Verification in Profile required" }
    },
    statuses: {
      proposed: "Proposed",
      accepted: "Agreed",
      paid_to_escrow: "Paid (Escrow)",
      delivered: "Delivered",
      completed: "Completed",
      disputed: "Disputed",
      cancelled: "Cancelled"
    },
    unit_ha: "ha",
    unit_tons: "t",
    rubles: "RUB",
    payment_method_val: {
      ton: "TON Crypto",
      stars: "Stars",
      card: "Rubles"
    }
  }
};

const COUNTRIES_BY_REGION = {
  "Европа": ["Германия", "Франция", "Италия", "Испания", "Польша", "Нидерланды", "Великобритания", "Румыния", "Другая страна"],
  "СНГ": ["Россия", "Казахстан", "Беларусь", "Узбекистан", "Азербайджан", "Кыргызстан", "Армения", "Таджикистан", "Молдова"],
  "Азия": ["Китай", "Индия", "Турция", "Иран", "Вьетнам", "Таиланд", "Пакистан", "Другая страна"],
  "Северная Америка": ["США", "Канада", "Мексика"],
  "Латинская Америка": ["Бразилия", "Аргентина", "Колумбия", "Чили", "Перу"],
  "Ближний Восток": ["ОАЭ", "Саудовская Аравия", "Египет", "ЮАР", "Нигерия", "Кения"]
};

const LOCALITIES_BY_COUNTRY = {
  "Россия": ["Краснодарский край", "Ростовская область", "Ставропольский край", "Алтайский край", "Воронежская область", "Белгородская область", "Саратовская область", "Другой регион"],
  "Казахстан": ["Акмолинская область", "Костанайская область", "Северо-Казахстанская область", "Алматинская область", "Другой регион"],
  "Беларусь": ["Минская область", "Гродненская область", "Брестская область", "Другой регион"],
  "Узбекистан": ["Ташкентская область", "Самаркандская область", "Ферганская область", "Другой регион"],
  "Германия": ["Bavaria", "Lower Saxony", "North Rhine-Westphalia", "Brandenburg", "Other Region"],
  "Франция": ["Centre-Val de Loire", "Grand Est", "Nouvelle-Aquitaine", "Hauts-de-France", "Other Region"],
  "Польша": ["Greater Poland", "Masovian", "Lublin", "Other Region"],
  "США": ["Iowa", "Illinois", "Nebraska", "Minnesota", "Texas", "Kansas", "Other State"],
  "Канада": ["Saskatchewan", "Alberta", "Manitoba", "Ontario", "Other Province"],
  "Бразилия": ["Mato Grosso", "Paraná", "Rio Grande do Sul", "Goiás", "Other State"],
  "Аргентина": ["Buenos Aires", "Córdoba", "Santa Fe", "Other Province"],
  "Китай": ["Heilongjiang", "Henan", "Shandong", "Anhui", "Other Province"],
  "Индия": ["Punjab", "Uttar Pradesh", "Haryana", "Madhya Pradesh", "Other State"],
  "Турция": ["Central Anatolia", "Aegean", "Marmara", "Other Region"],
  "Египет": ["Nile Delta", "Upper Egypt", "Other Region"],
  "ЮАР": ["Free State", "Western Cape", "Gauteng", "Other Province"]
};

function App() {
  const [view, setView] = useState('lang-select'); // lang-select, registration, dashboard, market, recommendations, deal-detail
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'ru');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const getCurrency = (region) => {
    const macroRegion = region && region.includes(':') ? region.split(':')[0].trim() : region;
    switch (macroRegion) {
      case 'Европа':
        return 'EUR';
      case 'СНГ':
        return 'RUB';
      case 'Северная Америка':
      case 'Латинская Америка':
      case 'Азия':
      case 'Ближний Восток':
        return 'USD';
      default:
        return 'USD';
    }
  };

  const getCurrencySymbol = (region) => {
    const code = getCurrency(region);
    const symbols = {
      EUR: '€',
      RUB: language === 'ru' ? 'руб.' : 'RUB',
      USD: '$'
    };
    return symbols[code] || '$';
  };

  const formatPrice = (amount, region) => {
    if (amount == null) return '';
    const symbol = getCurrencySymbol(region);
    const formattedAmount = Math.round(amount).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
    return `${formattedAmount} ${symbol}`;
  };

  const formatRegionAndCountry = (regionStr) => {
    if (!regionStr) return '—';
    let regPart = regionStr;
    let countryPart = '';
    let localityPart = '';
    
    if (regionStr.includes(':')) {
      const parts = regionStr.split(':');
      regPart = parts[0].trim();
      const rest = parts[1].trim();
      if (rest.includes('-')) {
        const subParts = rest.split('-');
        countryPart = subParts[0].trim();
        localityPart = subParts[1].trim();
      } else {
        countryPart = rest;
      }
    }
    
    const translatedReg = TRANSLATIONS[language].regions[regPart] || regPart;
    const translatedCountry = TRANSLATIONS[language].countries?.[countryPart] || countryPart;
    
    let result = translatedReg;
    if (translatedCountry) {
      result += ` (${translatedCountry}`;
      if (localityPart) {
        result += `, ${localityPart}`;
      }
      result += ')';
    }
    return result;
  };
  
  // App States
  const [offers, setOffers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecScenario, setSelectedRecScenario] = useState('Profit'); // Safe, Profit, Aggressive
  const [myDeals, setMyDeals] = useState([]);
  const [activeDealId, setActiveDealId] = useState(null);
  const [activeDealData, setActiveDealData] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [trustEvents, setTrustEvents] = useState([]);
  const [tonWalletAddress, setTonWalletAddress] = useState('');
  const [tonConnectUI, setTonConnectUI] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // card, stars, ton
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'warning' | 'danger' | 'info' }
  
  // Admin panel state variables
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState('');
  const [adminTrustChange, setAdminTrustChange] = useState(10);
  const [adminTrustReason, setAdminTrustReason] = useState('Аудит профиля');

  // AI Assistant states
  const [aiDescInput, setAiDescInput] = useState('');
  const [parsingAi, setParsingAi] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };


  useEffect(() => {
    let uiInstance = null;
    const initTonConnect = () => {
      try {
        const lib = window.TON_CONNECT_UI || window.TonConnectUI;
        if (lib && lib.TonConnectUI) {
          const tc = new lib.TonConnectUI({
            manifestUrl: 'https://Mattooo-9.github.io/agrobalance-bot/tonconnect-manifest.json'
          });
          setTonConnectUI(tc);
          uiInstance = tc;
          tc.onStatusChange((walletInfo) => {
            if (walletInfo) {
              setTonWalletAddress(walletInfo.account.address);
            } else {
              setTonWalletAddress('');
            }
          });
        }
      } catch (e) {
        console.error("Failed to initialize TON Connect UI", e);
      }
    };
    const timer = setTimeout(initTonConnect, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Registration Form States
  const [regStep, setRegStep] = useState(1);
  const [regRole, setRegRole] = useState('Farmer'); // Farmer, Buyer, Carrier, Warehouse, Processor, Supplier, Agronomist
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    region: '',
    telegram_id: '',
    country: '',
    locality: '',
    
    // Farmer
    latitude: null,
    longitude: null,
    area: null,
    crop: '',
    expected_yield: null,
    photo_url: '',
    photo_hash: '',
    
    // Buyer
    needed_crops: '',
    desired_volume: null,
    price_range: '',
    payment_terms: '',
    delivery_terms: '',
    
    // Carrier
    vehicle_type: '',
    capacity: null,
    tariff_per_km: null,
    routes: '',
    
    // Warehouse
    capacity_tons: null,
    storage_conditions: '',
    storage_price: null
  });

  // Client-side mocks in case API is offline
  const loadMocks = () => {
    setOffers([
      { id: 1, seller_name: "Фермер ИП Сидоров", crop: "Пшеница", volume: 150, price_per_unit: 14000, region: "Южный" },
      { id: 2, seller_name: "КФХ Рассвет", crop: "Кукуруза", volume: 300, price_per_unit: 11200, region: "Южный" }
    ]);
    setRequests([
      { id: 1, buyer_name: "АгроХолдинг Восток", crop: "Пшеница", volume: 500, price_per_unit: 14500, region: "Южный" },
      { id: 2, buyer_name: "Краснодарский Мукомол", crop: "Ячмень", volume: 200, price_per_unit: 12000, region: "Южный" }
    ]);
    setRecommendations([
      {
        id: 101,
        scenario: "Safe",
        recommended_crop: "Ячмень",
        expected_profit: 1800000,
        risk_level: "Low",
        recommended_volume: 150,
        recommend_sell_by: "В течение 3 месяцев",
        action_type: "store",
        explanation_why: "Устойчивый спрос со стороны местных пивоварен гарантирует сбыт без колебаний.",
        explanation_risk: "Маржинальность ниже средней по региону.",
        explanation_next: "Забронируйте место на элеваторе 'Золотой Колос'.",
        oversupply_deficit_calc: -0.1,
        trust_index_impact: 2.0
      },
      {
        id: 102,
        scenario: "Profit",
        recommended_crop: "Пшеница 4 класс",
        expected_profit: 2400000,
        risk_level: "Medium",
        recommended_volume: 180,
        recommend_sell_by: "Сразу после сбора",
        action_type: "sell_now",
        explanation_why: "Цена в Южном регионе достигла пика из-за локального дефицита.",
        explanation_risk: "В случае задержки сбора цены могут упасть из-за притока импорта.",
        explanation_next: "Опубликуйте предложение покупателю 'АгроХолдинг Восток'.",
        oversupply_deficit_calc: 1.5,
        trust_index_impact: 5.0
      },
      {
        id: 103,
        scenario: "Aggressive",
        recommended_crop: "Подсолнечник",
        expected_profit: 3900000,
        risk_level: "High",
        recommended_volume: 120,
        recommend_sell_by: "Форвардный контракт заранее",
        action_type: "pre_contract",
        explanation_why: "Дефицит семян подсолнечника поднял цены на 30%. Есть высокий потенциал маржи.",
        explanation_risk: "Высокая волатильность цен на масло и пошлины.",
        explanation_next: "Заключите форвардный контракт с предоплатой 50%.",
        oversupply_deficit_calc: 2.8,
        trust_index_impact: 8.0
      }
    ]);
    setMyDeals([
      {
        id: 501,
        crop: "Пшеница",
        volume: 100,
        price_per_unit: 14000,
        total_price: 1400000,
        status: "proposed",
        payment_status: "pending",
        region: "Южный",
        seller_id: 1,
        buyer_id: 2,
        delivery_type: "pickup"
      }
    ]);
  };

  const checkAutoLogin = async (tgId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: tgId })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem('token', data.access_token);
      } else {
        setView('registration');
      }
    } catch (e) {
      console.log("Auto login check failed or offline:", e);
    } finally {
      setLoading(false);
    }
  };

  // One-time init: load mocks + detect Telegram user
  useEffect(() => {
    loadMocks();

    if (window.Telegram && window.Telegram.WebApp) {
      const webapp = window.Telegram.WebApp;
      webapp.ready();
      webapp.expand();

      const tgUser = webapp.initDataUnsafe?.user;
      if (tgUser) {
        const tgIdStr = tgUser.id.toString();
        setRegForm(prev => ({
          ...prev,
          name: tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''),
          telegram_id: tgIdStr
        }));
        // Try silent auto-login by Telegram ID
        if (!localStorage.getItem('token')) {
          checkAutoLogin(tgIdStr);
        }
      }
    }
  }, []); // run once on mount

  // Whenever a valid token appears — fetch full profile
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleResetSession();
        return;
      }
      if (res.status === 403) {
        setUser(null);
        setView('blocked');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUser(data);
      setView('dashboard');
      fetchDeals();
      fetchMarketData();
      if (data.role === 'Farmer') {
        fetchRecommendations();
      }
      if (data.role === 'Admin') {
        fetchAdminUsers();
        fetchAdminLogs();
      }
      fetchTrustEvents();
    } catch (e) {
      console.log("Using Mock Profiles since API offline.");
      setUser({
        id: 1,
        name: "Иван Петров",
        role: "Farmer",
        phone: "+79991234567",
        region: "Южный",
        trust_index: 85.0,
        verification_status: "verified",
        crop: "Пшеница",
        area: 120,
        expected_yield: 480
      });
      setView('dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (e) {}
  };

  const fetchAdminLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/admin/antifraud-logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminLogs(data);
      }
    } catch (e) {}
  };

  const handleAdjustTrust = async (userId, change, reason) => {
    try {
      const res = await fetch(`${API_BASE}/users/admin/users/adjust-trust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, change, reason })
      });
      if (res.ok) {
        showToast(language === 'ru' ? 'Рейтинг доверия изменен!' : 'Trust score adjusted!', 'success');
        fetchAdminUsers();
        fetchAdminLogs();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Error adjusting trust', 'danger');
      }
    } catch (e) {
      showToast('Offline or connection error', 'danger');
    }
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch(`${API_BASE}/deals/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setMyDeals(data);
    } catch(e) {}
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${API_BASE}/recommendations/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setRecommendations(data);
    } catch(e) {}
  };

  const fetchTrustEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me/trust-events`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setTrustEvents(data);
    } catch(e) {}
  };

  const fetchMarketData = async () => {
    try {
      const [offersRes, requestsRes] = await Promise.all([
        fetch(`${API_BASE}/market/offers`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_BASE}/market/requests`, { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      if (offersRes.ok) {
        const data = await offersRes.json();
        if (Array.isArray(data) && data.length > 0) setOffers(data);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        if (Array.isArray(data) && data.length > 0) setRequests(data);
      }
    } catch(e) {
      // Fallback mocks already loaded — no action needed
    }
  };

  const handleParseDescription = async () => {
    if (!aiDescInput.trim()) {
      showToast(language === 'ru' ? 'Введите описание деятельности!' : 'Please describe your activity first!', 'warning');
      return;
    }
    setParsingAi(true);
    try {
      const res = await fetch(`${API_BASE}/auth/parse-desc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescInput })
      });
      if (res.ok) {
        const data = await res.json();
        setRegRole(data.role || 'Farmer');
        setRegForm(prev => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || prev.phone,
          region: data.region || prev.region,
          country: data.country || prev.country,
          locality: data.locality || prev.locality,
          crop: data.crop || prev.crop,
          area: data.area || prev.area,
          expected_yield: data.expected_yield || prev.expected_yield,
          needed_crops: data.needed_crops || prev.needed_crops,
          payment_terms: data.payment_terms || prev.payment_terms,
          delivery_terms: data.delivery_terms || prev.delivery_terms,
          vehicle_type: data.vehicle_type || prev.vehicle_type,
          capacity: data.capacity || prev.capacity,
          tariff_per_km: data.tariff_per_km || prev.tariff_per_km,
          capacity_tons: data.capacity_tons || prev.capacity_tons,
          storage_price: data.storage_price || prev.storage_price
        }));
        showToast(
          language === 'ru' 
            ? '✨ ИИ успешно распознал параметры и заполнил форму!' 
            : '✨ AI parsed details and pre-filled the form!', 
          'success'
        );
        setRegStep(2);
      } else {
        showToast('Error parsing description', 'danger');
      }
    } catch (e) {
      showToast('Connection failed', 'danger');
    } finally {
      setParsingAi(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    document.activeElement.blur();
    setLoading(true);
    const combinedRegion = regForm.country ? (regForm.locality ? `${regForm.region}: ${regForm.country} - ${regForm.locality}` : `${regForm.region}: ${regForm.country}`) : regForm.region;
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regForm, region: combinedRegion, role: regRole })
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        if (data.fraud_flags_triggered) {
          showToast(`Внимание: сработали триггеры антифрода! ${data.fraud_details?.[0]?.details || ''}`, 'warning');
        }
      } else {
        // Registration succeeded but no token — show error
        showToast(language === 'ru' ? 'Ошибка регистрации. Попробуйте снова.' : 'Registration error. Please try again.', 'danger');
      }
    } catch (err) {
      console.log("Registering inside client database simulation.");
      const mockToken = "mock_jwt_token_auth_1597";
      localStorage.setItem('token', mockToken);
      setToken(mockToken);
      setUser({
        id: 10,
        name: regForm.name,
        role: regRole,
        phone: regForm.phone,
        region: combinedRegion,
        trust_index: regRole === 'Farmer' && regForm.expected_yield > 1200 ? 30.0 : 50.0,
        verification_status: "pending",
        crop: regForm.crop,
        area: regForm.area,
        expected_yield: regForm.expected_yield
      });
      setView('dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('lang');
    setToken('');
    setUser(null);
    setView('lang-select'); // back to language selection — clean re-entry
  };

  const handleGenerateRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recommendations/generate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setRecommendations(data);
    } catch (e) {
      showToast(
        language === 'ru'
          ? "AI-рекомендации сгенерированы по локальной формуле (Gemini API offline)"
          : "AI Recommendations generated via local formula (Gemini API offline)",
        'info'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDealDetail = async (dealId, fallbackDeal = null) => {
    setActiveDealId(dealId);
    setView('deal-detail');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/deals/${dealId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setActiveDealData(data);
    } catch(e) {
      const deal = fallbackDeal || myDeals.find(d => d.id === dealId);
      if (deal) {
        setActiveDealData({
          deal: deal,
          events: [
            { id: 1, action: "created", comment: language === 'ru' ? "Сделка предложена" : "Deal proposed", created_at: new Date().toISOString() }
          ]
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const executeDealAction = async (action, payload = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/deals/${activeDealId}/${action}`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      fetchDeals();
      loadDealDetail(activeDealId);
    } catch (err) {
      let updatedDeal = { ...activeDealData.deal };
      let newEvent = { id: Date.now(), created_at: new Date().toISOString() };

      if (action === 'accept') {
        updatedDeal.status = 'accepted';
        newEvent.action = 'accepted';
        newEvent.comment = 'Сделка принята обеими сторонами';
      } else if (action === 'pay-escrow') {
        updatedDeal.status = 'paid_to_escrow';
        updatedDeal.payment_status = 'holding';
        newEvent.action = 'deposited';
        newEvent.comment = 'Оплата заблокирована в безопасном Escrow';
      } else if (action === 'confirm-delivery') {
        updatedDeal.status = 'delivered';
        newEvent.action = 'delivered';
        newEvent.comment = 'Перевозчик доставил груз. Ожидание подтверждения покупателя.';
      } else if (action === 'complete') {
        updatedDeal.status = 'completed';
        updatedDeal.payment_status = 'released';
        updatedDeal.commission_status = 'collected';
        newEvent.action = 'completed';
        newEvent.comment = 'Сделка завершена. Удержана комиссия 1%. Средства выплачены продавцу.';
        setUser(prev => ({ ...prev, trust_index: Math.min(100.0, prev.trust_index + 5.0) }));
      } else if (action === 'dispute') {
        updatedDeal.status = 'disputed';
        newEvent.action = 'disputed';
        newEvent.comment = `Открыт арбитраж. Причина: ${payload.reason}`;
        setUser(prev => ({ ...prev, trust_index: Math.max(0.0, prev.trust_index - 15.0) }));
      } else if (action === 'cancel') {
        updatedDeal.status = 'cancelled';
        newEvent.action = 'cancelled';
        newEvent.comment = 'Сделка отменена.';
      }

      const updatedEvents = [...activeDealData.events, newEvent];
      setActiveDealData({ deal: updatedDeal, events: updatedEvents });
      setMyDeals(prev => prev.map(d => d.id === activeDealId ? updatedDeal : d));
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const msgText = chatMessage;
    setChatMessage('');
    document.activeElement.blur(); // Hide keyboard!

    const userMsgEvent = {
      id: Date.now(),
      action: "chat_message",
      comment: `${user ? user.name : 'Я'}: ${msgText}`,
      created_at: new Date().toISOString()
    };
    
    setActiveDealData(prev => ({
      ...prev,
      events: [...prev.events, userMsgEvent]
    }));

    try {
      const res = await fetch(`${API_BASE}/deals/${activeDealId}/chat`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: msgText })
      });
      const data = await res.json();
      if (data.is_bypass_attempt) {
        showToast(TRANSLATIONS[language].alert_bypass_warning, 'danger');
        setUser(prev => ({ ...prev, trust_index: data.trust_index }));
      }
    } catch(err) {
      const phonePattern = /\b\d{9,12}\b|@\w+|email/i;
      if (phonePattern.test(msgText)) {
        showToast(
          language === 'ru' 
            ? "🛡️ AntiFraud Core Warning: Обнаружен номер телефона или контактная информация до оплаты сделки! Ваш Trust Index оштрафован на -30 очков за обход комиссии."
            : "🛡️ AntiFraud Core Warning: Phone number or contact info detected before payment! Your Trust Index has been penalized -30 points.",
          'danger'
        );
        setUser(prev => ({ ...prev, trust_index: Math.max(0.0, prev.trust_index - 30.0) }));
        
        const warningEvent = {
          id: Date.now() + 1,
          action: "antifraud_violation",
          comment: language === 'ru' 
            ? "СИСТЕМА: Снижен рейтинг доверия за обмен контактами вне сделки."
            : "SYSTEM: Trust Index penalized for sharing contacts outside the deal escrow.",
          created_at: new Date().toISOString()
        };
        setActiveDealData(prev => ({
          ...prev,
          events: [...prev.events, warningEvent]
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinner-icon {
            animation: spin 1s linear infinite;
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <Loader className="spinner-icon text-green" size={48} style={{ color: 'var(--primary-green)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-white)', fontSize: '14px', opacity: 0.8 }}>
            {language === 'ru' ? 'Загрузка AgroBalance...' : 'Loading AgroBalance...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <Check size={18} className="text-green" />}
            {toast.type === 'warning' && <AlertTriangle size={18} className="text-gold" />}
            {toast.type === 'danger' && <AlertTriangle size={18} className="text-red" />}
            {toast.type === 'info' && <Shield size={18} className="text-blue" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="header">
        <div className="logo">
          {TRANSLATIONS[language].app_title}
        </div>
        {user && (
          <div className="user-badge" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="trust-index-badge">
              💎 {TRANSLATIONS[language].trust_index}: {Math.round(user.trust_index)}
            </span>
            {tonWalletAddress ? (
              <span className="wallet-badge" title={tonWalletAddress} style={{ fontSize: '11px', background: 'rgba(0,176,255,0.15)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '6px 10px', borderRadius: '20px', cursor: 'pointer' }} onClick={() => tonConnectUI.disconnect()}>
                Wallet: {tonWalletAddress.slice(0, 4)}...{tonWalletAddress.slice(-4)}
              </span>
            ) : (
              tonConnectUI && (
                <button onClick={() => tonConnectUI.openModal()} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', background: 'transparent' }}>
                  {TRANSLATIONS[language].wallet}
                </button>
              )
            )}
          </div>
        )}
      </header>

      {/* Navigation tabs for logged in users */}
      {user && (
        <nav className="nav-tabs" style={{ margin: '16px' }}>
          <button className={`nav-tab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <UserIcon size={18} />
            {TRANSLATIONS[language].profile}
          </button>
          <button className={`nav-tab ${view === 'market' ? 'active' : ''}`} onClick={() => { setView('market'); fetchMarketData(); }}>
            <ShoppingCart size={18} />
            {TRANSLATIONS[language].market}
          </button>
          {user.role === 'Farmer' && (
            <button className={`nav-tab ${view === 'recommendations' ? 'active' : ''}`} onClick={() => setView('recommendations')}>
              <TrendingUp size={18} />
              {TRANSLATIONS[language].ai_advice}
            </button>
          )}
          {user.role === 'Admin' && (
            <button className={`nav-tab ${view === 'admin' ? 'active' : ''}`} onClick={() => { setView('admin'); fetchAdminUsers(); fetchAdminLogs(); }}>
              <Shield size={18} />
              {language === 'ru' ? 'Админка' : 'Admin'}
            </button>
          )}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="container">
        
        {/* VIEW: BLOCKED */}
        {view === 'blocked' && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', borderColor: 'var(--accent-red)' }}>
            <AlertTriangle className="text-red" size={48} style={{ margin: '0 auto 16px', display: 'block', color: 'var(--accent-red)' }} />
            <h3 className="panel-title" style={{ justifyContent: 'center', fontSize: '20px', color: 'var(--accent-red)' }}>
              {language === 'ru' ? 'Доступ заблокирован' : 'Access Blocked'}
            </h3>
            <p style={{ color: 'var(--text-white)', marginTop: '16px', fontSize: '14px', lineHeight: '1.6' }}>
              {language === 'ru' 
                ? 'Ваша учетная запись AgroBalance временно приостановлена службой безопасности из-за критического падения рейтинга доверия (TI < 20).' 
                : 'Your AgroBalance account has been temporarily suspended by the security system due to a critical drop in your Trust Index (TI < 20).'}
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '13px' }}>
              {language === 'ru'
                ? '🛡️ Подозрительная активность заблокирована. Пожалуйста, свяжитесь с поддержкой.'
                : '🛡️ Suspicious activity blocked. Please contact support.'}
            </p>
            <button 
              onClick={handleResetSession} 
              className="btn btn-secondary" 
              style={{ marginTop: '24px' }}
            >
              {language === 'ru' ? 'Вернуться к выбору языка' : 'Back to Language Selection'}
            </button>
          </div>
        )}

        {/* VIEW: ADMIN PANEL */}
        {view === 'admin' && user && user.role === 'Admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* AntiFraud Logs Card */}
            <div className="glass-panel">
              <h3 className="panel-title" style={{ color: 'var(--accent-red)' }}><AlertTriangle /> {language === 'ru' ? '🛡️ Логи антифрода' : '🛡️ AntiFraud Activity Logs'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {adminLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                    {language === 'ru' ? 'Логов антифрода нет' : 'No suspicious logs'}
                  </div>
                ) : (
                  adminLogs.map(l => (
                    <div key={l.id} className="match-card" style={{ borderColor: l.severity === 'high' ? 'var(--accent-red)' : 'var(--accent-gold)', background: 'rgba(255,255,255,0.01)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', width: '100%' }}>
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>{l.user_name} (ID: {l.user_id})</span>
                        <span style={{ fontSize: '11px', color: l.severity === 'high' ? 'var(--accent-red)' : 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: '700' }}>{l.severity}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-white)' }}><b>{l.rule_triggered}</b>: {l.details}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(l.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Users Control Board */}
            <div className="glass-panel">
              <h3 className="panel-title"><UserIcon /> {language === 'ru' ? '👥 Управление участниками' : '👥 Market Members Control'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Adjust Trust form */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--primary-green)' }}>{language === 'ru' ? 'Модерация рейтинга (Trust Index)' : 'Adjust Trust Index'}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">{language === 'ru' ? 'Выберите пользователя' : 'Select User'}</label>
                      <select 
                        className="form-control" 
                        value={adminSelectedUserId} 
                        onChange={e => setAdminSelectedUserId(e.target.value)}
                      >
                        <option value="">-- {language === 'ru' ? 'Выберите' : 'Select'} --</option>
                        {adminUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({TRANSLATIONS[language].roles[u.role] || u.role}) | TI: {Math.round(u.trust_index)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">{language === 'ru' ? 'Изменение рейтинга' : 'TI Delta'}</label>
                        <input 
                          type="number" className="form-control" 
                          value={adminTrustChange} 
                          onChange={e => setAdminTrustChange(parseFloat(e.target.value))} 
                        />
                      </div>
                      <div className="form-group" style={{ flex: 2 }}>
                        <label className="form-label">{language === 'ru' ? 'Причина' : 'Reason'}</label>
                        <input 
                          type="text" className="form-control" 
                          value={adminTrustReason} 
                          onChange={e => setAdminTrustReason(e.target.value)} 
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        if (!adminSelectedUserId) {
                          showToast(language === 'ru' ? 'Выберите пользователя!' : 'Please select a user first!', 'warning');
                          return;
                        }
                        handleAdjustTrust(parseInt(adminSelectedUserId), adminTrustChange, adminTrustReason);
                      }}
                      className="btn btn-primary"
                    >
                      {language === 'ru' ? 'Применить изменения' : 'Apply Adjustment'}
                    </button>
                  </div>
                </div>

                {/* Users List */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {adminUsers.map(u => (
                    <div key={u.id} className="match-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {TRANSLATIONS[language].roles[u.role] || u.role} • {TRANSLATIONS[language].regions[u.region] || u.region || '—'} • {u.phone}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={`trust-index-badge ${u.trust_index >= 80 ? 'text-green' : (u.trust_index >= 50 ? 'text-gold' : 'text-red')}`} style={{ padding: '4px 8px', fontSize: '12px' }}>
                          TI: {Math.round(u.trust_index)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>
                          {u.verification_status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>
        )}

        {/* VIEW: LANGUAGE SELECTION */}
        {view === 'lang-select' && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <h3 className="panel-title" style={{ justifyContent: 'center', fontSize: '20px' }}><Shield className="text-green" /> {TRANSLATIONS[language].select_lang}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              {TRANSLATIONS[language].select_lang_desc}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => {
                  setLanguage('ru');
                  localStorage.setItem('lang', 'ru');
                  if (token) {
                    fetchProfile();
                  } else {
                    setView('registration');
                  }
                }} 
                className="btn btn-primary"
              >
                Русский 🇷🇺
              </button>
              <button 
                onClick={() => {
                  setLanguage('en');
                  localStorage.setItem('lang', 'en');
                  if (token) {
                    fetchProfile();
                  } else {
                    setView('registration');
                  }
                }} 
                className="btn btn-secondary"
              >
                English 🇬🇧
              </button>
            </div>
          </div>
        )}

        {/* VIEW: REGISTRATION */}
        {view === 'registration' && (
          <div className="glass-panel">
            <div className="stepper-header">
              <span className={`stepper-step ${regStep >= 1 ? 'active' : ''}`}>1</span>
              <span className={`stepper-line ${regStep >= 2 ? 'active' : ''}`}></span>
              <span className={`stepper-step ${regStep >= 2 ? 'active' : ''}`}>2</span>
            </div>

            {/* Smart AI Assistant Console */}
            <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(0,230,118,0.2)', marginBottom: '20px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ {language === 'ru' ? 'ИИ Ассистент авторегистрации' : 'AI Autoregistration Assistant'}
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {language === 'ru' 
                  ? 'Опишите ваше хозяйство в свободной форме (например: "Я фермер из Краснодарского края, сею кукурузу на 150 га, тел: +79991234567"), и ИИ автоматически распознает роль, регион, культуру и объёмы!' 
                  : 'Describe your business in a few words (e.g. "I am a carrier from France, capacity 24 tons, vehicle Volvo truck, phone +336123456"), and the AI will extract all properties instantly!'}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '60px', resize: 'vertical', fontSize: '13px', background: 'rgba(0,0,0,0.2)', color: 'var(--text-white)' }}
                  placeholder={language === 'ru' ? 'Пример: Я покупатель из Франции, куплю 200 тонн пшеницы...' : 'Example: I am farmer from Iowa growing corn on 250 ha...'}
                  value={aiDescInput}
                  onChange={e => setAiDescInput(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', width: 'auto', padding: '8px 16px' }}
                onClick={handleParseDescription}
                disabled={parsingAi}
              >
                {parsingAi ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ marginRight: '6px' }}></span>
                    {language === 'ru' ? 'Распознавание...' : 'Parsing...'}
                  </>
                ) : (
                  <>
                    ⚡ {language === 'ru' ? 'Автозаполнение через ИИ' : 'AI Autofill'}
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleRegister}>
              {regStep === 1 && (
                <div>
                  <h3 className="panel-title">{TRANSLATIONS[language].step1_role}</h3>
                  <div className="role-grid">
                    {[
                      { key: 'Farmer' },
                      { key: 'Buyer' },
                      { key: 'Carrier' },
                      { key: 'Warehouse' },
                      { key: 'Processor' },
                      { key: 'Supplier' },
                      { key: 'Agronomist' }
                    ]
                    .sort((a, b) => TRANSLATIONS[language].roles[a.key].localeCompare(TRANSLATIONS[language].roles[b.key]))
                    .map(r => (
                      <div 
                        key={r.key} 
                        className={`role-card ${regRole === r.key ? 'active' : ''}`}
                        onClick={() => setRegRole(r.key)}
                      >
                        <div className="role-title">{TRANSLATIONS[language].roles[r.key]}</div>
                        <div className="role-description">{TRANSLATIONS[language].role_descriptions[r.key]}</div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setRegStep(2)}>
                    {TRANSLATIONS[language].next}
                  </button>
                </div>
              )}

              {regStep === 2 && (
                <div>
                  <h3 className="panel-title">{TRANSLATIONS[language].step2_contacts}</h3>
                  <div className="form-group">
                    <label className="form-label">{TRANSLATIONS[language].org_name}</label>
                    <input 
                      type="text" className="form-control" 
                      value={regForm.name} 
                      onChange={e => setRegForm({...regForm, name: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{TRANSLATIONS[language].phone_num}</label>
                    <input 
                      type="tel" className="form-control" 
                      value={regForm.phone} 
                      onChange={e => setRegForm({...regForm, phone: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{TRANSLATIONS[language].region}</label>
                    <select 
                      className="form-control" 
                      value={regForm.region} 
                      onChange={e => setRegForm({...regForm, region: e.target.value, country: ''})}
                      required
                    >
                      <option value="">-- {language === 'ru' ? 'Выберите регион' : 'Select Region'} --</option>
                      {Object.keys(TRANSLATIONS[language].regions)
                        .sort((a, b) => TRANSLATIONS[language].regions[a].localeCompare(TRANSLATIONS[language].regions[b]))
                        .map(reg => (
                          <option key={reg} value={reg}>{TRANSLATIONS[language].regions[reg]}</option>
                        ))
                      }
                    </select>
                  </div>
                  {regForm.region && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label">{language === 'ru' ? 'Страна / Территория' : 'Country / Territory'}</label>
                      <select 
                        className="form-control" 
                        value={regForm.country} 
                        onChange={e => setRegForm({...regForm, country: e.target.value, locality: ''})}
                        required
                      >
                        <option value="">-- {language === 'ru' ? 'Выберите страну' : 'Select Country'} --</option>
                        {(COUNTRIES_BY_REGION[regForm.region] || [])
                          .sort((a, b) => (TRANSLATIONS[language].countries?.[a] || a).localeCompare(TRANSLATIONS[language].countries?.[b] || b))
                          .map(c => (
                            <option key={c} value={c}>{TRANSLATIONS[language].countries?.[c] || c}</option>
                          ))
                        }
                      </select>
                    </div>
                  )}

                  {regForm.country && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label">{language === 'ru' ? 'Регион / Область / Штат' : 'State / Province / Region'}</label>
                      {LOCALITIES_BY_COUNTRY[regForm.country] ? (
                        <select
                          className="form-control"
                          value={regForm.locality}
                          onChange={e => setRegForm({...regForm, locality: e.target.value})}
                          required
                        >
                          <option value="">-- {language === 'ru' ? 'Выберите область/местность' : 'Select Locality'} --</option>
                          {LOCALITIES_BY_COUNTRY[regForm.country].map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          placeholder={language === 'ru' ? 'Введите вашу область или штат' : 'Enter your state or province'}
                          value={regForm.locality}
                          onChange={e => setRegForm({...regForm, locality: e.target.value})}
                          required
                        />
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setRegStep(1)}>{TRANSLATIONS[language].back}</button>
                    <button type="submit" className="btn btn-primary">{TRANSLATIONS[language].register}</button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Unified Business & Reputation Card */}
            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(22, 33, 26, 0.9) 0%, rgba(15, 20, 17, 0.9) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserIcon className="text-green" size={20} /> {user.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {TRANSLATIONS[language].roles[user.role]} • {formatRegionAndCountry(user.region)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {TRANSLATIONS[language].phone_num}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-white)' }}>
                    {user.phone}
                  </div>
                </div>
              </div>

              {/* Role specific properties */}
              {(user.role === 'Farmer' || user.role === 'Buyer' || user.role === 'Carrier' || user.role === 'Warehouse') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 15px', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                  {user.role === 'Farmer' && (
                    <>
                      <div><span style={{ color: 'var(--text-muted)' }}>{TRANSLATIONS[language].card_crop}</span> <b style={{ float: 'right' }}>{user.crop || '—'}</b></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>{TRANSLATIONS[language].card_area}</span> <b style={{ float: 'right' }}>{user.area || 0} {TRANSLATIONS[language].unit_ha}</b></div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>{TRANSLATIONS[language].card_expected}</span> <b style={{ float: 'right' }}>{user.expected_yield || 0} {TRANSLATIONS[language].unit_tons}</b></div>
                    </>
                  )}
                  {user.role === 'Buyer' && (
                    <>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>{TRANSLATIONS[language].card_purchases}</span> <b style={{ float: 'right' }}>{user.needed_crops || '—'}</b></div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>{TRANSLATIONS[language].card_terms}</span> <b style={{ float: 'right' }}>{user.payment_terms || '—'}</b></div>
                    </>
                  )}
                  {user.role === 'Carrier' && (
                    <>
                      <div><span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Транспорт:' : 'Vehicle:'}</span> <b style={{ float: 'right' }}>{user.vehicle_type || '—'}</b></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Грузоподъемность:' : 'Capacity:'}</span> <b style={{ float: 'right' }}>{user.capacity || 0} {TRANSLATIONS[language].unit_tons}</b></div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Тариф:' : 'Tariff:'}</span> <b style={{ float: 'right' }}>{formatPrice(user.tariff_per_km, user.region)}/{language === 'ru' ? 'км' : 'km'}</b></div>
                    </>
                  )}
                  {user.role === 'Warehouse' && (
                    <>
                      <div><span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Вместимость:' : 'Capacity:'}</span> <b style={{ float: 'right' }}>{user.capacity_tons || 0} {TRANSLATIONS[language].unit_tons}</b></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Цена хранения:' : 'Storage Fee:'}</span> <b style={{ float: 'right' }}>{formatPrice(user.storage_price, user.region)}/{TRANSLATIONS[language].unit_tons}</b></div>
                    </>
                  )}
                </div>
              )}

              {/* Reputation & Trust Index */}
              {(() => {
                const getTier = (ti) => {
                  const tData = TRANSLATIONS[language].tiers;
                  if (ti >= 90) return { name: tData.gold.name, color: "var(--accent-gold)", desc: tData.gold.desc };
                  if (ti >= 75) return { name: tData.silver.name, color: "#e0e0e0", desc: tData.silver.desc };
                  if (ti >= 50) return { name: tData.bronze.name, color: "#cd7f32", desc: tData.bronze.desc };
                  return { name: tData.novice.name, color: "var(--accent-red)", desc: tData.novice.desc };
                };
                const tier = getTier(user.trust_index);

                return (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>
                        <Shield size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: tier.color }} />
                        <b style={{ color: tier.color }}>{tier.name}</b>
                      </span>
                      <span><b>{Math.round(user.trust_index)}</b> / 100 {TRANSLATIONS[language].rank_ti}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ 
                        width: `${Math.max(5, Math.min(100, user.trust_index))}%`, 
                        height: '100%', 
                        background: `linear-gradient(90deg, var(--primary-green) 0%, ${tier.color} 100%)`, 
                        borderRadius: '3px', 
                        boxShadow: `0 0 6px ${tier.color}60`,
                        transition: 'width 0.6s ease-out' 
                       }}></div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-white)', marginTop: '8px', opacity: 0.75 }}>
                      {TRANSLATIONS[language].rank_bonus} {tier.desc}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Level 2: Advanced Verification */}
            {user.verification_status === 'pending' && (
              <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(22, 33, 26, 0.4) 0%, rgba(15, 20, 17, 0.4) 100%)', borderColor: 'var(--accent-gold)' }}>
                <h3 className="panel-title" style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {TRANSLATIONS[language].lvl2_title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  {TRANSLATIONS[language].lvl2_desc}
                </p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  document.activeElement.blur();
                  setLoading(true);
                  try {
                    const res = await fetch(`${API_BASE}/users/verify-role-details`, {
                      method: "POST",
                      headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        latitude: regForm.latitude,
                        longitude: regForm.longitude,
                        area: regForm.area,
                        crop: regForm.crop,
                        expected_yield: regForm.expected_yield,
                        photo_url: regForm.photo_url,
                        needed_crops: regForm.needed_crops,
                        desired_volume: regForm.desired_volume,
                        price_range: regForm.price_range,
                        payment_terms: regForm.payment_terms,
                        delivery_terms: regForm.delivery_terms,
                        vehicle_type: regForm.vehicle_type,
                        capacity: regForm.capacity,
                        tariff_per_km: regForm.tariff_per_km,
                        routes: regForm.routes,
                        capacity_tons: regForm.capacity_tons,
                        storage_conditions: regForm.storage_conditions,
                        storage_price: regForm.storage_price
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setUser(data);
                      showToast(TRANSLATIONS[language].alert_verification_success, 'success');
                    } else {
                      throw new Error();
                    }
                  } catch(err) {
                    showToast(TRANSLATIONS[language].alert_verification_success, 'success');
                    setUser(prev => ({ 
                      ...prev, 
                      verification_status: "verified",
                      trust_index: Math.min(100.0, prev.trust_index + 30.0),
                      area: regForm.area,
                      crop: regForm.crop,
                      expected_yield: regForm.expected_yield,
                      needed_crops: regForm.needed_crops,
                      vehicle_type: regForm.vehicle_type,
                      capacity: regForm.capacity,
                      capacity_tons: regForm.capacity_tons,
                      storage_price: regForm.storage_price
                    }));
                  } finally {
                    setLoading(false);
                  }
                }}>
                  {user.role === 'Farmer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].farm_area}</label>
                        <input type="number" className="form-control" value={regForm.area || ''} onChange={e => setRegForm({...regForm, area: parseFloat(e.target.value)})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].primary_crop}</label>
                        <input type="text" className="form-control" value={regForm.crop || ''} onChange={e => setRegForm({...regForm, crop: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].expected_yield}</label>
                        <input type="number" className="form-control" value={regForm.expected_yield || ''} onChange={e => setRegForm({...regForm, expected_yield: parseFloat(e.target.value)})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].field_photo_url}</label>
                        <input type="text" className="form-control" value={regForm.photo_url || ''} onChange={e => setRegForm({...regForm, photo_url: e.target.value})} required />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">{TRANSLATIONS[language].gps_lat}</label>
                          <input type="number" step="any" className="form-control" value={regForm.latitude || ''} onChange={e => setRegForm({...regForm, latitude: parseFloat(e.target.value)})} required />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">{TRANSLATIONS[language].gps_lng}</label>
                          <input type="number" step="any" className="form-control" value={regForm.longitude || ''} onChange={e => setRegForm({...regForm, longitude: parseFloat(e.target.value)})} required />
                        </div>
                      </div>
                    </div>
                  )}

                  {user.role === 'Buyer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].needed_crops}</label>
                        <input type="text" className="form-control" value={regForm.needed_crops || ''} onChange={e => setRegForm({...regForm, needed_crops: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].payment_terms}</label>
                        <input type="text" className="form-control" value={regForm.payment_terms || ''} onChange={e => setRegForm({...regForm, payment_terms: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].delivery_terms}</label>
                        <input type="text" className="form-control" value={regForm.delivery_terms || ''} onChange={e => setRegForm({...regForm, delivery_terms: e.target.value})} required />
                      </div>
                    </div>
                  )}

                  {user.role === 'Carrier' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].truck_type}</label>
                        <input type="text" className="form-control" value={regForm.vehicle_type || ''} onChange={e => setRegForm({...regForm, vehicle_type: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].truck_capacity}</label>
                        <input type="number" className="form-control" value={regForm.capacity || ''} onChange={e => setRegForm({...regForm, capacity: parseFloat(e.target.value)})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].tariff_km}</label>
                        <input type="number" className="form-control" value={regForm.tariff_per_km || ''} onChange={e => setRegForm({...regForm, tariff_per_km: parseFloat(e.target.value)})} required />
                      </div>
                    </div>
                  )}

                  {user.role === 'Warehouse' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].wh_capacity}</label>
                        <input type="number" className="form-control" value={regForm.capacity_tons || ''} onChange={e => setRegForm({...regForm, capacity_tons: parseFloat(e.target.value)})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{TRANSLATIONS[language].wh_storage_price}</label>
                        <input type="number" className="form-control" value={regForm.storage_price || ''} onChange={e => setRegForm({...regForm, storage_price: parseFloat(e.target.value)})} required />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '14px' }}>
                    {TRANSLATIONS[language].btn_verify}
                  </button>
                </form>
              </div>
            )}



            {/* Active Deals List */}
            <div className="glass-panel">
              <h3 className="panel-title"><Briefcase /> {TRANSLATIONS[language].deals_title}</h3>
              {myDeals.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                  {TRANSLATIONS[language].no_deals}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myDeals.map(d => (
                    <div key={d.id} className="match-card" onClick={() => loadDealDetail(d.id)} style={{ cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{d.crop} — {d.volume} {TRANSLATIONS[language].unit_tons}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatPrice(d.total_price, d.region)}</div>
                      </div>
                      <span className={`trust-index-badge ${d.status === 'completed' ? 'text-green' : 'text-gold'}`}>
                        {(TRANSLATIONS[language].statuses[d.status] || d.status).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: MARKET */}
        {view === 'market' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel">
              <h3 className="panel-title"><ShoppingCart /> {TRANSLATIONS[language].sale_offers}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...offers]
                  .sort((a, b) => (a.crop || '').localeCompare(b.crop || ''))
                  .map(o => (
                  <div key={o.id} className="match-card">
                    <div>
                      <div style={{ fontWeight: '600' }}>{o.crop} ({o.volume} {TRANSLATIONS[language].unit_tons})</div>
                      <div style={{ fontSize: '13px' }}><b>{formatPrice(o.price_per_unit, o.region)}/{TRANSLATIONS[language].unit_tons}</b></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.seller_name} • {formatRegionAndCountry(o.region)}</div>
                    </div>
                    {user && user.role === 'Buyer' && (
                      user.verification_status === 'verified' ? (
                        <button 
                          onClick={() => {
                            const deal = {
                              id: Math.floor(Math.random() * 1000),
                              seller_id: 100,
                              buyer_id: user.id,
                              crop: o.crop,
                              volume: o.volume,
                              price_per_unit: o.price_per_unit,
                              total_price: o.volume * o.price_per_unit,
                              status: "proposed",
                              payment_status: "pending",
                              region: o.region,
                              delivery_type: "pickup"
                            };
                            setMyDeals([deal, ...myDeals]);
                            loadDealDetail(deal.id, deal);
                          }} 
                          className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                        >
                          {TRANSLATIONS[language].propose_deal}
                        </button>
                      ) : (
                        <span className="text-gold" style={{ fontSize: '12px', opacity: 0.8, maxWidth: '180px', display: 'block', textAlign: 'right' }}>
                          {TRANSLATIONS[language].deal_locked}
                        </span>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="panel-title"><ShoppingCart /> {TRANSLATIONS[language].purchase_requests}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...requests]
                  .sort((a, b) => (a.crop || '').localeCompare(b.crop || ''))
                  .map(r => (
                  <div key={r.id} className="match-card">
                    <div>
                      <div style={{ fontWeight: '600' }}>{r.crop} ({r.volume} {TRANSLATIONS[language].unit_tons})</div>
                      <div style={{ fontSize: '13px' }}><b>{formatPrice(r.price_per_unit, r.region)}/{TRANSLATIONS[language].unit_tons}</b></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.buyer_name} • {formatRegionAndCountry(r.region)}</div>
                    </div>
                    {user && user.role === 'Farmer' && (
                      user.verification_status === 'verified' ? (
                        <button 
                          onClick={() => {
                            const deal = {
                              id: Math.floor(Math.random() * 1000),
                              seller_id: user.id,
                              buyer_id: 200,
                              crop: r.crop,
                              volume: r.volume,
                              price_per_unit: r.price_per_unit,
                              total_price: r.volume * r.price_per_unit,
                              status: "proposed",
                              payment_status: "pending",
                              region: r.region,
                              delivery_type: "delivery"
                            };
                            setMyDeals([deal, ...myDeals]);
                            loadDealDetail(deal.id, deal);
                          }} 
                          className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                        >
                          {TRANSLATIONS[language].propose_deal}
                        </button>
                      ) : (
                        <span className="text-gold" style={{ fontSize: '12px', opacity: 0.8, maxWidth: '180px', display: 'block', textAlign: 'right' }}>
                          {TRANSLATIONS[language].deal_locked}
                        </span>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: RECOMMENDATIONS */}
        {view === 'recommendations' && user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel">
              <h3 className="panel-title"><TrendingUp /> {TRANSLATIONS[language].ai_title}</h3>
              {user.verification_status === 'verified' ? (
                <>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    {TRANSLATIONS[language].ai_desc}
                  </p>
                  <button 
                    onClick={handleGenerateRecommendations} 
                    className="btn btn-secondary" style={{ marginBottom: '20px' }}
                  >
                    {TRANSLATIONS[language].ai_update}
                  </button>

                  <div className="scenario-tabs">
                    <button 
                      className={`scenario-tab-btn Safe ${selectedRecScenario === 'Safe' ? 'active' : ''}`}
                      onClick={() => setSelectedRecScenario('Safe')}
                    >
                      Safe 🛡️
                    </button>
                    <button 
                      className={`scenario-tab-btn Profit ${selectedRecScenario === 'Profit' ? 'active' : ''}`}
                      onClick={() => setSelectedRecScenario('Profit')}
                    >
                      Profit 💰
                    </button>
                    <button 
                      className={`scenario-tab-btn Aggressive ${selectedRecScenario === 'Aggressive' ? 'active' : ''}`}
                      onClick={() => setSelectedRecScenario('Aggressive')}
                    >
                      Aggressive 🔥
                    </button>
                  </div>

                  {/* Render Selected Scenario */}
                  {recommendations.filter(r => r.scenario === selectedRecScenario).map(rec => (
                    <div key={rec.id} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{language === 'ru' ? 'Рекомендуемая культура:' : 'Recommended crop:'}</span>
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>{rec.recommended_crop}</span>
                      </div>
                      
                      <div className="profit-badge">
                        +{formatPrice(rec.expected_profit, user.region)}
                      </div>
                      
                      <div className="metric-grid">
                        <div className="metric-box">
                          <div className="metric-label">{TRANSLATIONS[language].risk_level}</div>
                          <div className={`metric-value ${rec.risk_level === 'High' ? 'text-red' : (rec.risk_level === 'Medium' ? 'text-gold' : 'text-green')}`}>
                            {rec.risk_level}
                          </div>
                        </div>
                        <div className="metric-box">
                          <div className="metric-label">{TRANSLATIONS[language].sell_timeline}</div>
                          <div className="metric-value">{rec.recommend_sell_by}</div>
                        </div>
                      </div>

                      <div className="explanation-section">
                        <div className="explanation-card why">
                          <b>{TRANSLATIONS[language].why_profitable}</b> {rec.explanation_why}
                        </div>
                        <div className="explanation-card risk">
                          <b>{TRANSLATIONS[language].what_wrong}</b> {rec.explanation_risk}
                        </div>
                        <div className="explanation-card next">
                          <b>{TRANSLATIONS[language].what_next}</b> {rec.explanation_next}
                        </div>
                      </div>

                      {/* Matching agents list */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                        <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>{TRANSLATIONS[language].matching_buyers}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {rec.matching_buyers && rec.matching_buyers.map(b => (
                            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                              <span>{b.name}</span>
                              <span className="text-green">{TRANSLATIONS[language].trust_index_label} {b.trust}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--accent-gold)' }}>
                  <AlertTriangle style={{ margin: '0 auto 12px', display: 'block', color: 'var(--accent-gold)' }} size={36} />
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-white)' }}>
                    {TRANSLATIONS[language].ai_locked}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: DEAL DETAIL & SAFE ESCROW TIMELINE */}
        {view === 'deal-detail' && activeDealData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel">
              <button onClick={() => setView('dashboard')} className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', marginBottom: '16px' }}>
                {TRANSLATIONS[language].deal_back}
              </button>

              <h3 className="panel-title"><Briefcase /> {TRANSLATIONS[language].deal_details} #{activeDealData.deal.id}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', marginBottom: '20px' }}>
                <div><b>{TRANSLATIONS[language].deal_crop}</b> {activeDealData.deal.crop}</div>
                <div><b>{TRANSLATIONS[language].deal_volume}</b> {activeDealData.deal.volume} {TRANSLATIONS[language].unit_tons}</div>
                <div><b>{TRANSLATIONS[language].deal_price}</b> {formatPrice(activeDealData.deal.price_per_unit, activeDealData.deal.region)}</div>
                <div><b>{TRANSLATIONS[language].deal_total}</b> {formatPrice(activeDealData.deal.total_price, activeDealData.deal.region)}</div>
                <div><b>{TRANSLATIONS[language].deal_status}</b> <span className="text-gold" style={{ fontWeight: '700' }}>{(TRANSLATIONS[language].statuses[activeDealData.deal.status] || activeDealData.deal.status).toUpperCase()}</span></div>
              </div>

              {/* Secure Escrow Calculator Panel */}
              <div className="escrow-payment-box">
                <h4 style={{ fontSize: '15px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {TRANSLATIONS[language].escrow_title}
                </h4>
                <div className="amount-calculation">
                  <div className="calc-row">
                    <span>{TRANSLATIONS[language].escrow_total_product}</span>
                    <span>{formatPrice(activeDealData.deal.total_price, activeDealData.deal.region)}</span>
                  </div>
                  <div className="calc-row">
                    <span>{TRANSLATIONS[language].escrow_fee}</span>
                    <span>{formatPrice(activeDealData.deal.total_price * 0.01, activeDealData.deal.region)}</span>
                  </div>
                  <div className="calc-row total">
                    <span>{TRANSLATIONS[language].escrow_total_pay}</span>
                    <span>{formatPrice(activeDealData.deal.total_price * 1.01, activeDealData.deal.region)}</span>
                  </div>
                </div>
              </div>

              {/* Deal Stepper state timeline */}
              <div className="deal-stepper">
                {[
                  { key: 'proposed', title: language === 'ru' ? 'Предложена' : 'Proposed', desc: language === 'ru' ? 'Стороны согласовывают условия' : 'Negotiating terms' },
                  { key: 'accepted', title: language === 'ru' ? 'Принята' : 'Accepted', desc: language === 'ru' ? 'Сделка подтверждена, ожидается оплата' : 'Payment pending' },
                  { key: 'paid_to_escrow', title: language === 'ru' ? 'Оплачена (Escrow)' : 'Paid (Escrow)', desc: language === 'ru' ? 'Средства заблокированы, доставка разрешена' : 'Funds locked, delivery allowed' },
                  { key: 'delivered', title: language === 'ru' ? 'Доставлена' : 'Delivered', desc: language === 'ru' ? 'Перевозчик доставил урожай на склад/весы' : 'Crop delivered' },
                  { key: 'completed', title: language === 'ru' ? 'Завершена' : 'Completed', desc: language === 'ru' ? 'Средства выплачены продавцу, 1% удержано' : 'Funds released, 1% commission collected' }
                ].map((s, idx) => {
                  let stepClass = '';
                  if (activeDealData.deal.status === s.key) {
                    stepClass = 'active';
                  } else if (
                    (s.key === 'proposed') ||
                    (s.key === 'accepted' && ['paid_to_escrow', 'delivered', 'completed'].includes(activeDealData.deal.status)) ||
                    (s.key === 'paid_to_escrow' && ['delivered', 'completed'].includes(activeDealData.deal.status)) ||
                    (s.key === 'delivered' && activeDealData.deal.status === 'completed')
                  ) {
                    stepClass = 'completed';
                  }
                  
                  return (
                    <div key={s.key} className={`deal-step-item ${stepClass}`}>
                      <div className="deal-step-icon">{idx + 1}</div>
                      <div className="deal-step-content">
                        <div className="deal-step-title">{s.title}</div>
                        <div className="deal-step-desc">{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons based on status and role */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeDealData.deal.status === 'proposed' && (
                  <button onClick={() => executeDealAction('accept')} className="btn btn-primary">
                    {TRANSLATIONS[language].btn_accept}
                  </button>
                )}
                
                {activeDealData.deal.status === 'accepted' && user && user.role === 'Buyer' && (
                  <div className="glass-panel" style={{ marginTop: '10px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.1)' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>{TRANSLATIONS[language].btn_pay_method}</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button 
                        onClick={() => setPaymentMethod('card')} 
                        className="btn" 
                        style={{ flex: 1, padding: '8px', fontSize: '12px', background: paymentMethod === 'card' ? 'var(--primary-green)' : 'rgba(255,255,255,0.05)', color: paymentMethod === 'card' ? 'var(--bg-dark)' : 'var(--text-white)' }}
                      >
                        {getCurrency(activeDealData.deal.region) === 'RUB' ? (language === 'ru' ? "Карта МИР 💳" : "MIR Card 💳") : (getCurrency(activeDealData.deal.region) === 'EUR' ? "SEPA Card 💳" : (language === 'ru' ? "Карта Visa/MC 💳" : "Visa/MC Card 💳"))}
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('stars')} 
                        className="btn" 
                        style={{ flex: 1, padding: '8px', fontSize: '12px', background: paymentMethod === 'stars' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)', color: paymentMethod === 'stars' ? 'var(--bg-dark)' : 'var(--text-white)' }}
                      >
                        {TRANSLATIONS[language].btn_stars}
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('ton')} 
                        className="btn" 
                        style={{ flex: 1, padding: '8px', fontSize: '12px', background: paymentMethod === 'ton' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)', color: paymentMethod === 'ton' ? 'var(--bg-dark)' : 'var(--text-white)' }}
                      >
                        {TRANSLATIONS[language].btn_ton}
                      </button>
                    </div>

                    <button 
                      onClick={async () => {
                        if (paymentMethod === 'ton') {
                          if (!tonWalletAddress) {
                            showToast(TRANSLATIONS[language].alert_wallet_connect_first, 'warning');
                            return;
                          }
                          try {
                            const res = await fetch(`${API_BASE}/payments/escrow/create`, {
                              method: 'POST',
                              headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}` 
                              },
                              body: JSON.stringify({ deal_id: activeDealId })
                            });
                            if (!res.ok) throw new Error("Failed to create escrow contract payload");
                            const details = await res.json();
                            
                            const txPayload = {
                              validUntil: Math.floor(Date.now() / 1000) + 360,
                              messages: [
                                {
                                  address: details.escrow_contract_address,
                                  amount: details.wallet_payload.amount.toString(),
                                  payload: details.wallet_payload.payload
                                }
                              ]
                            };
                            
                            const txRes = await tonConnectUI.sendTransaction(txPayload);
                            
                            const confirmRes = await fetch(`${API_BASE}/payments/escrow/deposit`, {
                              method: 'POST',
                              headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                action: { deal_id: activeDealId },
                                tx_hash: txRes.boc
                              })
                            });
                            
                            if (confirmRes.ok) {
                              showToast(TRANSLATIONS[language].alert_tx_confirmed, 'success');
                              fetchDeals();
                              loadDealDetail(activeDealId);
                            } else {
                              throw new Error("Failed to register deposit on server");
                            }
                          } catch (err) {
                            console.error(err);
                            showToast("TON transaction error: " + err.message, 'danger');
                          }
                        } else {
                          executeDealAction('pay-escrow');
                        }
                      }} 
                      className="btn btn-primary"
                    >
                      {TRANSLATIONS[language].btn_confirm_pay} ({TRANSLATIONS[language].payment_method_val[paymentMethod]})
                    </button>
                  </div>
                )}

                {activeDealData.deal.status === 'paid_to_escrow' && user && (user.role === 'Carrier' || user.role === 'Farmer') && (
                  <button onClick={() => executeDealAction('confirm-delivery')} className="btn btn-primary">
                    {TRANSLATIONS[language].btn_confirm_delivery}
                  </button>
                )}

                {activeDealData.deal.status === 'delivered' && user && user.role === 'Buyer' && (
                  <button onClick={() => executeDealAction('complete')} className="btn btn-primary">
                    {TRANSLATIONS[language].btn_confirm_recv}
                  </button>
                )}

                {['paid_to_escrow', 'delivered'].includes(activeDealData.deal.status) && (
                  <button 
                    onClick={() => {
                      const reason = prompt(language === 'ru' ? "Введите причину открытия спора:" : "Enter reason for opening dispute:");
                      if (reason) executeDealAction('dispute', { reason });
                    }} 
                    className="btn btn-secondary text-red"
                  >
                    {TRANSLATIONS[language].btn_dispute}
                  </button>
                )}

                {activeDealData.deal.status !== 'completed' && activeDealData.deal.status !== 'cancelled' && (
                  <button onClick={() => executeDealAction('cancel')} className="btn btn-secondary">
                    {TRANSLATIONS[language].btn_cancel}
                  </button>
                )}
              </div>

              {/* Chat bypass warnings & Chat log */}
              <div className="chat-window">
                <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} /> {TRANSLATIONS[language].chat_title}
                </h4>
                
                <div className="chat-messages">
                  {activeDealData.events.filter(e => e.action === 'chat_message' || e.action === 'antifraud_violation').map(e => (
                    <div 
                      key={e.id} 
                      className={`chat-bubble ${e.action === 'antifraud_violation' ? 'other text-red' : (e.comment.startsWith(user ? user.name : 'Я') ? 'me' : 'other')}`}
                      style={e.action === 'antifraud_violation' ? { background: 'rgba(255,61,0,0.1)', border: '1px solid var(--accent-red)' } : {}}
                    >
                      {e.comment}
                    </div>
                  ))}
                </div>

                {activeDealData.deal.status !== 'completed' && activeDealData.deal.status !== 'cancelled' && (
                  <form onSubmit={handleSendChatMessage} className="chat-input-row">
                    <input 
                      type="text" className="form-control" placeholder={TRANSLATIONS[language].chat_placeholder}
                      value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }}>
                      {TRANSLATIONS[language].chat_send}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
