from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, nullable=False)  # Farmer, Buyer, Carrier, Warehouse, Processor, Supplier, Agronomist, Admin
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    region = Column(String, nullable=True)
    
    # Farmer specific fields
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    area = Column(Float, nullable=True)  # in hectares
    crop = Column(String, nullable=True)
    expected_yield = Column(Float, nullable=True)  # in tons
    planting_date = Column(DateTime, nullable=True)
    harvest_date = Column(DateTime, nullable=True)
    photo_url = Column(String, nullable=True)
    photo_hash = Column(String, nullable=True)  # for image-duplication checks
    
    # Buyer specific fields
    needed_crops = Column(String, nullable=True)  # comma separated
    desired_volume = Column(Float, nullable=True)
    price_range = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)
    delivery_terms = Column(String, nullable=True)
    
    # Carrier specific fields
    vehicle_type = Column(String, nullable=True)
    capacity = Column(Float, nullable=True)  # in tons
    tariff_per_km = Column(Float, nullable=True)
    routes = Column(String, nullable=True)
    
    # Warehouse specific fields
    capacity_tons = Column(Float, nullable=True)
    storage_conditions = Column(String, nullable=True)
    storage_price = Column(Float, nullable=True)
    availability = Column(Boolean, default=True)

    # General
    verification_status = Column(String, default="pending")  # pending, verified, rejected
    trust_index = Column(Float, default=50.0)  # scale 0 to 100
    password_hash = Column(String, nullable=True)  # simple auth
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Referrals
    referred_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    referral_code = Column(String, unique=True, index=True, nullable=True)
    state = Column(String, default="idle")
    state_data = Column(String, default="{}")

    # Relationships
    referred_by = relationship("User", remote_side=[id])
    referral_rewards = relationship("ReferralReward", foreign_keys="[ReferralReward.referrer_id]", back_populates="referrer")
    offers = relationship("MarketOffer", back_populates="seller")
    requests = relationship("MarketRequest", back_populates="buyer")
    recommendations = relationship("Recommendation", back_populates="user")
    trust_events = relationship("TrustEvent", back_populates="user")
    antifraud_logs = relationship("AntiFraudLog", back_populates="user")


class MarketOffer(Base):
    __tablename__ = "market_offers"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"))
    crop = Column(String, nullable=False)
    volume = Column(Float, nullable=False)  # in tons
    price_per_unit = Column(Float, nullable=False)  # price per ton
    region = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="offers")


class MarketRequest(Base):
    __tablename__ = "market_requests"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"))
    crop = Column(String, nullable=False)
    volume = Column(Float, nullable=False)  # in tons
    price_per_unit = Column(Float, nullable=False)
    region = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    buyer = relationship("User", back_populates="requests")


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"))
    buyer_id = Column(Integer, ForeignKey("users.id"))
    carrier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    crop = Column(String, nullable=False)
    volume = Column(Float, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    
    region = Column(String, nullable=False)
    delivery_type = Column(String, nullable=False)  # pickup, delivery, warehouse
    pickup_location = Column(String, nullable=True)
    delivery_location = Column(String, nullable=True)
    
    # Statuses
    # draft, proposed, accepted, escrow_pending, paid_to_escrow, in_delivery, delivered, confirmed, completed, disputed, cancelled
    status = Column(String, default="proposed")
    payment_status = Column(String, default="pending")  # pending, paid, holding, released, refunded
    commission_status = Column(String, default="pending")  # pending, collected, refunded
    
    trust_snapshot_seller = Column(Float, nullable=True)
    trust_snapshot_buyer = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    events = relationship("DealEvent", back_populates="deal")
    escrows = relationship("EscrowPayment", back_populates="deal")
    commissions = relationship("Commission", back_populates="deal")
    disputes = relationship("Dispute", back_populates="deal")
    delivery_confirmations = relationship("DeliveryConfirmation", back_populates="deal")


class DealEvent(Base):
    __tablename__ = "deal_events"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g., "created", "accepted", "deposited", "shipped", "disputed"
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="events")


