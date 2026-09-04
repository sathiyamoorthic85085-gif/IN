import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LockKeyhole,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Utensils,
  Video,
  VideoOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
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

interface MealHeadCountStat {
  id: string;
  label: string;
  icon: string;
  type: "food" | "snacks";
  time: string;
  desc: string;
  servedCount: number;
  totalEligible: number;
  remainingCount: number;
  percentServed: number;
}

interface RecentScanActivity {
  id: string;
  tokenId: string;
  memberName: string;
  teamName: string;
  mealId: string;
  mealLabel: string;
  mealIcon: string;
  timestamp: string;
  action: "redeemed" | "undone";
  scannedBy: string;
}

interface HeadCountResponse {
  totalRegisteredAttendees: number;
  totalSquads: number;
  mealStats: MealHeadCountStat[];
  recentActivity: RecentScanActivity[];
}

const MEALS = [
  { id: "sep24_mrng_snacks", label: "24th Sep Morning Snacks", icon: "☕", type: "snacks", time: "09:00 AM" },
  { id: "sep24_night_dinner", label: "24th Sep Night Dinner", icon: "🍽️", type: "food", time: "08:30 PM" },
  { id: "sep24_night_snacks", label: "24th Sep Night Snacks", icon: "🌙", type: "snacks", time: "01:00 AM" },
  { id: "sep25_mrng_bfast", label: "25th Sep Morning Breakfast", icon: "🌅", type: "food", time: "07:30 AM" },
  { id: "sep25_mrng_snacks", label: "25th Sep Morning Snacks", icon: "☕", type: "snacks", time: "11:00 AM" },
  { id: "sep25_aft_snacks", label: "25th Sep Afternoon Snacks", icon: "🥪", type: "snacks", time: "03:30 PM" },
];

