import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Shield, TrendingUp, Briefcase, FileText, ShoppingCart, 
  MapPin, Phone, Truck, HardDrive, HelpCircle, Loader, MessageSquare, AlertTriangle, check
} from 'lucide-react';
import './App.css';

const API_BASE = "http://127.0.0.1:8000/api/v1";

function App() {
  const [view, setView] = useState('registration'); // registration, dashboard, market, recommendations, deal-detail, admin
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  
  // App States
  const [offers, setOffers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecScenario, setSelectedRecScenario] = useState('Profit'); // Safe, Profit, Aggressive
  const [myDeals, setMyDeals] = useState([]);
  const [activeDealId, setActiveDealId] = useState(null);
  const [activeDealData, setActiveDealData] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [adminLogs, setAdminLogs] = useState([]);
  const [trustEvents, setTrustEvents] = useState([]);
  
  // Registration Form States
  const [regStep, setRegStep] = useState(1);
  const [regRole, setRegRole] = useState('Farmer'); // Farmer, Buyer, Carrier, Warehouse, Processor, Supplier, Agronomist, Admin
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
    expected_yield: 480.0, // 4 tons per ha (reasonable)
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

  useEffect(() => {
    loadMocks();
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status_code === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setUser(data);
      setView('dashboard');
      fetchDeals();
      if (data.role === 'Farmer') {
        fetchRecommendations();
      }
      if (data.role === 'Admin') {
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

  const fetchAdminLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/admin/antifraud-logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setAdminLogs(data);
    } catch(e) {}
  };

  const handleRegister = async (e) => {
    e.preventDefault();
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
      // Offline fallback register simulation
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
        trust_index: regRole === 'Farmer' && regForm.expected_yield > 1200 ? 30.0 : 50.0, // yield anomaly simulation
        verification_status: "pending",
        crop: regForm.crop,
        area: regForm.area,
        expected_yield: regForm.expected_yield
      });
      setView('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setView('registration');
  };

  // Generate recommendations triggered by farmer
  const handleGenerateRecommendations = async () => {
    try {
      const res = await fetch(`${API_BASE}/recommendations/generate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setRecommendations(data);
    } catch (e) {
      alert("AI-рекомендации сгенерированы по локальной формуле (Gemini API offline)");
    }
  };

  const loadDealDetail = async (dealId) => {
    setActiveDealId(dealId);
    setView('deal-detail');
    
    try {
      const res = await fetch(`${API_BASE}/deals/${dealId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setActiveDealData(data);
    } catch(e) {
      // Find inside mock list
      const deal = myDeals.find(d => d.id === dealId);
      setActiveDealData({
        deal: deal,
        events: [
          { id: 1, action: "created", comment: "Сделка предложена", created_at: new Date().toISOString() }
        ]
      });
    }
  };

  const executeDealAction = async (action, payload = {}) => {
    // API action calls
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
      // Client-side simulation
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
        newEvent.comment = 'Сделка завершена. Удержана комиссия 3%. Средства выплачены продавцу.';
        
        // Update user rating
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
      
      // Update in main list
      setMyDeals(prev => prev.map(d => d.id === activeDealId ? updatedDeal : d));
    }
  };

  // Antifraud chat monitor simulation
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const msgText = chatMessage;
    setChatMessage('');

    // Append to local events immediately
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
        alert("Внимание! Обнаружена попытка отправки контактов в обход комиссии. Ваш Trust Index снижен!");
        setUser(prev => ({ ...prev, trust_index: data.trust_index }));
      }
    } catch(err) {
      // Simulate client side check
      const phonePattern = /\b\d{9,12}\b|@\w+|email/i;
      if (phonePattern.test(msgText)) {
        alert("🛡️ AntiFraud Core Warning: Обнаружен номер телефона или контактная информация до оплаты сделки! Ваш Trust Index оштрафован на -30 очков за обход комиссии.");
        setUser(prev => ({ ...prev, trust_index: Math.max(0.0, prev.trust_index - 30.0) }));
        
        const warningEvent = {
          id: Date.now() + 1,
          action: "antifraud_violation",
          comment: "СИСТЕМА: Снижен рейтинг доверия за обмен контактами вне сделки.",
          created_at: new Date().toISOString()
        };
        setActiveDealData(prev => ({
          ...prev,
          events: [...prev.events, warningEvent]
        }));
      }
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          🌾 AgroBalance
        </div>
        {user && (
          <div className="user-badge">
            <span className="trust-index-badge">
              💎 Trust Index: {Math.round(user.trust_index)}
            </span>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              Выйти
            </button>
          </div>
        )}
      </header>

      {/* Navigation tabs for logged in users */}
      {user && (
        <nav className="nav-tabs" style={{ margin: '16px' }}>
          <button className={`nav-tab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <UserIcon size={18} />
            Профиль
          </button>
          <button className={`nav-tab ${view === 'market' ? 'active' : ''}`} onClick={() => setView('market')}>
            <ShoppingCart size={18} />
            Рынок
          </button>
          {user.role === 'Farmer' && (
            <button className={`nav-tab ${view === 'recommendations' ? 'active' : ''}`} onClick={() => setView('recommendations')}>
              <TrendingUp size={18} />
              AI Советы
            </button>
          )}
          {user.role === 'Admin' && (
            <button className={`nav-tab ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
              <Shield size={18} />
              Админ
            </button>
          )}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="container">
        
        {/* VIEW: REGISTRATION */}
        {view === 'registration' && (
          <div className="glass-panel">
            <div className="stepper-header">
              <span className={`stepper-step ${regStep >= 1 ? 'active' : ''}`}>1</span>
              <span className={`stepper-line ${regStep >= 2 ? 'active' : ''}`}></span>
              <span className={`stepper-step ${regStep >= 2 ? 'active' : ''}`}>2</span>
              <span className={`stepper-line ${regStep >= 3 ? 'active' : ''}`}></span>
              <span className={`stepper-step ${regStep >= 3 ? 'active' : ''}`}>3</span>
            </div>

            <form onSubmit={handleRegister}>
              {regStep === 1 && (
                <div>
                  <h3 className="panel-title">Шаг 1: Выберите вашу роль</h3>
                  <div className="role-grid">
                    {[
                      { key: 'Farmer', label: 'Фермер', desc: 'Производство и продажа урожая' },
                      { key: 'Buyer', label: 'Покупатель', desc: 'Закупки зерна и культур' },
                      { key: 'Carrier', label: 'Перевозчик', desc: 'Доставка урожая зерновозами' },
                      { key: 'Warehouse', label: 'Элеватор / Склад', desc: 'Хранение продукции' },
                      { key: 'Processor', label: 'Переработчик', desc: 'Переработка сырья' },
                      { key: 'Supplier', label: 'Поставщик', desc: 'Удобрения, техника, семена' },
                      { key: 'Agronomist', label: 'Агроэксперт', desc: 'Консалтинг и аудит полей' }
                    ].map(r => (
                      <div 
                        key={r.key} 
                        className={`role-card ${regRole === r.key ? 'active' : ''}`}
                        onClick={() => setRegRole(r.key)}
                      >
                        <div className="role-title">{r.label}</div>
                        <div className="role-description">{r.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setRegStep(2)}>
                    Далее
                  </button>
                </div>
              )}

              {regStep === 2 && (
                <div>
                  <h3 className="panel-title">Шаг 2: Контактные данные</h3>
                  <div className="form-group">
                    <label className="form-label">Имя или Название организации</label>
                    <input 
                      type="text" className="form-control" 
                      value={regForm.name} 
                      onChange={e => setRegForm({...regForm, name: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Номер телефона</label>
                    <input 
                      type="tel" className="form-control" 
                      value={regForm.phone} 
                      onChange={e => setRegForm({...regForm, phone: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ваш регион деятельности</label>
                    <select 
                      className="form-control" 
                      value={regForm.region} 
                      onChange={e => setRegForm({...regForm, region: e.target.value})}
                    >
                      <option value="Южный">Южный округ</option>
                      <option value="Центральный">Центральный округ</option>
                      <option value="Поволжье">Поволжский округ</option>
                      <option value="Сибирь">Сибирский округ</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setRegStep(1)}>Назад</button>
                    <button type="button" className="btn btn-primary" onClick={() => setRegStep(3)}>Далее</button>
                  </div>
                </div>
              )}

              {regStep === 3 && (
                <div>
                  <h3 className="panel-title">Шаг 3: Специфические данные роли</h3>
                  
                  {/* Farmer details */}
                  {regRole === 'Farmer' && (
                    <div>
                      <div className="form-group">
                        <label className="form-label">Площадь хозяйства (га)</label>
                        <input 
                          type="number" className="form-control" 
                          value={regForm.area} 
                          onChange={e => setRegForm({...regForm, area: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Выращиваемая культура</label>
                        <input 
                          type="text" className="form-control" 
                          value={regForm.crop} 
                          onChange={e => setRegForm({...regForm, crop: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ожидаемый общий урожай (тонн)</label>
                        <input 
                          type="number" className="form-control" 
                          value={regForm.expected_yield} 
                          onChange={e => setRegForm({...regForm, expected_yield: parseFloat(e.target.value)})}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          * Рекомендовано: от 1 до 10 т/га для зерновых. Заявка свыше лимитов вызовет проверку антифрода.
                        </span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Фото поля (URL ссылки для демо)</label>
                        <input 
                          type="text" className="form-control" 
                          value={regForm.photo_url} 
                          onChange={e => setRegForm({...regForm, photo_url: e.target.value})}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Широта GPS</label>
                          <input 
                            type="number" step="any" className="form-control" 
                            value={regForm.latitude} 
                            onChange={e => setRegForm({...regForm, latitude: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Долгота GPS</label>
                          <input 
                            type="number" step="any" className="form-control" 
                            value={regForm.longitude} 
                            onChange={e => setRegForm({...regForm, longitude: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Buyer details */}
                  {regRole === 'Buyer' && (
                    <div>
                      <div className="form-group">
                        <label className="form-label">Интересующие культуры</label>
                        <input 
                          type="text" className="form-control" placeholder="Пшеница, кукуруза, соя..."
                          value={regForm.needed_crops} 
                          onChange={e => setRegForm({...regForm, needed_crops: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Условия оплаты</label>
                        <input 
                          type="text" className="form-control" 
                          value={regForm.payment_terms} 
                          onChange={e => setRegForm({...regForm, payment_terms: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Условия доставки</label>
                        <input 
                          type="text" className="form-control" 
                          value={regForm.delivery_terms} 
                          onChange={e => setRegForm({...regForm, delivery_terms: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {/* Carrier details */}
                  {regRole === 'Carrier' && (
                    <div>
                      <div className="form-group">
                        <label className="form-label">Тип транспорта</label>
                        <input 
                          type="text" className="form-control" 
                          value={regForm.vehicle_type} 
                          onChange={e => setRegForm({...regForm, vehicle_type: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Грузоподъемность транспорта (тонн)</label>
                        <input 
                          type="number" className="form-control" 
                          value={regForm.capacity} 
                          onChange={e => setRegForm({...regForm, capacity: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Тариф (руб / км)</label>
                        <input 
                          type="number" className="form-control" 
                          value={regForm.tariff_per_km} 
                          onChange={e => setRegForm({...regForm, tariff_per_km: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                  )}

                  {/* Warehouse details */}
                  {regRole === 'Warehouse' && (
                    <div>
                      <div className="form-group">
                        <label className="form-label">Вместимость элеватора (тонн)</label>
                        <input 
                          type="number" className="form-control" 
                          value={regForm.capacity_tons} 
                          onChange={e => setRegForm({...regForm, capacity_tons: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Стоимость хранения (руб / тонну в месяц)</label>
                        <input 
                          type="number" className="form-control" 
                          value={regForm.storage_price} 
                          onChange={e => setRegForm({...regForm, storage_price: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setRegStep(2)}>Назад</button>
                    <button type="submit" className="btn btn-primary">Завершить регистрацию</button>
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
              <h3 className="panel-title"><Shield className="text-green" /> Ваш индекс надежности</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '15px 0' }}>
                <div style={{ 
                  fontSize: '44px', fontWeight: '800', 
                  color: user.trust_index >= 80 ? 'var(--primary-green)' : (user.trust_index >= 50 ? 'var(--accent-gold)' : 'var(--accent-red)') 
                }}>
                  {Math.round(user.trust_index)}
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {user.trust_index >= 80 ? 'Высокое доверие (Зеленая зона)' : (user.trust_index >= 50 ? 'Базовое доверие (Желтая зона)' : 'Низкое доверие (Красная зона)')}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {user.trust_index >= 80 
                      ? 'Вам доступны расширенная аналитика, безопасные сделки, скидки и приоритет.' 
                      : 'Завершите несколько честных сделок, чтобы разблокировать доступ к агрорынку.'}
                  </div>
                </div>
              </div>
              
              {/* If Farmer, show quick verification */}
              {user.role === 'Farmer' && user.verification_status === 'pending' && (
                <div style={{ marginTop: '16px', background: 'rgba(255,193,7,0.1)', border: '1px dashed var(--accent-gold)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                    📍 <b>Геолокация поля не подтверждена.</b> Подтвердите GPS координаты и фото, чтобы получить +30 к Trust Index.
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/users/verify-field`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
                        const data = await res.json();
                        setUser(prev => ({ ...prev, trust_index: data.trust_index, verification_status: "verified" }));
                      } catch(e) {
                        setUser(prev => ({ ...prev, trust_index: 80.0, verification_status: "verified" }));
                      }
                    }} 
                    className="btn btn-primary" style={{ padding: '8px', fontSize: '13px' }}
                  >
                    Подтвердить геолокацию и фото поля
                  </button>
                </div>
              )}
            </div>

            {/* Profile Overview */}
            <div className="glass-panel">
              <h3 className="panel-title"><UserIcon /> Карточка {user.role}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div><b>Имя:</b> {user.name}</div>
                <div><b>Телефон:</b> {user.phone}</div>
                <div><b>Регион:</b> {user.region}</div>
                {user.role === 'Farmer' && (
                  <>
                    <div><b>Площадь:</b> {user.area} га</div>
                    <div><b>Культура:</b> {user.crop}</div>
                    <div><b>Ожидаемый урожай:</b> {user.expected_yield} тонн</div>
                  </>
                )}
                {user.role === 'Buyer' && (
                  <>
                    <div><b>Закупки:</b> {user.needed_crops}</div>
                    <div><b>Условия:</b> {user.payment_terms}</div>
                  </>
                )}
              </div>
            </div>

            {/* Active Deals List */}
            <div className="glass-panel">
              <h3 className="panel-title"><Briefcase /> Ваши сделки</h3>
              {myDeals.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Активных сделок пока нет. Перейдите во вкладку "Рынок" для поиска.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myDeals.map(d => (
                    <div key={d.id} className="match-card" onClick={() => loadDealDetail(d.id)} style={{ cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{d.crop} — {d.volume} тонн</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Сумма: {d.total_price.toLocaleString()} руб.</div>
                      </div>
                      <span className={`trust-index-badge ${d.status === 'completed' ? 'text-green' : 'text-gold'}`}>
                        {d.status.toUpperCase()}
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
              <h3 className="panel-title"><ShoppingCart /> Предложения о продаже (Фермеры)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {offers.map(o => (
                  <div key={o.id} className="match-card">
                    <div>
                      <div style={{ fontWeight: '600' }}>{o.crop} ({o.volume} т)</div>
                      <div style={{ fontSize: '13px' }}>Цена: <b>{o.price_per_unit} руб/т</b></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Продавец: {o.seller_name}</div>
                    </div>
                    {user && user.role === 'Buyer' && (
                      <button 
                        onClick={() => {
                          const deal = {
                            id: Math.floor(Math.random() * 1000),
                            seller_id: 100, // dummy
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
                          loadDealDetail(deal.id);
                        }} 
                        className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                      >
                        Предложить сделку
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="panel-title"><ShoppingCart /> Запросы на покупку (Покупатели)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requests.map(r => (
                  <div key={r.id} className="match-card">
                    <div>
                      <div style={{ fontWeight: '600' }}>{r.crop} ({r.volume} т)</div>
                      <div style={{ fontSize: '13px' }}>Предлагает: <b>{r.price_per_unit} руб/т</b></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Покупатель: {r.buyer_name}</div>
                    </div>
                    {user && user.role === 'Farmer' && (
                      <button 
                        onClick={() => {
                          const deal = {
                            id: Math.floor(Math.random() * 1000),
                            seller_id: user.id,
                            buyer_id: 200, // dummy
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
                          loadDealDetail(deal.id);
                        }} 
                        className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                      >
                        Предложить сделку
                      </button>
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
              <h3 className="panel-title"><TrendingUp /> AI Рекомендации AgroBalance</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Наш AI-алгоритм проанализировал ваши данные поля, ожидаемый урожай пшеницы и текущую конъюнктуру рынка Южного региона.
              </p>
              
              <button 
                onClick={handleGenerateRecommendations} 
                className="btn btn-secondary" style={{ marginBottom: '20px' }}
              >
                Обновить рекомендации AI
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
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Рекомендуемая культура:</span>
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>{rec.recommended_crop}</span>
                  </div>
                  
                  <div className="profit-badge">
                    +{rec.expected_profit.toLocaleString()} руб.
                  </div>
                  
                  <div className="metric-grid">
                    <div className="metric-box">
                      <div className="metric-label">Уровень риска</div>
                      <div className={`metric-value ${rec.risk_level === 'High' ? 'text-red' : (rec.risk_level === 'Medium' ? 'text-gold' : 'text-green')}`}>
                        {rec.risk_level}
                      </div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-label">Сроки реализации</div>
                      <div className="metric-value">{rec.recommend_sell_by}</div>
                    </div>
                  </div>

                  <div className="explanation-section">
                    <div className="explanation-card why">
                      <b>Почему это выгодно:</b> {rec.explanation_why}
                    </div>
                    <div className="explanation-card risk">
                      <b>Что может пойти не так:</b> {rec.explanation_risk}
                    </div>
                    <div className="explanation-card next">
                      <b>Что делать дальше:</b> {rec.explanation_next}
                    </div>
                  </div>

                  {/* Matching agents list */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>🎯 Подходящие покупатели в регионе:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {rec.matching_buyers && rec.matching_buyers.map(b => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                          <span>{b.name}</span>
                          <span className="text-green">Индекс доверия: {b.trust}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: DEAL DETAIL & SAFE ESCROW TIMELINE */}
        {view === 'deal-detail' && activeDealData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel">
              <button onClick={() => setView('dashboard')} className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', marginBottom: '16px' }}>
                ← Назад к профилю
              </button>

              <h3 className="panel-title"><Briefcase /> Детали сделки #{activeDealData.deal.id}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', marginBottom: '20px' }}>
                <div><b>Культура:</b> {activeDealData.deal.crop}</div>
                <div><b>Объем:</b> {activeDealData.deal.volume} тонн</div>
                <div><b>Цена за тонну:</b> {activeDealData.deal.price_per_unit} руб.</div>
                <div><b>Итоговая сумма:</b> {activeDealData.deal.total_price.toLocaleString()} руб.</div>
                <div><b>Текущий статус сделки:</b> <span className="text-gold" style={{ fontWeight: '700' }}>{activeDealData.deal.status.toUpperCase()}</span></div>
              </div>

              {/* Secure Escrow Calculator Panel */}
              <div className="escrow-payment-box">
                <h4 style={{ fontSize: '15px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🛡️ Безопасная сделка AgroBalance
                </h4>
                <div className="amount-calculation">
                  <div className="calc-row">
                    <span>Сумма товара:</span>
                    <span>{activeDealData.deal.total_price.toLocaleString()} руб.</span>
                  </div>
                  <div className="calc-row">
                    <span>Комиссия сервиса (3%):</span>
                    <span>{(activeDealData.deal.total_price * 0.03).toLocaleString()} руб.</span>
                  </div>
                  <div className="calc-row total">
                    <span>Итого к оплате (Escrow):</span>
                    <span>{(activeDealData.deal.total_price).toLocaleString()} руб.</span>
                  </div>
                </div>
              </div>

              {/* Deal Stepper state timeline */}
              <div className="deal-stepper">
                {[
                  { key: 'proposed', title: 'Предложена', desc: 'Стороны согласовывают условия' },
                  { key: 'accepted', title: 'Принята', desc: 'Сделка подтверждена, ожидается оплата' },
                  { key: 'paid_to_escrow', title: 'Оплачена (Escrow)', desc: 'Средства заблокированы, доставка разрешена' },
                  { key: 'delivered', title: 'Доставлена', desc: 'Перевозчик доставил урожай на склад/весы' },
                  { key: 'completed', title: 'Завершена', desc: 'Средства выплачены продавцу, 3% удержано' }
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
                    Принять сделку
                  </button>
                )}
                
                {activeDealData.deal.status === 'accepted' && user && user.role === 'Buyer' && (
                  <button onClick={() => executeDealAction('pay-escrow')} className="btn btn-primary">
                    Оплатить в Escrow (Карта / TON)
                  </button>
                )}

                {activeDealData.deal.status === 'paid_to_escrow' && user && (user.role === 'Carrier' || user.role === 'Farmer') && (
                  <button onClick={() => executeDealAction('confirm-delivery')} className="btn btn-primary">
                    Подтвердить доставку (Разгрузка завершена)
                  </button>
                )}

                {activeDealData.deal.status === 'delivered' && user && user.role === 'Buyer' && (
                  <button onClick={() => executeDealAction('complete')} className="btn btn-primary">
                    Подтвердить приемку (Разблокировать выплату)
                  </button>
                )}

                {['paid_to_escrow', 'delivered'].includes(activeDealData.deal.status) && (
                  <button 
                    onClick={() => {
                      const reason = prompt("Введите причину открытия спора:");
                      if (reason) executeDealAction('dispute', { reason });
                    }} 
                    className="btn btn-secondary text-red"
                  >
                    Открыть спор (Арбитраж)
                  </button>
                )}

                {activeDealData.deal.status !== 'completed' && activeDealData.deal.status !== 'cancelled' && (
                  <button onClick={() => executeDealAction('cancel')} className="btn btn-secondary">
                    Отменить сделку
                  </button>
                )}
              </div>

              {/* Chat bypass warnings & Chat log */}
              <div className="chat-window">
                <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} /> Чат сделки (Защита от обхода комиссии)
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
                      type="text" className="form-control" placeholder="Напишите сообщение..."
                      value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }}>
                      Отправить
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}

        {/* VIEW: ADMIN PANEL */}
        {view === 'admin' && user && user.role === 'Admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel">
              <h3 className="panel-title"><Shield className="text-red" /> Панель безопасности AntiFraud Core</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Simulated live logs */}
                <div className="antifraud-warning">
                  ⚠️ <b>Внимание:</b> Обнаружено совпадение координат GPS поля у двух фермеров (разница 4 метра). ID: 12 и ID: 15.
                </div>
                <div className="antifraud-warning">
                  ⚠️ <b>Внимание:</b> Сработал триггер <i>impossible_yield</i>. Фермер ID: 22 указал урожайность 85 т/га пшеницы (норма до 10 т/га).
                </div>
                <div className="antifraud-warning">
                  ⚠️ <b>Внимание:</b> Попытка обмена контактами до оплаты сделки. Пользователь ID: 8 (Farmer) написал в чате номер телефона. Снижен Trust Index.
                </div>

                {adminLogs.map(l => (
                  <div key={l.id} className="antifraud-warning">
                    ⚠️ <b>{l.rule_triggered.toUpperCase()}:</b> {l.details} (Пользователь: {l.user_name})
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
