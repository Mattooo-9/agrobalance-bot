import json
import httpx
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.db.models import User, MarketSignal, MarketRequest, MarketOffer, Recommendation

def calculate_local_scoring(
    crop: str,
    area: float,
    region: str,
    expected_yield: float,
    trust_index: float,
    db: Session
) -> dict:
    """
    Implements the scoring formula:
    final_score = expected_profit_score * demand_deficit_score * buyer_availability_score *
                  logistics_score * storage_score * season_score * trust_score - 
                  oversupply_risk - weather_risk - fraud_risk - volatility_risk
    """
    # Fetch market signals for this crop in this region
    signal = db.query(MarketSignal).filter(
        MarketSignal.crop == crop,
        MarketSignal.region == region
    ).order_by(MarketSignal.created_at.desc()).first()

    # Default fallback values
    price = 15000.0  # default price per ton
    deficit = 1.0    # neutral
    oversupply = 0.0
    weather = 2.0     # out of 10
    
    if signal:
        price = signal.price_per_unit
        deficit = signal.deficit_score
        oversupply = signal.oversupply_score
        weather = signal.weather_risk

    # Calculate expected profit
    total_yield = expected_yield or (area * 4.0 if area else 10.0)
    expected_revenue = total_yield * price

    # 1. expected_profit_score (scaled 1-10)
    expected_profit_score = min(10.0, max(1.0, expected_revenue / 100000.0))
    
    # 2. demand_deficit_score (scaled 1-5)
    demand_deficit_score = min(5.0, max(1.0, deficit))
    
    # 3. buyer_availability_score (scaled 1-5)
    buyers = db.query(User).filter(
        User.role == "Buyer",
        User.region == region
    ).count()
    buyer_availability_score = min(5.0, max(1.0, buyers + 1.0))
    
    # 4. logistics_score (scaled 1-5)
    carriers = db.query(User).filter(
        User.role == "Carrier",
        User.region == region
    ).count()
    logistics_score = min(5.0, max(1.0, carriers + 1.0))
    
    # 5. storage_score (scaled 1-5)
    warehouses = db.query(User).filter(
        User.role == "Warehouse",
        User.region == region,
        User.availability == True
    ).count()
    storage_score = min(5.0, max(1.0, warehouses + 1.0))
    
    # 6. season_score (scaled 1-5, simple default)
    season_score = 3.0
    
    # 7. trust_score (scaled 0.5-1.5 based on Trust Index)
    trust_score = 0.5 + (trust_index / 100.0)

    # Risk penalties
    oversupply_risk = oversupply * 2.0
    weather_risk = weather * 1.5
    fraud_risk = max(0.0, (100.0 - trust_index) / 10.0)
    volatility_risk = 1.0

    # Final scoring computation
    base_multipliers = (expected_profit_score * 
                        demand_deficit_score * 
                        buyer_availability_score * 
                        logistics_score * 
                        storage_score * 
                        season_score * 
                        trust_score)
    penalties = oversupply_risk + weather_risk + fraud_risk + volatility_risk
    
    final_score = base_multipliers - penalties

    # Pull list of matching buyers, carriers, warehouses
    matching_buyers = db.query(User).filter(User.role == "Buyer", User.region == region).limit(3).all()
    matching_carriers = db.query(User).filter(User.role == "Carrier", User.region == region).limit(3).all()
    matching_warehouses = db.query(User).filter(User.role == "Warehouse", User.region == region).limit(3).all()

    return {
        "final_score": round(final_score, 2),
        "expected_revenue": expected_revenue,
        "deficit": deficit,
        "matching_buyers": [{"id": b.id, "name": b.name, "trust": b.trust_index} for b in matching_buyers],
        "matching_carriers": [{"id": c.id, "name": c.name, "tariff": c.tariff_per_km} for c in matching_carriers],
        "matching_warehouses": [{"id": w.id, "name": w.name, "price": w.storage_price} for w in matching_warehouses]
    }