class EscrowPayment(Base):
    __tablename__ = "escrow_payments"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    payment_method = Column(String, nullable=False)  # card, ton, usdt, stars, bank
    amount = Column(Float, nullable=False)
    platform_fee = Column(Float, nullable=False)  # 1% platform commission
    status = Column(String, default="pending")  # pending, locked, released, refunded
    tx_hash = Column(String, nullable=True)
    escrow_wallet = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    deal = relationship("Deal", back_populates="escrows")


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, earned, refunded
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="commissions")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    opened_by_id = Column(Integer, ForeignKey("users.id"))
    reason = Column(Text, nullable=False)
    status = Column(String, default="open")  # open, resolved, closed
    arbiter_resolution = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    deal = relationship("Deal", back_populates="disputes")


class DeliveryConfirmation(Base):
    __tablename__ = "delivery_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    carrier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    photo_url = Column(String, nullable=True)
    document_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    confirmed_by_buyer = Column(Boolean, default=False)
    confirmed_by_seller = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="delivery_confirmations")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scenario = Column(String, nullable=False)  # Safe, Profit, Aggressive
    recommended_crop = Column(String, nullable=False)
    expected_profit = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)  # Low, Medium, High
    recommended_volume = Column(Float, nullable=True)
    recommend_sell_by = Column(String, nullable=True)
    action_type = Column(String, nullable=False)  # sell_now, store, pre_contract
    
    explanation_why = Column(Text, nullable=False)
    explanation_risk = Column(Text, nullable=False)
    explanation_next = Column(Text, nullable=False)
    
    oversupply_deficit_calc = Column(Float, nullable=True)
    trust_index_impact = Column(Float, nullable=True)
    
    matching_buyers = Column(JSON, nullable=True)      # lists of suitable buyers
    matching_warehouses = Column(JSON, nullable=True)  # lists of storage options
    matching_carriers = Column(JSON, nullable=True)    # lists of logistics providers
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recommendations")
    feedback = relationship("RecommendationFeedback", back_populates="recommendation")


class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"

    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    feedback_type = Column(String, nullable=False)  # accept, reject, like, dislike
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="feedback")


class MarketSignal(Base):
    __tablename__ = "market_signals"

    id = Column(Integer, primary_key=True, index=True)
    crop = Column(String, nullable=False)
    region = Column(String, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    demand_volume = Column(Float, nullable=False)
    supply_volume = Column(Float, nullable=False)
    deficit_score = Column(Float, nullable=False)  # high value = high deficit
    oversupply_score = Column(Float, nullable=False)
    weather_risk = Column(Float, default=0.0)      # 0 to 10
    created_at = Column(DateTime, default=datetime.utcnow)


class TrustEvent(Base):
    __tablename__ = "trust_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    score_change = Column(Float, nullable=False)
    factor = Column(String, nullable=False)  # verified_geo, completed_deal, complaint, direct_contacts
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trust_events")


class AntiFraudLog(Base):
    __tablename__ = "antifraud_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rule_triggered = Column(String, nullable=False)  # coordinate_match, duplicate_photo, impossible_yield
    severity = Column(String, nullable=False)  # low, medium, high
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="antifraud_logs")


class ReferralReward(Base):
    __tablename__ = "referral_rewards"

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"))
    referee_id = Column(Integer, ForeignKey("users.id"))
    deal_id = Column(Integer, ForeignKey("deals.id"))
    reward_amount = Column(Float, nullable=False)  # e.g., 20% of the 1% platform fee
    created_at = Column(DateTime, default=datetime.utcnow)

    referrer = relationship("User", foreign_keys=[referrer_id], back_populates="referral_rewards")
    referee = relationship("User", foreign_keys=[referee_id])
    deal = relationship("Deal")