export default function AdminFoodScanner() {
  const [, setLocation] = useLocation();
  const [organizerEmail, setOrganizerEmail] = useState<string>(() => {
    return sessionStorage.getItem("innohack26_organizer_email") || "";
  });
  const [loginInput, setLoginInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Scanner state
  const [searchInput, setSearchInput] = useState("");
  const [activeMealId, setActiveMealId] = useState<string>("sep24_night_dinner");
  const [currentPass, setCurrentPass] = useState<FoodPassRecord | null>(null);
  const [currentTeam, setCurrentTeam] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdatingMeal, setIsUpdatingMeal] = useState(false);

  // Headcount & stats state
  const [metrics, setMetrics] = useState<HeadCountResponse | null>(null);
  const [isFetchingMetrics, setIsFetchingMetrics] = useState(false);

  // Camera scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isAuthenticated = useMemo(() => {
    return Boolean(organizerEmail && organizerEmail.includes("@"));
  }, [organizerEmail]);

  const fetchMetrics = async () => {
    setIsFetchingMetrics(true);
    try {
      const res = await fetch("/api/food-token?action=headcount");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // ignore
    } finally {
      setIsFetchingMetrics(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 10000); // 10s auto-refresh head counts
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !loginInput.includes("@")) {
      return toast.error("Please enter a valid organiser email address.");
    }
    setIsLoggingIn(true);
    const email = loginInput.trim().toLowerCase();
    sessionStorage.setItem("innohack26_organizer_email", email);
    setOrganizerEmail(email);
    setIsLoggingIn(false);
    toast.success(`Welcome, Organiser (${email})`);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("innohack26_organizer_email");
    setOrganizerEmail("");
    setCurrentPass(null);
    setCurrentTeam([]);
    stopCamera();
    toast.info("Organiser session logged out.");
  };

  const handleSearch = async (queryStr?: string) => {
    const q = (queryStr || searchInput).trim();
    if (!q) return;

    setIsSearching(true);
    try {
      // Parse query if full URL was scanned
      let queryParam = q;
      if (q.includes("token=")) {
        try {
          const url = new URL(q.startsWith("http") ? q : `https://x.com/${q}`);
          queryParam = url.searchParams.get("token") || url.searchParams.get("ref") || q;
        } catch { }
      }

      const res = await fetch(`/api/food-token?token=${encodeURIComponent(queryParam)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Pass not found.");
      }
      const data = await res.json();
      setCurrentPass(data.pass);
      if (data.team && data.team.length > 0) {
        setCurrentTeam(data.team);
      } else if (data.pass) {
        setCurrentTeam([data.pass]);
      }
      setSearchInput("");
      toast.success(`Pass loaded for ${data.pass.memberName} (${data.pass.teamName})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pass not found.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleMeal = async (mealId: string, forceAction?: "redeem" | "undo", targetTokenId?: string) => {
    const tokenIdToUpdate = targetTokenId || currentPass?.tokenId;
    if (!tokenIdToUpdate) return;

    setIsUpdatingMeal(true);
    try {
      const res = await fetch("/api/food-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: tokenIdToUpdate,
          mealId,
          scannedBy: organizerEmail,
          forceAction,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update meal status.");
      }

      const data = await res.json();
      if (data.pass) {
        setCurrentPass(data.pass);
      }
      if (data.headCount) {
        setMetrics(data.headCount);
      }

      // Update current team member status in place
      setCurrentTeam((prev) =>
        prev.map((m) => {
          if (m.tokenId === tokenIdToUpdate) {
            return {
              ...m,
              meals: {
                ...(m.meals || {}),
                [mealId]: forceAction === "undo" ? false : true,
              },
            };
          }
          return m;
        })
      );

      const mealLabel = MEALS.find((m) => m.id === mealId)?.label || mealId;
      if (forceAction === "undo" || data.action === "undone") {
        toast.info(`↩️ ${mealLabel} redemption undone.`);
      } else {
        toast.success(`✅ ${mealLabel} marked as REDEEMED!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsUpdatingMeal(false);
    }
  };

  // Camera start/stop
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      toast.info("Camera active. Align participant QR in view.");
    } catch (err) {
      setIsCameraActive(false);
      toast.error("Camera access denied or unavailable. Use manual search or barcode scanner.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  if (!isAuthenticated) {
    return (
      <main className="admin-state" style={{ minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: "440px", width: "100%", background: "#081630", border: "1px solid rgba(98,185,255,0.3)", borderRadius: "16px", padding: "32px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
          <div style={{ width: "54px", height: "54px", background: "rgba(255,220,134,0.15)", border: "1px solid #ffdc86", borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "#ffdc86" }}>
            <LockKeyhole size={28} />
          </div>
          <p style={{ color: "#ffdc86", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold", letterSpacing: "1.5px", margin: "0 0 6px" }}>
            ORGANISER ACCESS ONLY
          </p>
          <h1 style={{ color: "#ffffff", fontSize: "28px", fontWeight: 900, margin: "0 0 10px" }}>
            MEAL SCANNER &amp; HEAD COUNT
          </h1>
          <p style={{ color: "#94bcf8", fontSize: "13px", lineHeight: "1.5", margin: "0 0 24px" }}>
            Sign in with your organiser email to access live catering head counts and scan participant meal passes.
          </p>

          <form onSubmit={handleLogin} style={{ display: "grid", gap: "14px" }}>
            <input
              type="email"
              required
              placeholder="e.g. sathiyamoorthic85085@gmail.com"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", background: "#040d1e", border: "1px solid rgba(98,185,255,0.4)", borderRadius: "8px", color: "#ffffff", fontSize: "14px", outline: "none" }}
            />
            <Button type="submit" disabled={isLoggingIn} style={{ width: "100%", background: "#2199ff", color: "#ffffff", fontWeight: "bold" }}>
              ACCESS SCANNER PORTAL &rarr;
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setLocation("/")}
            style={{ marginTop: "20px", background: "none", border: "none", color: "#62b9ff", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
          >
            Back to Public Event Site
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#030a1c", color: "#f8fafc", padding: "20px 16px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Top Navbar */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingBottom: "18px", borderBottom: "1px solid rgba(98,185,255,0.2)", marginBottom: "24px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ padding: "3px 8px", background: "rgba(33,153,255,0.2)", border: "1px solid #2199ff", borderRadius: "4px", color: "#ffdc86", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold" }}>
                ORGANISER CONSOLE
              </span>
              <span style={{ color: "#94bcf8", fontSize: "12px" }}>
                Logged in: <strong style={{ color: "#ffffff" }}>{organizerEmail}</strong>
              </span>
            </div>
            <h1 style={{ margin: "6px 0 0", color: "#ffffff", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 900, textTransform: "uppercase" }}>
              MEAL SCANNER &amp; <i style={{ color: "#ffdc86", fontStyle: "normal" }}>HEAD COUNT.</i>
            </h1>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={isFetchingMetrics}>
              <RefreshCw size={14} className={isFetchingMetrics ? "animate-spin" : ""} style={{ marginRight: "6px" }} />
              REFRESH STATS
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} style={{ borderColor: "#ef4444", color: "#f87171" }}>
              <LogOut size={14} style={{ marginRight: "6px" }} /> LOGOUT
            </Button>
          </div>
        </header>

        {/* Live Head Count Metrics Dashboard */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ margin: 0, color: "#ffdc86", fontSize: "15px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={18} /> LIVE CATERING HEAD COUNT METRICS
            </h2>
            <span style={{ color: "#94bcf8", fontSize: "12px" }}>
              Total Registered Attendees: <strong style={{ color: "#ffffff", fontSize: "14px" }}>{metrics?.totalRegisteredAttendees ?? 0}</strong>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            {MEALS.map((meal) => {
              const stat = metrics?.mealStats.find((s) => s.id === meal.id);
              const served = stat?.servedCount ?? 0;
              const total = stat?.totalEligible ?? (metrics?.totalRegisteredAttendees ?? 0);
              const percent = stat?.percentServed ?? (total > 0 ? Math.round((served / total) * 100) : 0);
              const isActive = activeMealId === meal.id;

              return (
                <div
                  key={meal.id}
                  onClick={() => setActiveMealId(meal.id)}
                  style={{
                    background: isActive ? "linear-gradient(145deg, #10346a, #081d3f)" : "#071736",
                    border: isActive ? "2px solid #ffdc86" : "1px solid rgba(98,185,255,0.25)",
                    borderRadius: "12px",
                    padding: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 0 16px rgba(255,220,134,0.3)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "20px" }}>{meal.icon}</span>
                    {isActive && (
                      <span style={{ background: "#ffdc86", color: "#07111d", padding: "1px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: 900, fontFamily: "monospace" }}>
                        ACTIVE SLOT
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "13px", lineHeight: "1.3", marginBottom: "4px" }}>
                    {meal.label}
                  </div>
                  <span style={{ color: "#94bcf8", fontSize: "11px", display: "block", marginBottom: "10px" }}>
                    {meal.time}
                  </span>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <span style={{ color: "#4ade80", fontSize: "20px", fontWeight: 900, fontFamily: "monospace" }}>
                      {served} <small style={{ color: "#94bcf8", fontSize: "11px", fontWeight: "normal" }}>SERVED</small>
                    </span>
                    <span style={{ color: "#ffdc86", fontSize: "11px", fontFamily: "monospace" }}>
                      {percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg, #2199ff, #4ade80)", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Scanner & Lookup Workbench */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "36px" }}>

          {/* Left: Scanner & Manual Lookup Box */}
          <div style={{ background: "#081a3d", border: "1px solid rgba(98,185,255,0.3)", borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: "16px", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
              <QrCode size={18} color="#ffdc86" /> SCAN OR SEARCH PARTICIPANT PASS
            </h3>

            {/* Camera Scanner Toggle */}
            <div style={{ marginBottom: "16px" }}>
              {isCameraActive ? (
                <div>
                  <div style={{ position: "relative", width: "100%", height: "220px", background: "#000", borderRadius: "10px", overflow: "hidden", marginBottom: "10px" }}>
                    <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: "20px", border: "2px dashed #ffdc86", borderRadius: "8px", pointerEvents: "none" }} />
                  </div>
                  <Button variant="outline" size="sm" onClick={stopCamera} style={{ width: "100%", borderColor: "#ef4444", color: "#f87171" }}>
                    <VideoOff size={14} style={{ marginRight: "6px" }} /> STOP CAMERA
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={startCamera} style={{ width: "100%", background: "rgba(33,153,255,0.1)", borderColor: "#2199ff", color: "#62b9ff" }}>
                  <Video size={16} style={{ marginRight: "8px" }} /> OPEN LIVE CAMERA SCANNER
                </Button>
              )}
            </div>

            {/* Manual / Barcode Gun Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ display: "grid", gap: "10px" }}>
              <label style={{ color: "#94bcf8", fontSize: "11px", fontWeight: "bold", fontFamily: "monospace" }}>
                ENTER TOKEN ID / REFERENCE CODE / PASTE SCAN URL
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="e.g. IH26-ABCDEF-F1"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", background: "#040d1e", border: "1px solid rgba(98,185,255,0.4)", borderRadius: "8px", color: "#ffffff", fontSize: "14px", outline: "none", fontFamily: "monospace" }}
                />
                <Button type="submit" disabled={isSearching} style={{ background: "#2199ff", color: "#ffffff" }}>
                  <Search size={16} />
                </Button>
              </div>
            </form>

            <p style={{ margin: "12px 0 0", color: "#6e8dbd", fontSize: "11px" }}>
              💡 Tip: USB / Bluetooth Barcode Scanners work automatically — just click the input box and scan attendee badges!
            </p>
          </div>

          {/* Right: Scanned Attendee Pass & Quick Redemption Card */}
          <div style={{ background: "#081a3d", border: currentPass ? "2px solid #2199ff" : "1px solid rgba(98,185,255,0.2)", borderRadius: "14px", padding: "20px" }}>
            {currentPass ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(98,185,255,0.2)", paddingBottom: "12px", marginBottom: "14px" }}>
                  <div>
                    <span style={{ display: "inline-block", background: "rgba(255,220,134,0.18)", color: "#ffdc86", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold" }}>
                      TOKEN: {currentPass.tokenId}
                    </span>
                    <h3 style={{ margin: "6px 0 2px", color: "#ffffff", fontSize: "22px", fontWeight: 900 }}>
                      {currentPass.memberName}
                    </h3>
                    <span style={{ color: "#94bcf8", fontSize: "12px" }}>
                      {currentPass.role} · Squad: <strong>{currentPass.teamName}</strong> ({currentPass.college})
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPass(null)} style={{ color: "#94bcf8" }}>
                    CLOSE
                  </Button>
                </div>

                {/* Quick 1-Tap Active Meal Checkoff */}
                <div style={{ background: "rgba(33,153,255,0.15)", border: "1px solid #2199ff", borderRadius: "10px", padding: "14px", marginBottom: "16px", textAlign: "center" }}>
                  <span style={{ color: "#ffdc86", fontSize: "11px", fontWeight: "bold", fontFamily: "monospace" }}>
                    CURRENT MEAL SLOT: {MEALS.find((m) => m.id === activeMealId)?.label.toUpperCase()}
                  </span>
                  <div style={{ marginTop: "8px" }}>
                    {currentPass.redemptions[activeMealId] ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                        <span style={{ color: "#4ade80", fontWeight: "bold", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <CheckCircle2 size={16} /> ALREADY REDEEMED ({new Date(currentPass.redemptions[activeMealId].redeemedAt).toLocaleTimeString()})
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleToggleMeal(activeMealId, "undo")} disabled={isUpdatingMeal} style={{ borderColor: "#ef4444", color: "#f87171" }}>
                          UNDO
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        onClick={() => handleToggleMeal(activeMealId, "redeem")}
                        disabled={isUpdatingMeal}
                        style={{ width: "100%", background: "#22c55e", color: "#041408", fontWeight: 900, fontSize: "16px" }}
                      >
                        ✓ MARK AS REDEEMED NOW
                      </Button>
                    )}
                  </div>
                </div>

                {/* All 6 Meal Checkpoints */}
                <h4 style={{ margin: "0 0 10px", color: "#ffffff", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>
                  ALL 6 MEAL SLOTS STATUS
                </h4>
                <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
                  {MEALS.map((meal) => {
                    const isRedeemed = Boolean(currentPass.redemptions[meal.id]);
                    return (
                      <div
                        key={meal.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: isRedeemed ? "rgba(34,197,94,0.12)" : "rgba(4,13,30,0.6)",
                          border: isRedeemed ? "1px solid #22c55e" : "1px solid rgba(98,185,255,0.15)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{meal.icon}</span>
                          <span style={{ color: "#ffffff", fontWeight: 600 }}>{meal.label}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isRedeemed ? (
                            <>
                              <span style={{ color: "#4ade80", fontWeight: "bold", fontFamily: "monospace", fontSize: "10px" }}>
                                REDEEMED
                              </span>
                              <Button size="sm" variant="ghost" onClick={() => handleToggleMeal(meal.id, "undo")} style={{ height: "24px", padding: "0 6px", fontSize: "10px", color: "#f87171" }}>
                                Undo
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleToggleMeal(meal.id, "redeem")} style={{ height: "24px", padding: "0 8px", fontSize: "11px", borderColor: "#2199ff", color: "#62b9ff" }}>
                              Redeem
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Squad Members Roster if more than 1 member */}
                {currentTeam.length > 1 && (
                  <div style={{ borderTop: "1px solid rgba(98,185,255,0.2)", paddingTop: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ color: "#ffdc86", fontSize: "11px", fontWeight: "bold", fontFamily: "monospace", textTransform: "uppercase" }}>
                        SQUAD ROSTER ({currentTeam.length} MEMBERS)
                      </span>
                      <span style={{ color: "#94bcf8", fontSize: "11px" }}>
                        Quick check-off for {MEALS.find(m => m.id === activeMealId)?.label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: "6px" }}>
                      {currentTeam.map((member, idx) => {
                        const mIsCurrent = member.tokenId === currentPass.tokenId;
                        const mClaimed = Boolean(member.meals?.[activeMealId]?.claimed || member.meals?.[activeMealId]);
                        return (
                          <div
                            key={member.tokenId || idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 10px",
                              background: mIsCurrent ? "rgba(33,153,255,0.18)" : "rgba(4,13,30,0.5)",
                              border: mIsCurrent ? "1px solid #2199ff" : "1px solid rgba(98,185,255,0.1)",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          >
                            <div>
                              <strong style={{ color: "#fff" }}>{member.memberName || `Member ${idx + 1}`}</strong>
                              <span style={{ color: "#94bcf8", fontSize: "10px", marginLeft: "6px" }}>({member.role || `Pass #${idx + 1}`})</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              {mClaimed ? (
                                <Button size="sm" variant="ghost" onClick={() => handleToggleMeal(activeMealId, "undo", member.tokenId)} style={{ height: "22px", padding: "0 6px", fontSize: "10px", color: "#f87171" }}>
                                  ✓ Done (Undo)
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleToggleMeal(activeMealId, "redeem", member.tokenId)} style={{ height: "22px", padding: "0 8px", fontSize: "10px", borderColor: "#22c55e", color: "#4ade80" }}>
                                  Mark
                                </Button>
                              )}
                              {!mIsCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleSearch(member.tokenId)}
                                  style={{ background: "none", border: "none", color: "#62b9ff", fontSize: "10px", cursor: "pointer", textDecoration: "underline" }}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6e8dbd" }}>
                <Utensils size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <p style={{ fontSize: "14px", margin: "0 0 4px", color: "#ffffff" }}>
                  AWAITING SCAN OR SEARCH
                </p>
                <span style={{ fontSize: "12px" }}>
                  Scan a QR pass or enter a token code to verify attendee details and stamp meals.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Live Activity Feed */}
        {metrics && metrics.recentActivity && metrics.recentActivity.length > 0 && (
          <section style={{ background: "#06132d", border: "1px solid rgba(98,185,255,0.2)", borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 14px", color: "#ffdc86", fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={16} /> LIVE REDEMPTION AUDIT FEED (RECENT 20 SCANS)
            </h3>
            <div style={{ display: "grid", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
              {metrics.recentActivity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(4,13,30,0.6)",
                    borderLeft: act.action === "redeemed" ? "3px solid #22c55e" : "3px solid #ef4444",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "#ffffff", fontWeight: "bold" }}>{act.memberName}</span>{" "}
                    <span style={{ color: "#94bcf8" }}>({act.teamName})</span> —{" "}
                    <span style={{ color: "#ffdc86" }}>{act.mealIcon} {act.mealLabel}</span>
                  </div>
                  <div style={{ color: "#6e8dbd", fontFamily: "monospace", fontSize: "11px" }}>
                    {new Date(act.timestamp).toLocaleTimeString()} by {act.scannedBy.split("@")[0]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