def generate_ai_recommendations(db: Session, user: User) -> list:
    """
    Generates 3 recommendation scenarios: Safe, Profit, Aggressive.
    Utilizes Gemini API with local fallback if keys are missing or failures occur.
    """
    crop = user.crop or "Wheat"
    area = user.area or 10.0
    region = user.region or "Central"
    expected_yield = user.expected_yield or (area * 4.0)
    trust = user.trust_index

    # Pre-calculate data locally
    scoring_data = calculate_local_scoring(crop, area, region, expected_yield, trust, db)

    # Let's draft standard fallback answers first in case Gemini is offline or fails
    fallback_scenarios = [
        {
            "scenario": "Safe",
            "recommended_crop": crop,
            "expected_profit": round(scoring_data["expected_revenue"] * 0.85, 2),
            "risk_level": "Low",
            "recommended_volume": expected_yield,
            "recommend_sell_by": "В течение 3 месяцев после сбора",
            "action_type": "store",
            "explanation_why": "Стабильная культура с устойчивым местным спросом. Рекомендуется заложить урожай на склад и дождаться сезонного повышения цен.",
            "explanation_risk": "Небольшая упущенная выгода в случае резкого скачка цен на рынке.",
            "explanation_next": "Заключите предварительное соглашение со складом хранения и перевозчиком.",
            "oversupply_deficit_calc": round(scoring_data["deficit"], 2),
            "trust_index_impact": 2.0
        },
        {
            "scenario": "Profit",
            "recommended_crop": crop,
            "expected_profit": round(scoring_data["expected_revenue"] * 1.0, 2),
            "risk_level": "Medium",
            "recommended_volume": expected_yield,
            "recommend_sell_by": "Сразу после сбора",
            "action_type": "sell_now",
            "explanation_why": "Оптимальный баланс спроса и цены. Покупатели в вашем регионе готовы выкупить весь объем прямо с поля.",
            "explanation_risk": "Незначительные риски снижения цены перед началом массовой уборки.",
            "explanation_next": "Отправьте предложения подходящим покупателям и согласуйте условия доставки.",
            "oversupply_deficit_calc": round(scoring_data["deficit"], 2),
            "trust_index_impact": 5.0
        },
        {
            "scenario": "Aggressive",
            "recommended_crop": f"High-yield {crop} or Sunflower",
            "expected_profit": round(scoring_data["expected_revenue"] * 1.3, 2),
            "risk_level": "High",
            "recommended_volume": expected_yield * 1.1,
            "recommend_sell_by": "Заранее (фьючерс)",
            "action_type": "pre_contract",
            "explanation_why": "Повышенная доходность за счет контрактования дефицитных объемов с крупными переработчиками из соседних регионов.",
            "explanation_risk": "Риск срыва объемов поставок из-за погодных условий и высокие требования к качеству.",
            "explanation_next": "Опубликуйте предложение о долгосрочном контракте с предоплатой на AgroBalance.",
            "oversupply_deficit_calc": round(scoring_data["deficit"] * 1.2, 2),
            "trust_index_impact": 8.0
        }
    ]

    scenarios = []

    # Attempt to query Gemini API
    if settings.GEMINI_API_KEY:
        prompt = f"""
        Вы — эксперт агрорынка AgroBalance. Сгенерируйте 3 сценария (Safe, Profit, Aggressive) для фермера:
        Культура: {crop}
        Площадь поля: {area} га
        Регион: {region}
        Ожидаемый урожай: {expected_yield} тонн
        Trust Index (рейтинг доверия): {trust}/100.
        
        Локальные данные рынка:
        - Ожидаемая базовая прибыль: {scoring_data['expected_revenue']} руб.
        - Индекс дефицита: {scoring_data['deficit']}
        - Количество покупателей в регионе: {len(scoring_data['matching_buyers'])}

        Сформулируйте рекомендации на простом, понятном фермеру языке (без сложной терминологии).
        Верните ответ строго в формате JSON, представляющем собой массив из 3-х объектов следующей структуры:
        [
          {{
            "scenario": "Safe" | "Profit" | "Aggressive",
            "recommended_crop": "название культуры",
            "expected_profit": число (ожидаемая прибыль в рублях),
            "risk_level": "Low" | "Medium" | "High",
            "recommended_volume": число (объем в тоннах),
            "recommend_sell_by": "строка с описанием сроков",
            "action_type": "sell_now" | "store" | "pre_contract",
            "explanation_why": "Почему это выгодно (простыми словами)",
            "explanation_risk": "Что может пойти не так (простыми словами)",
            "explanation_next": "Что делать дальше (простыми словами)",
            "oversupply_deficit_calc": число (расчет дефицита или переизбытка),
            "trust_index_impact": число (влияние на рейтинг доверия)
          }},
          ...
        ]
        """
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            # Synchronous request inside our sync helper
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text = data['candidates'][0]['content']['parts'][0]['text']
                    # Parse output JSON
                    scenarios = json.loads(text)
        except Exception as e:
            # Fall back to deterministic calculations if API throws error
            print(f"Gemini API invocation error, using local fallback calculations: {e}")
            scenarios = fallback_scenarios
    else:
        scenarios = fallback_scenarios

    # Write output to database for persistence
    db_recs = []
    for s in scenarios:
        rec = Recommendation(
            user_id=user.id,
            scenario=s["scenario"],
            recommended_crop=s["recommended_crop"],
            expected_profit=s["expected_profit"],
            risk_level=s["risk_level"],
            recommended_volume=s.get("recommended_volume", expected_yield),
            recommend_sell_by=s.get("recommend_sell_by", "В течение сезона"),
            action_type=s.get("action_type", "sell_now"),
            explanation_why=s["explanation_why"],
            explanation_risk=s["explanation_risk"],
            explanation_next=s["explanation_next"],
            oversupply_deficit_calc=s.get("oversupply_deficit_calc", scoring_data["deficit"]),
            trust_index_impact=s.get("trust_index_impact", 3.0),
            matching_buyers=scoring_data["matching_buyers"],
            matching_warehouses=scoring_data["matching_warehouses"],
            matching_carriers=scoring_data["matching_carriers"]
        )
        db.add(rec)
        db_recs.append(rec)
        
    db.commit()
    for r in db_recs:
        db.refresh(r)
        
    return db_recs
