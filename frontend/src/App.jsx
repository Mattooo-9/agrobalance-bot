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
    step1_role: "Шаг 1: Выберите вашу роль",
    step2_contacts: "Шаг 2: Контактные данные",
    org_name: "Имя или Название организации",
    phone_num: "Номер телефона",
    region: "Ваш регион деятельности",
    next: "Далее",
    back: "Назад",
    register: "Зарегистрироваться",
    rank_title: "Ваш игровой ранг AgroBalance",
    rank_ti: "TI",
    rank_bonus: "⚡ Бонус ранга:",
    lvl2_title: "⭐ Уровень 2: Расширенная верификация",
    lvl2_desc: "Заполните дополнительные сведения о своей деятельности, чтобы получить ранг надежного партнера (+30 TI) и разблокировать создание сделок.",
    farm_area: "Площадь хозяйства (га)",
    primary_crop: "Основная культура",
    expected_yield: "Ожидаемый урожай (тонн)",
    field_photo_url: "Ссылка на фото поля",
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
    btn_verify: "Подтвердить и получить ранг",
    card_title: "Карточка",
    card_name: "Имя:",
    card_phone: "Телефон:",
    card_region: "Регион:",
    card_area: "Площадь:",
    card_crop: "Культура:",
    card_expected: "Ожидаемый урожай:",
    card_purchases: "Закупки:",
    card_terms: "Условия:",
    deals_title: "Ваши сделки",
    no_deals: "Активных сделок пока нет. Перейдите во вкладку \"Рынок\" для поиска.",
    sale_offers: "Предложения о продаже (Фермеры)",
    purchase_requests: "Запросы на покупку (Покупатели)",
    propose_deal: "Предложить сделку",
    deal_locked: "🔒 Требуется Уровень 2 верификации в Профиле.",
    ai_title: "AI Рекомендации AgroBalance",
    ai_desc: "Наш AI-алгоритм проанализизирован ваши данные поля, ожидаемый урожай пшеницы и текущую конъюнктуру рынка.",
    ai_update: "Обновить рекомендации AI",
    ai_locked: "🔒 AI-советы заблокированы. Пройдите Уровень 2 верификации (введите параметры поля на вкладке Профиль).",
    risk_level: "Уровень риска",
    sell_timeline: "Сроки реализации",
    why_profitable: "Почему это выгодно:",
    what_wrong: "Что может пойти не так:",
    what_next: "Что делать дальше:",
    matching_buyers: "🎯 Подходящие покупатели в регионе:",
    trust_index_label: "Индекс доверия:",
    deal_back: "← Назад к профилю",
    deal_details: "Детали сделки",
    deal_crop: "Культура:",
    deal_volume: "Объем:",
    deal_price: "Цена за тонну:",
    deal_total: "Итоговая сумма:",
    deal_status: "Текущий статус сделки:",
    escrow_title: "🛡️ Безопасная сделка AgroBalance",
    escrow_total_product: "Сумма товара:",
    escrow_fee: "Комиссия сервиса (1%):",
    escrow_total_pay: "Итого к оплате (Escrow):",
    btn_accept: "Принять сделку",
    btn_pay_method: "💳 Выберите способ оплаты:",
    btn_card: "Карта 💳",
    btn_stars: "Stars ⭐",
    btn_ton: "TON 💎",
    btn_confirm_pay: "Подтвердить оплату",
    btn_confirm_delivery: "Подтвердить доставку (Разгрузка завершена)",
    btn_confirm_recv: "Подтвердить приемку (Разблокировать выплату)",
    btn_dispute: "Открыть спор (Арбитраж)",
    btn_cancel: "Отменить сделку",
    chat_title: "Чат сделки (Защита от обхода комиссии)",
    chat_placeholder: "Напишите сообщение...",
    chat_send: "Отправить",
    alert_verification_success: "Расширенная верификация успешно пройдена! Ваш ранг повышен.",
    alert_wallet_connect_first: "Пожалуйста, сначала подключите TON-кошелек с помощью кнопки Wallet ⚡ в правом верхнем углу!",
    alert_tx_confirmed: "🚀 Транзакция подтверждена! Средства заблокированы в смарт-контракте TON.",
    alert_bypass_warning: "Внимание! Обнаружена попытка отправки контактов в обход комиссии. Ваш Trust Index снижен!",
    roles: {
      Farmer: "Фермер",
      Buyer: "Покупатель",
      Carrier: "Перевозчик",
      Warehouse: "Элеватор / Склад",
      Processor: "Переработчик",
      Supplier: "Поставщик",
      Agronomist: "Агроэксперт",
      Admin: "Администратор"
    },
    role_descriptions: {
      Farmer: "Производство и продажа урожая",
      Buyer: "Закупки зерна и культур",
      Carrier: "Доставка урожая зерновозами",
      Warehouse: "Хранение продукции",
      Processor: "Переработка сырья",
      Supplier: "Удобрения, техника, семена",
      Agronomist: "Консалтинг и аудит полей",
    },
    regions: {
      "Южный": "Южный округ",
      "Центральный": "Центральный округ",
      "Поволжье": "Поволжский округ",
      "Сибирь": "Сибирский округ"
    },
    tiers: {
      gold: { name: "🏆 Золотой Агро-Лидер", desc: "Комиссия 1%. Скидка 10% на элеваторах, повышенный приоритет сделок." },
      silver: { name: "🥈 Серебряный Партнер", desc: "Увеличенный лимит сделок, приоритет в подборе перевозчиков." },
      bronze: { name: "🥉 Бронзовый Участник", desc: "Базовый доступ к рынку и ИИ-аналитике." },
      novice: { name: "⚠️ Новичок (Под наблюдением)", desc: "Пониженный рейтинг. Подтвердите геолокацию поля для разблокировки." }
    },
    statuses: {
      proposed: "Предложена",
      accepted: "Принята",
      paid_to_escrow: "Оплачена (Escrow)",
      delivered: "Доставлена",
      completed: "Завершена",
      disputed: "В арбитраже",
      cancelled: "Отменена"
    },
    unit_ha: "га",
    unit_tons: "тонн",
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
    step1_role: "Step 1: Choose your role",
    step2_contacts: "Step 2: Contact details",
    org_name: "Name or Organization name",
    phone_num: "Phone number",
    region: "Your active region",
    next: "Next",
    back: "Back",
    register: "Register",
    rank_title: "Your AgroBalance rank",
    rank_ti: "TI",
    rank_bonus: "⚡ Rank bonus:",
    lvl2_title: "⭐ Level 2: Advanced Verification",
    lvl2_desc: "Provide additional details about your activity to get a trusted partner rank (+30 TI) and unlock deal creation.",
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
    btn_verify: "Verify & upgrade rank",
    card_title: "Card",
    card_name: "Name:",
    card_phone: "Phone:",
    card_region: "Region:",
    card_area: "Area:",
    card_crop: "Crop:",
    card_expected: "Expected yield:",
    card_purchases: "Purchases:",
    card_terms: "Terms:",
    deals_title: "Your deals",
    no_deals: "No active deals yet. Go to 'Market' tab to search.",
    sale_offers: "Sale Offers (Farmers)",
    purchase_requests: "Purchase Requests (Buyers)",
    propose_deal: "Propose Deal",
    deal_locked: "🔒 Level 2 Verification in Profile required.",
    ai_title: "AgroBalance AI Recommendations",
    ai_desc: "Our AI algorithm has analyzed your field data, expected yield, and current market conditions.",
    ai_update: "Update AI Advice",
    ai_locked: "🔒 AI recommendations locked. Please complete Level 2 verification (enter field parameters in Profile).",
    risk_level: "Risk level",
    sell_timeline: "Sales timeline",
    why_profitable: "Why profitable:",
    what_wrong: "What could go wrong:",
    what_next: "What to do next:",
    matching_buyers: "🎯 Matching buyers in region:",
    trust_index_label: "Trust index:",
    deal_back: "← Back to Profile",
    deal_details: "Deal Details",
    deal_crop: "Crop:",
    deal_volume: "Volume:",
    deal_price: "Price per ton:",
    deal_total: "Total sum:",
    deal_status: "Current status:",
    escrow_title: "🛡️ AgroBalance Secure Escrow",
    escrow_total_product: "Product amount:",
    escrow_fee: "Service fee (1%):",
    escrow_total_pay: "Total payment (Escrow):",
    btn_accept: "Accept Deal",
    btn_pay_method: "💳 Choose payment method:",
    btn_card: "Card 💳",
    btn_stars: "Stars ⭐",
    btn_ton: "TON 💎",
    btn_confirm_pay: "Confirm Payment",
    btn_confirm_delivery: "Confirm Delivery (Unloading finished)",
    btn_confirm_recv: "Confirm Receipt (Unlock payout)",
    btn_dispute: "Open dispute (Arbitration)",
    btn_cancel: "Cancel Deal",
    chat_title: "Deal Chat (Commission bypass protection)",
    chat_placeholder: "Type a message...",
    chat_send: "Send",
    alert_verification_success: "Advanced verification successful! Your rank has been upgraded.",
    alert_wallet_connect_first: "Please connect your TON wallet first using the Wallet ⚡ button in the top right corner!",
    alert_tx_confirmed: "🚀 Transaction confirmed! Funds are locked in the TON smart contract.",
    alert_bypass_warning: "Warning! Attempt to share contact info outside the escrow. Your Trust Index was penalized!",
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
      Farmer: "Production and sales of crops",
      Buyer: "Procurement of grains and crops",
      Carrier: "Delivery of crop via grain trucks",
      Warehouse: "Storage of agricultural products",
      Processor: "Processing of raw materials",
      Supplier: "Fertilizers, machinery, seeds",
      Agronomist: "Consulting and field audits",
    },
    regions: {
      "Южный": "Southern District",
      "Центральный": "Central District",
      "Поволжье": "Volga District",
      "Сибирь": "Siberian District"
    },
    tiers: {
      gold: { name: "🏆 Gold Agro-Leader", desc: "1% commission. 10% discount on warehouses, higher deal priority." },
      silver: { name: "🥈 Silver Partner", desc: "Increased deal limit, carrier matchmaking priority." },
      bronze: { name: "🥉 Bronze Member", desc: "Basic market access and AI analytics." },
      novice: { name: "⚠️ Novice (Under observation)", desc: "Low rating. Verify field GPS in Profile to unlock." }
    },
    statuses: {
      proposed: "Proposed",
      accepted: "Accepted",
      paid_to_escrow: "Paid to Escrow",
      delivered: "Delivered",
      completed: "Completed",
      disputed: "Disputed / Arbitration",
      cancelled: "Cancelled"
    },
    unit_ha: "ha",
    unit_tons: "tons",
    rubles: "RUB",
    payment_method_val: {
      ton: "TON Crypto",
      stars: "Stars",
      card: "Rubles"
    }
  }
};

