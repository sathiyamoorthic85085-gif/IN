import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MealRedemptionInfo {
  redeemedAt: string;
  redeemedBy?: string;
  claimed?: boolean;
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
  redemptions?: Record<string, MealRedemptionInfo | boolean | string>;
}

const MEALS = [
  { id: "attendance", label: "Event Check-in & Attendance", icon: "🎟️", type: "checkin", time: "Sep 24, 08:30 AM", desc: "Welcome Desk & Squad Kit Verification" },
  { id: "sep24_mrng_snacks", label: "Day 1 Morning Refreshments", icon: "☕", type: "snacks", time: "Sep 24, 10:30 AM", desc: "Hot Tea / Coffee & Light Snacks" },
  { id: "sep24_night_dinner", label: "Grand Hackathon Dinner", icon: "🍽️", type: "food", time: "Sep 24, 08:30 PM", desc: "Full Course Buffet Feast (Veg & Non-Veg)" },
  { id: "sep24_night_snacks", label: "Midnight Sprint Snacks", icon: "🌙", type: "snacks", time: "Sep 25, 01:00 AM", desc: "Energy Drinks, Hot Beverages & Midnight Snacks" },
  { id: "sep25_mrng_bfast", label: "Day 2 Sprint Breakfast", icon: "🌅", type: "food", time: "Sep 25, 07:30 AM", desc: "Hot South Indian Breakfast & Coffee" },
  { id: "sep25_mrng_snacks", label: "Day 2 Pitch Refreshments", icon: "☕", type: "snacks", time: "Sep 25, 11:30 AM", desc: "Pre-Evaluation Refreshments & Beverages" },
  { id: "sep25_aft_snacks", label: "Valedictory High Tea", icon: "🥪", type: "snacks", time: "Sep 25, 03:30 PM", desc: "Closing Ceremony Treats & High Tea" },
];

