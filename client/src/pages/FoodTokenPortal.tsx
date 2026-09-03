import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, Utensils, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MealRedemptionInfo {
  redeemedAt: string;
  redeemedBy?: string;
}

interface FoodPassRecord {
  tokenId: string;
  referenceCode: string;
  memberIndex: number;
  memberName: string;
  role: string;
  teamName: string;
  college: string;
  domain: string;
  buildType: string;
  email: string;
  phone: string;
  memberCount: number;
  createdAt: string;
  redemptions: Record<string, MealRedemptionInfo>;
}

const MEALS = [
  { id: "sep24_mrng_snacks", label: "24th Sep Morning Snacks", icon: "☕", type: "snacks", time: "09:00 AM", desc: "Welcome Refreshments & Tea" },
  { id: "sep24_night_dinner", label: "24th Sep Night Dinner", icon: "🍽️", type: "food", time: "08:30 PM", desc: "Main Hackathon Feast" },
  { id: "sep24_night_snacks", label: "24th Sep Night Snacks", icon: "🌙", type: "snacks", time: "01:00 AM", desc: "Midnight Energy Boost" },
  { id: "sep25_mrng_bfast", label: "25th Sep Morning Breakfast", icon: "🌅", type: "food", time: "07:30 AM", desc: "Main Day 2 Breakfast" },
  { id: "sep25_mrng_snacks", label: "25th Sep Morning Snacks", icon: "☕", type: "snacks", time: "11:00 AM", desc: "Day 2 Morning Refreshments" },
  { id: "sep25_aft_snacks", label: "25th Sep Afternoon Snacks", icon: "🥪", type: "snacks", time: "03:30 PM", desc: "Valedictory High Tea" },
];