function App() {
  const [view, setView] = useState('lang-select'); // lang-select, registration, dashboard, market, recommendations, deal-detail
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'ru');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
    name: 'Иван Петров',
    phone: '+79991234567',
    region: 'Южный',
    telegram_id: '8017348770',
    
    // Farmer
    latitude: 45.0354,
    longitude: 38.9750,
    area: 120.0,
    crop: 'Пшеница',
    expected_yield: 480.0,
    photo_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b',
    photo_hash: 'ph_hash_987123',
    
    // Buyer
    needed_crops: 'Пшеница, Ячмень',
    desired_volume: 500.0,
    price_range: '13000-14000',
    payment_terms: 'Предоплата 30%, расчет по весам',
    delivery_terms: 'Самовывоз',
    
    // Carrier
    vehicle_type: 'Зерновоз Scania',
    capacity: 35.0,
    tariff_per_km: 55.0,
    routes: 'Южный, Центральный',
    
    // Warehouse
    capacity_tons: 3000.0,
    storage_conditions: 'Вентилируемый склад, влажность 13%',
    storage_price: 180.0
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
        if (!token) {
          checkAutoLogin(tgIdStr);
        }
      }
    }

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
      const data = await res.json();
      setUser(data);
      setView('dashboard');
      fetchDeals();
      if (data.role === 'Farmer') {
        fetchRecommendations();
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

  const handleRegister = async (e) => {
    e.preventDefault();
    document.activeElement.blur();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regForm, role: regRole })
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        if (data.fraud_flags_triggered) {
          alert(`Внимание: сработали триггеры антифрода! ${data.fraud_details[0].details}`);
        }
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
        region: regForm.region,
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
    setToken('');
    setUser(null);
    setView('registration');
  };

  // Generate recommendations triggered by farmer
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
      alert("AI-рекомендации сгенерированы по локальной формуле (Gemini API offline)");
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
        alert(TRANSLATIONS[language].alert_bypass_warning);
        setUser(prev => ({ ...prev, trust_index: data.trust_index }));
      }
    } catch(err) {
      const phonePattern = /\b\d{9,12}\b|@\w+|email/i;
      if (phonePattern.test(msgText)) {
        alert(language === 'ru' 
          ? "🛡️ AntiFraud Core Warning: Обнаружен номер телефона или контактная информация до оплаты сделки! Ваш Trust Index оштрафован на -30 очков за обход комиссии."
          : "🛡️ AntiFraud Core Warning: Phone number or contact info detected before payment! Your Trust Index has been penalized -30 points."
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
          <button className={`nav-tab ${view === 'market' ? 'active' : ''}`} onClick={() => setView('market')}>
            <ShoppingCart size={18} />
            {TRANSLATIONS[language].market}
          </button>
          {user.role === 'Farmer' && (
            <button className={`nav-tab ${view === 'recommendations' ? 'active' : ''}`} onClick={() => setView('recommendations')}>
              <TrendingUp size={18} />
              {TRANSLATIONS[language].ai_advice}
            </button>
          )}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="container">
        
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
                    ].map(r => (
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
                      onChange={e => setRegForm({...regForm, region: e.target.value})}
                    >
                      <option value="Южный">{TRANSLATIONS[language].regions["Южный"]}</option>
                      <option value="Центральный">{TRANSLATIONS[language].regions["Центральный"]}</option>
                      <option value="Поволжье">{TRANSLATIONS[language].regions["Поволжье"]}</option>
                      <option value="Сибирь">{TRANSLATIONS[language].regions["Сибирь"]}</option>
                    </select>
                  </div>
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
            
            {/* Trust Index Card */}
            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(22, 33, 26, 0.9) 0%, rgba(15, 20, 17, 0.9) 100%)' }}>
              <h3 className="panel-title"><Shield className="text-green" /> {TRANSLATIONS[language].rank_title}</h3>
              
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
                  <div className="tier-progress-container" style={{ margin: '15px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>{language === 'ru' ? 'Игровой Ранг:' : 'Game Rank:'} <b style={{ color: tier.color }}>{tier.name}</b></span>
                      <span><b>{Math.round(user.trust_index)}</b> / 100 {TRANSLATIONS[language].rank_ti}</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ 
                        width: `${Math.max(5, Math.min(100, user.trust_index))}%`, 
                        height: '100%', 
                        background: `linear-gradient(90deg, var(--primary-green) 0%, ${tier.color} 100%)`, 
                        borderRadius: '5px', 
                        boxShadow: `0 0 8px ${tier.color}80`,
                        transition: 'width 0.6s ease-out' 
                      }}></div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-white)', marginTop: '10px', opacity: 0.8 }}>
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
                      alert(TRANSLATIONS[language].alert_verification_success);
                    } else {
                      throw new Error();
                    }
                  } catch(err) {
                    alert(TRANSLATIONS[language].alert_verification_success);
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

            {/* Profile Overview */}
            <div className="glass-panel">
              <h3 className="panel-title"><UserIcon /> {TRANSLATIONS[language].card_title} {TRANSLATIONS[language].roles[user.role]}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div><b>{TRANSLATIONS[language].card_name}</b> {user.name}</div>
                <div><b>{TRANSLATIONS[language].card_phone}</b> {user.phone}</div>
                <div><b>{TRANSLATIONS[language].card_region}</b> {TRANSLATIONS[language].regions[user.region] || user.region}</div>
                {user.role === 'Farmer' && (
                  <>
                    <div><b>{TRANSLATIONS[language].card_area}</b> {user.area} {TRANSLATIONS[language].unit_ha}</div>
                    <div><b>{TRANSLATIONS[language].card_crop}</b> {user.crop}</div>
                    <div><b>{TRANSLATIONS[language].card_expected}</b> {user.expected_yield} {TRANSLATIONS[language].unit_tons}</div>
                  </>
                )}
                {user.role === 'Buyer' && (
                  <>
                    <div><b>{TRANSLATIONS[language].card_purchases}</b> {user.needed_crops}</div>
                    <div><b>{TRANSLATIONS[language].card_terms}</b> {user.payment_terms}</div>
                  </>
                )}
              </div>
            </div>

            {/* Active Deals List */}
            <div className="glass-panel">
              <h3 className="panel-title"><Briefcase /> {TRANSLATIONS[language].deals_title}</h3>
              {myDeals.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{TRANSLATIONS[language].no_deals}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myDeals.map(d => (
                    <div key={d.id} className="match-card" onClick={() => loadDealDetail(d.id)} style={{ cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{d.crop} — {d.volume} {TRANSLATIONS[language].unit_tons}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{language === 'ru' ? 'Сумма:' : 'Sum:'} {d.total_price.toLocaleString()} {TRANSLATIONS[language].rubles}</div>
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
                {offers.map(o => (
                  <div key={o.id} className="match-card">
                    <div>
                      <div style={{ fontWeight: '600' }}>{o.crop} ({o.volume} {TRANSLATIONS[language].unit_tons})</div>
                      <div style={{ fontSize: '13px' }}>{language === 'ru' ? 'Цена:' : 'Price:'} <b>{o.price_per_unit} {TRANSLATIONS[language].rubles}/{TRANSLATIONS[language].unit_tons.slice(0, 1)}</b></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{language === 'ru' ? 'Продавец:' : 'Seller:'} {o.seller_name}</div>
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
                {requests.map(r => (
                  <div key={r.id} className="match-card">
                    <div>
                      <div style={{ fontWeight: '600' }}>{r.crop} ({r.volume} {TRANSLATIONS[language].unit_tons})</div>
                      <div style={{ fontSize: '13px' }}>{language === 'ru' ? 'Предлагает:' : 'Offers:'} <b>{r.price_per_unit} {TRANSLATIONS[language].rubles}/{TRANSLATIONS[language].unit_tons.slice(0, 1)}</b></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{language === 'ru' ? 'Покупатель:' : 'Buyer:'} {r.buyer_name}</div>
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
                        +{rec.expected_profit.toLocaleString()} {TRANSLATIONS[language].rubles}
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
                <div><b>{TRANSLATIONS[language].deal_price}</b> {activeDealData.deal.price_per_unit} {TRANSLATIONS[language].rubles}</div>
                <div><b>{TRANSLATIONS[language].deal_total}</b> {activeDealData.deal.total_price.toLocaleString()} {TRANSLATIONS[language].rubles}</div>
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
                    <span>{activeDealData.deal.total_price.toLocaleString()} {TRANSLATIONS[language].rubles}</span>
                  </div>
                  <div className="calc-row">
                    <span>{TRANSLATIONS[language].escrow_fee}</span>
                    <span>{(activeDealData.deal.total_price * 0.01).toLocaleString()} {TRANSLATIONS[language].rubles}</span>
                  </div>
                  <div className="calc-row total">
                    <span>{TRANSLATIONS[language].escrow_total_pay}</span>
                    <span>{(activeDealData.deal.total_price).toLocaleString()} {TRANSLATIONS[language].rubles}</span>
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
                        {TRANSLATIONS[language].btn_card}
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
                            alert(TRANSLATIONS[language].alert_wallet_connect_first);
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
                              alert(TRANSLATIONS[language].alert_tx_confirmed);
                              fetchDeals();
                              loadDealDetail(activeDealId);
                            } else {
                              throw new Error("Failed to register deposit on server");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("TON transaction error: " + err.message);
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