export default function FoodTokenPortal() {
  const [, setLocation] = useLocation();
  const [pass, setPass] = useState<FoodPassRecord | null>(null);
  const [teamMembers, setTeamMembers] = useState<FoodPassRecord[]>([]);
  const [selectedMemberIdx, setSelectedMemberIdx] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string>("");

  const loadPassData = async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams(window.location.search);
    let token = (params.get("token") || params.get("tokenId") || "").trim();
    const ref = (params.get("ref") || "").trim();
    const m = parseInt(params.get("m") || "1", 10);

    // Extract token if full url was passed in token query
    if (token.includes("token=")) {
      try {
        const u = new URL(token.startsWith("http") ? token : `https://x.com/${token}`);
        token = u.searchParams.get("token") || token;
      } catch {}
    }

    const queryKey = token || ref;

    if (!queryKey) {
      setIsLoading(false);
      setError("Please provide a valid pass token or reference code in the URL.");
      return;
    }

    // Try offline cache first for instant render
    const cached = localStorage.getItem(`innohack26_pass_${queryKey}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.pass) setPass(parsed.pass);
        if (parsed.team && parsed.team.length > 0) setTeamMembers(parsed.team);
      } catch {}
    }

    try {
      const queryParams = new URLSearchParams();
      if (token) queryParams.set("token", token);
      if (ref) queryParams.set("ref", ref);
      if (m) queryParams.set("m", String(m));

      const res = await fetch(`/api/food-token?${queryParams.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Food pass "${queryKey}" could not be found.`);
      }

      const data = await res.json();
      const currentPassData = data.pass;
      const teamList = data.team && data.team.length > 0 ? data.team : currentPassData ? [currentPassData] : [];

      setPass(currentPassData);
      setTeamMembers(teamList);
      setSelectedMemberIdx(currentPassData?.memberIndex || m || 1);

      // Save to local cache
      localStorage.setItem(`innohack26_pass_${queryKey}`, JSON.stringify({ pass: currentPassData, team: teamList }));

      // Fetch Crisp SVG QR from /api/qr
      try {
        const qrRes = await fetch(
          `/api/qr?token=${encodeURIComponent(currentPassData?.tokenId || queryKey)}&ref=${encodeURIComponent(
            currentPassData?.referenceCode || ref || queryKey
          )}&m=${currentPassData?.memberIndex || 1}&format=svg&size=300`
        );
        if (qrRes.ok) {
          const svg = await qrRes.text();
          setQrSvg(svg);
        }
      } catch {}
    } catch (err: any) {
      // If network failed but cache exists, we still show the cached pass
      if (!pass) {
        setError(err.message || "Failed to load digital food pass. Please check your link or network.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPassData();
  }, []);

  const switchMember = (idx: number) => {
    setSelectedMemberIdx(idx);
    if (teamMembers.length >= idx) {
      const target = teamMembers[idx - 1];
      if (target) {
        setPass(target);
        // Refresh SVG for this member
        fetch(
          `/api/qr?token=${encodeURIComponent(target.tokenId)}&ref=${encodeURIComponent(target.referenceCode)}&m=${target.memberIndex}&format=svg&size=300`
        )
          .then((r) => r.ok && r.text())
          .then((svg) => svg && setQrSvg(svg))
          .catch(() => {});
      }
    }
  };

  const isMealClaimed = (mealId: string): boolean => {
    if (!pass || !pass.redemptions) return false;
    const val = pass.redemptions[mealId];
    if (!val) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      return val.toLowerCase().includes("claim") && !val.toLowerCase().includes("unclaim");
    }
    if (typeof val === "object" && val.claimed !== undefined) return Boolean(val.claimed);
    return true;
  };

  const currentPassToken = pass?.tokenId || (pass?.referenceCode ? `${pass.referenceCode}-F${selectedMemberIdx}` : "IH26-PASS");
  const qrDirectPngUrl = `/api/qr?token=${encodeURIComponent(currentPassToken)}&ref=${encodeURIComponent(
    pass?.referenceCode || ""
  )}&m=${selectedMemberIdx}&format=png&size=500`;

  const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : ""
  )}&color=07111d&bgcolor=ffffff&qzone=1`;

  return (
    <main className="registration-page" style={{ minHeight: "100vh", padding: "20px 14px", background: "#030a1c" }}>
      <section className="registration-shell" style={{ maxWidth: "720px", margin: "0 auto", padding: "0" }}>
        
        {/* Top Navbar */}
        <div
          style={{
            padding: "16px 20px",
            background: "#081636",
            borderBottom: "1px solid rgba(98, 185, 255, 0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button
            type="button"
            className="registration-back"
            onClick={() => setLocation("/")}
            style={{ margin: 0, padding: "6px 12px", fontSize: "12px" }}
          >
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> EVENT SITE
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                background: "rgba(37,211,102,0.15)",
                border: "1px solid #25d366",
                color: "#25d366",
                fontSize: "11px",
                fontWeight: 900,
                padding: "3px 8px",
                borderRadius: "4px",
                fontFamily: "monospace",
              }}
            >
              ● OFFICIAL PASS
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={loadPassData}
              disabled={isLoading}
              style={{ height: "30px", fontSize: "11px", background: "rgba(33,153,255,0.1)", borderColor: "#2199ff", color: "#90c8ff" }}
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} style={{ marginRight: 4 }} /> REFRESH
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px 20px" }}>
          {isLoading && !pass ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>🎟️</div>
              <p style={{ color: "#a9c8ee", fontFamily: "monospace", fontSize: "14px", letterSpacing: "1px" }}>
                SYNCHRONIZING DIGITAL PASS WITH GOOGLE SHEETS & EVENT REGISTRY…
              </p>
            </div>
          ) : error && !pass ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "14px",
              }}
            >
              <AlertCircle size={44} color="#f87171" style={{ margin: "0 auto 14px" }} />
              <h2 style={{ color: "#ffffff", fontSize: "22px", margin: "0 0 10px", fontWeight: "bold" }}>
                FOOD PASS NOT FOUND
              </h2>
              <p style={{ color: "#e2e8f0", fontSize: "13px", maxWidth: "460px", margin: "0 auto 20px", lineHeight: "1.6" }}>
                {error}
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <Button onClick={() => setLocation("/register")}>REGISTER YOUR SQUAD</Button>
                <Button variant="outline" onClick={() => setLocation("/community")}>VERIFY REFERENCE CODE</Button>
              </div>
            </div>
          ) : pass ? (
            <div>
              {/* Squad Member Switcher Tabs */}
              {teamMembers.length > 1 && (
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "#ffdc86",
                      fontSize: "11px",
                      fontWeight: "bold",
                      fontFamily: "monospace",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                    }}
                  >
                    SELECT SQUAD MEMBER PASS ({teamMembers.length} REGISTERED PARTICIPANTS):
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {teamMembers.map((m, idx) => {
                      const mIdx = idx + 1;
                      const isSelected = selectedMemberIdx === mIdx;
                      return (
                        <button
                          key={m.tokenId || idx}
                          type="button"
                          onClick={() => switchMember(mIdx)}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "8px",
                            border: isSelected ? "2px solid #2199ff" : "1px solid rgba(98, 185, 255, 0.25)",
                            background: isSelected ? "#0c285e" : "rgba(10, 28, 64, 0.5)",
                            color: isSelected ? "#ffffff" : "#94bcf8",
                            fontSize: "12px",
                            fontWeight: isSelected ? "bold" : "normal",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              background: isSelected ? "#2199ff" : "rgba(255,255,255,0.1)",
                              color: "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "bold",
                            }}
                          >
                            {mIdx}
                          </span>
                          <span>{m.memberName || (mIdx === 1 ? "Team Leader" : `Member ${mIdx}`)}</span>
                          {mIdx === 1 && (
                            <span style={{ fontSize: "10px", color: "#ffdc86", background: "rgba(255,220,134,0.15)", padding: "1px 5px", borderRadius: "3px" }}>
                              LEAD
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Pass Digital Badge */}
              <div
                style={{
                  background: "linear-gradient(180deg, #0a1f47 0%, #061430 100%)",
                  border: "2px solid #2199ff",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(33, 153, 255, 0.2)",
                  marginBottom: "24px",
                }}
              >
                {/* Header Banner */}
                <div
                  style={{
                    background: "linear-gradient(90deg, #0e2f6d, #144294)",
                    padding: "16px 20px",
                    borderBottom: "1px solid rgba(98, 185, 255, 0.3)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        background: "#25d366",
                        color: "#031707",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 900,
                        letterSpacing: "1px",
                      }}
                    >
                      VERIFIED ATTENDEE PASS
                    </span>
                    <h2 style={{ color: "#ffffff", fontSize: "20px", margin: "6px 0 2px", fontWeight: 900 }}>
                      {pass.memberName || "InnoHack Participant"}
                    </h2>
                    <span style={{ color: "#ffdc86", fontSize: "12px", fontFamily: "monospace", fontWeight: "bold" }}>
                      {pass.role || (selectedMemberIdx === 1 ? "Team Leader" : `Squad Member ${selectedMemberIdx}`)} · {pass.teamName}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: "#94bcf8", fontSize: "11px", display: "block" }}>PASS TOKEN ID</span>
                    <span style={{ color: "#4ade80", fontSize: "15px", fontFamily: "monospace", fontWeight: 900 }}>
                      {pass.tokenId || `${pass.referenceCode}-F${selectedMemberIdx}`}
                    </span>
                  </div>
                </div>

                {/* QR Code Presentation Box */}
                <div style={{ padding: "24px 20px", textAlign: "center", background: "#051126" }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "14px",
                      background: "#ffffff",
                      borderRadius: "14px",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                      marginBottom: "12px",
                      maxWidth: "260px",
                    }}
                  >
                    {qrSvg ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                        style={{ width: "230px", height: "230px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      />
                    ) : (
                      <img
                        src={fallbackQrUrl}
                        alt="Unique Food Pass QR"
                        width="230"
                        height="230"
                        style={{ display: "block", borderRadius: "8px" }}
                      />
                    )}
                  </div>
                  <p style={{ color: "#ffdc86", fontSize: "12px", fontWeight: "bold", margin: "0 0 6px", letterSpacing: "1px" }}>
                    SHOW THIS QR CODE AT CATERING &amp; EVENT DESK
                  </p>
                  <p style={{ color: "#8ab4f8", fontSize: "11px", margin: "0 0 14px" }}>
                    Scanning grants 1 meal portion per participant per slot. Non-transferable.
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                    <a
                      href={qrDirectPngUrl}
                      download={`InnoHack26_Pass_${currentPassToken}.png`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <Button size="sm" variant="outline" style={{ borderColor: "#2199ff", color: "#90c8ff", fontSize: "11px" }}>
                        <Download size={13} style={{ marginRight: 5 }} /> SAVE QR IMAGE
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `InnoHack-26 Pass - ${pass.memberName}`,
                            text: `Digital Food & Attendance Pass for ${pass.memberName} (${pass.teamName})`,
                            url: window.location.href,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Pass URL copied to clipboard!");
                        }
                      }}
                      style={{ borderColor: "rgba(255,220,134,0.4)", color: "#ffdc86", fontSize: "11px" }}
                    >
                      <Share2 size={13} style={{ marginRight: 5 }} /> SHARE PASS LINK
                    </Button>
                  </div>
                </div>

                {/* Squad & Institution Meta Table */}
                <div style={{ padding: "16px 20px", background: "#091a3c", borderTop: "1px solid rgba(98,185,255,0.2)" }}>
                  <table width="100%" style={{ fontSize: "13px", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 0", color: "#94bcf8" }}>Squad Name:</td>
                        <td align="right" style={{ color: "#ffffff", fontWeight: "bold" }}>{pass.teamName}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0", color: "#94bcf8" }}>Reference Code:</td>
                        <td align="right" style={{ color: "#ffdc86", fontFamily: "monospace", fontWeight: "bold" }}>{pass.referenceCode}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0", color: "#94bcf8" }}>College / Institution:</td>
                        <td align="right" style={{ color: "#ffffff" }}>{pass.college}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0", color: "#94bcf8" }}>Innovation Track:</td>
                        <td align="right" style={{ color: "#4ade80", fontWeight: "bold" }}>{(pass.buildType || "software").toUpperCase()} BUILD</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0", color: "#94bcf8" }}>Squad Size:</td>
                        <td align="right" style={{ color: "#ffffff" }}>{pass.memberCount || teamMembers.length || 1} Participants</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6 Meals & Attendance Checkpoint Timeline */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Utensils size={18} color="#ffdc86" /> MEAL &amp; REFRESHMENT SCHEDULE
                  </h3>
                  <span style={{ color: "#4ade80", fontSize: "11px", fontFamily: "monospace", fontWeight: "bold" }}>
                    ALL 6 MEALS INCLUDED
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {MEALS.map((meal) => {
                    const claimed = isMealClaimed(meal.id);
                    return (
                      <div
                        key={meal.id}
                        style={{
                          background: claimed ? "rgba(37,211,102,0.08)" : "#071736",
                          border: claimed ? "1px solid #25d366" : "1px solid rgba(98,185,255,0.2)",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "24px" }}>{meal.icon}</span>
                          <div>
                            <div style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold" }}>{meal.label}</div>
                            <div style={{ color: "#94bcf8", fontSize: "11px", marginTop: "2px" }}>
                              <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                              {meal.time} · {meal.desc}
                            </div>
                          </div>
                        </div>

                        <div>
                          {claimed ? (
                            <span
                              style={{
                                background: "rgba(37,211,102,0.2)",
                                color: "#4ade80",
                                border: "1px solid #25d366",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <CheckCircle2 size={13} /> REDEEMED
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "rgba(255,220,134,0.15)",
                                color: "#ffdc86",
                                border: "1px solid rgba(255,220,134,0.4)",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                whiteSpace: "nowrap",
                              }}
                            >
                              READY
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Event Location & Schedule Card */}
              <div
                style={{
                  background: "#081b3d",
                  border: "1px solid rgba(255,220,134,0.3)",
                  borderRadius: "14px",
                  padding: "18px 20px",
                  marginBottom: "20px",
                }}
              >
                <h4 style={{ color: "#ffdc86", fontSize: "13px", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={16} /> EVENT VENUE &amp; BUS TRANSIT
                </h4>
                <p style={{ color: "#ffffff", fontSize: "13px", fontWeight: "bold", margin: "0 0 4px" }}>
                  Erode Sengunthar Engineering College, Perundurai, Erode – 638 057
                </p>
                <p style={{ color: "#c0d4f8", fontSize: "12px", margin: "0 0 10px", lineHeight: "1.5" }}>
                  Dates: <strong>24th &amp; 25th September 2026 (24-Hour Continuous Hackathon)</strong>. Free college buses available on 40+ routes connecting Salem, Tirupur, Erode, Bhavani &amp; surrounding transit points.
                </p>
                <a
                  href="https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button size="sm" style={{ background: "#25d366", color: "#05160b", fontWeight: "bold", fontSize: "12px" }}>
                    JOIN OFFICIAL WHATSAPP COMMUNITY &rarr;
                  </Button>
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