export default function FoodTokenPortal() {
  const [, setLocation] = useLocation();
  const [pass, setPass] = useState<FoodPassRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const ref = params.get("ref");
    const m = params.get("m");

    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (token) queryParams.set("token", token);
        if (ref) queryParams.set("ref", ref);
        if (m) queryParams.set("m", m);

        const res = await fetch(`/api/food-token?${queryParams.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Food pass not found.");
        }
        const data = await res.json();
        setPass(data.pass);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load food pass.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, []);

  const qrUrl = pass
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(window.location.href)}&color=07111d&bgcolor=ffffff&qzone=1`
    : "";

  return (
    <main className="registration-page" style={{ minHeight: "100vh", padding: "24px 16px" }}>
      <section className="registration-shell" style={{ maxWidth: "680px", margin: "0 auto" }}>
        
        <button
          type="button"
          className="registration-back"
          onClick={() => setLocation("/")}
          style={{ marginBottom: "20px" }}
        >
          <ArrowLeft size={16} /> BACK TO EVENT SITE
        </button>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🍽️</div>
            <p style={{ color: "#a9c8ee", fontFamily: "monospace" }}>VERIFYING DIGITAL FOOD PASS…</p>
          </div>
        ) : error || !pass ? (
          <div style={{ textAlign: "center", padding: "30px 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px" }}>
            <AlertCircle size={36} color="#f87171" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ color: "#ffffff", fontSize: "22px", margin: "0 0 8px" }}>FOOD PASS NOT FOUND</h2>
            <p style={{ color: "#fca5a5", fontSize: "14px", margin: "0 0 20px" }}>
              {error || "Please verify the link or QR code from your confirmation email."}
            </p>
            <Button onClick={() => setLocation("/")}>RETURN TO HOME</Button>
          </div>
        ) : (
          <div>
            {/* Header Lockup */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", background: "rgba(33,153,255,0.15)", border: "1px solid #2199ff", borderRadius: "20px", color: "#ffdc86", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold", marginBottom: "10px" }}>
                <ShieldCheck size={14} /> OFFICIAL INNOHACK-26 PASS
              </div>
              <h1 style={{ margin: "0 0 6px", color: "#ffffff", fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 900, textTransform: "uppercase" }}>
                MEAL & SNACKS <i style={{ color: "#ffdc86", fontStyle: "normal" }}>PASS.</i>
              </h1>
              <p style={{ color: "#94bcf8", fontSize: "14px", margin: 0 }}>
                Show this digital pass at the catering desk during each meal &amp; refreshment slot.
              </p>
            </div>

            {/* Member & Squad Badge Card */}
            <div style={{ background: "linear-gradient(135deg, #0d2757, #071530)", border: "2px solid #2199ff", borderRadius: "14px", padding: "20px", marginBottom: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(98,185,255,0.2)", paddingBottom: "16px", marginBottom: "16px" }}>
                <div>
                  <span style={{ display: "inline-block", background: "rgba(255,220,134,0.18)", color: "#ffdc86", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold", marginBottom: "6px" }}>
                    PASS #{pass.memberIndex} OF {pass.memberCount}
                  </span>
                  <h2 style={{ margin: "0 0 4px", color: "#ffffff", fontSize: "24px", fontWeight: 800 }}>
                    {pass.memberName}
                  </h2>
                  <span style={{ color: "#94bcf8", fontSize: "13px" }}>
                    {pass.role} · Squad: <strong style={{ color: "#ffffff" }}>{pass.teamName}</strong>
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "block", color: "#ffdc86", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold" }}>
                    TOKEN ID
                  </span>
                  <span style={{ color: "#ffffff", fontFamily: "monospace", fontSize: "16px", fontWeight: 900 }}>
                    {pass.tokenId}
                  </span>
                  <span style={{ display: "block", color: "#62b9ff", fontSize: "11px", marginTop: "2px" }}>
                    Ref: {pass.referenceCode}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", color: "#c0d4f8" }}>
                <div>🏛️ College: <strong style={{ color: "#fff" }}>{pass.college}</strong></div>
                <div>⚡ Track: <strong style={{ color: "#ffdc86", textTransform: "uppercase" }}>{pass.buildType} BUILD</strong></div>
                <div>🎯 Domain: <strong style={{ color: "#fff" }}>{pass.domain}</strong></div>
                <div>👥 Squad Size: <strong style={{ color: "#fff" }}>{pass.memberCount} Members</strong></div>
              </div>
            </div>

            {/* QR Code Presentation */}
            <div style={{ background: "#091a3a", border: "1px solid rgba(98,185,255,0.25)", borderRadius: "14px", padding: "20px", textAlign: "center", marginBottom: "24px" }}>
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: "10px", display: "inline-block", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>
                <img src={qrUrl} alt={`QR Code for ${pass.memberName}`} width="200" height="200" style={{ display: "block", width: "180px", height: "180px" }} />
              </div>
              <p style={{ margin: "12px 0 0", color: "#ffdc86", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>
                PRESENT THIS QR CODE TO CATERING ORGANISER
              </p>
              <span style={{ display: "block", color: "#94bcf8", fontSize: "11px", marginTop: "4px" }}>
                Organisers will scan this QR to verify and stamp your meal collection.
              </span>
            </div>

            {/* Meal Slots Redemption Status Grid */}
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ margin: "0 0 14px", color: "#ffffff", fontSize: "16px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Utensils size={18} color="#ffdc86" /> MEAL & REFRESHMENT REDEMPTION STATUS
              </h3>

              <div style={{ display: "grid", gap: "10px" }}>
                {MEALS.map((meal) => {
                  const redemption = pass.redemptions[meal.id];
                  const isRedeemed = Boolean(redemption);

                  return (
                    <div
                      key={meal.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        background: isRedeemed ? "rgba(34,197,94,0.12)" : "rgba(9,26,58,0.7)",
                        border: isRedeemed ? "1px solid #22c55e" : "1px solid rgba(98,185,255,0.2)",
                        borderRadius: "10px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "20px" }}>{meal.icon}</span>
                        <div>
                          <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px" }}>
                            {meal.label}
                          </div>
                          <span style={{ color: "#94bcf8", fontSize: "12px" }}>
                            {meal.desc} · <Clock size={11} style={{ display: "inline", verticalAlign: "middle" }} /> {meal.time}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isRedeemed ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#22c55e", color: "#05180c", padding: "4px 10px", borderRadius: "6px", fontWeight: "bold", fontSize: "11px", fontFamily: "monospace" }}>
                            <CheckCircle2 size={13} /> COLLECTED
                          </div>
                        ) : (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.06)", color: "#a9c8ee", border: "1px solid rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: "6px", fontWeight: 600, fontSize: "11px", fontFamily: "monospace" }}>
                            ⚪ PENDING
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support Notice */}
            <div style={{ textAlign: "center", borderTop: "1px solid rgba(98,185,255,0.2)", paddingTop: "16px" }}>
              <p style={{ margin: "0", color: "#8da9d4", fontSize: "12px" }}>
                InnoHack-26 · Kings Engineering College, Irungattukottai, Sriperumbudur, Chennai – 602 117
              </p>
            </div>

          </div>
        )}
      </section>
    </main>
  );
}
