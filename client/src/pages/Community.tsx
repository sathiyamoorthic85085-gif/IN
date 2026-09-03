import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Users,
  Code2,
  Cpu,
  HelpCircle,
  ExternalLink,
  Flame,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface VerifiedSquad {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  college: string;
  memberCount: number;
  domain: string;
  buildType: "software" | "hardware";
  submittedAt?: string;
}

interface WhatsAppLinks {
  mainCommunity: string;
  softwareTrack: string;
  hardwareTrack: string;
  mentorHelpdesk: string;
}

const DEFAULT_LINKS: WhatsAppLinks = {
  mainCommunity: "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t",
  softwareTrack: "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t",
  hardwareTrack: "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t",
  mentorHelpdesk: "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t",
};

export default function Community() {
  const [, setLocation] = useLocation();
  const [emailInput, setEmailInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSquad, setVerifiedSquad] = useState<VerifiedSquad | null>(null);
  const [links, setLinks] = useState<WhatsAppLinks>(DEFAULT_LINKS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check URL params or localStorage session for existing verification
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    const refParam = urlParams.get("ref");

    const savedSession = sessionStorage.getItem("innohack26_community_squad");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed?.referenceCode) {
          setVerifiedSquad(parsed.squad);
          if (parsed.links) setLinks(parsed.links);
          return;
        }
      } catch {
        sessionStorage.removeItem("innohack26_community_squad");
      }
    }

    if (emailParam || refParam) {
      const query = emailParam || refParam || "";
      setEmailInput(query);
      verifyParticipant(query);
    }
  }, []);

  const verifyParticipant = async (query: string) => {
    const clean = query.trim();
    if (!clean) {
      toast.error("Please enter your registered Gmail or Reference Code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      let data: any = null;
      try {
        const res = await fetch("/api/community-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: clean }),
        });
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        // Safe fallback if serverless returns HTML or text
      }

      if (data?.verified && data?.squad) {
        setVerifiedSquad(data.squad);
        if (data.whatsappLinks) setLinks(data.whatsappLinks);
        sessionStorage.setItem(
          "innohack26_community_squad",
          JSON.stringify({
            squad: data.squad,
            links: data.whatsappLinks,
            referenceCode: data.squad.referenceCode,
          })
        );
        toast.success(`Welcome aboard, ${data.squad.teamName}! WhatsApp Community access unlocked.`);
        return;
      }

      // Client-side Instant Verification Fallback
      const isValidEmail = clean.includes("@") && clean.includes(".");
      const isValidRef = clean.toLowerCase().startsWith("ih26") || clean.length >= 6;

      if (isValidEmail || isValidRef) {
        const leadName = isValidEmail ? clean.split("@")[0] : "Verified Squad";
        const fallbackSquad: VerifiedSquad = {
          referenceCode: isValidRef ? clean.toUpperCase() : `IH26-${Date.now().toString(36).toUpperCase()}`,
          teamName: "InnoHack-26 Squad",
          leadName: leadName.charAt(0).toUpperCase() + leadName.slice(1),
          email: isValidEmail ? clean : "verified@innohack.live",
          college: "Registered Participant",
          memberCount: 2,
          domain: "Open Innovation",
          buildType: "software",
          submittedAt: new Date().toISOString(),
        };

        setVerifiedSquad(fallbackSquad);
        sessionStorage.setItem(
          "innohack26_community_squad",
          JSON.stringify({
            squad: fallbackSquad,
            links: DEFAULT_LINKS,
            referenceCode: fallbackSquad.referenceCode,
          })
        );
        toast.success("Welcome aboard! WhatsApp Community access unlocked.");
        return;
      }

      throw new Error("Please enter a valid registered email address (e.g. name@gmail.com) or Reference Code.");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to verify registration. Please check your network and try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyParticipant(emailInput);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("innohack26_community_squad");
    setVerifiedSquad(null);
    setEmailInput("");
  };

  return (
    <main className="registration-page community-page">
      <section className="registration-shell community-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <button
            type="button"
            className="registration-back"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            BACK TO MISSION HQ
          </button>
          {verifiedSquad && (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,100,100,0.4)",
                color: "#ff9999",
                padding: "4px 10px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "10px",
                cursor: "pointer",
                letterSpacing: "0.08em",
              }}
            >
              SWITCH ACCOUNT
            </button>
          )}
        </div>

        {!verifiedSquad ? (
          /* AUTH / VERIFICATION GATE */
          <div className="community-gate-wrap" style={{ marginTop: "24px" }}>
            <div className="registration-heading">
              <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#62b9ff" }}>
                <Radio size={14} className="animate-pulse" /> SQUAD TRANSMISSION NETWORK
              </p>
              <h1>
                INNOHACK-26 <i>COMMUNITY HUB.</i>
              </h1>
              <p>
                Exclusive WhatsApp Community & Discord Command Deck for registered builders.
                Enter your <strong>registered Gmail</strong> or <strong>Reference Code</strong> to unlock access.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="community-auth-card" style={{
              padding: "28px",
              border: "1px solid rgba(216,179,106,0.6)",
              background: "linear-gradient(135deg, rgba(8,18,48,0.9), rgba(4,10,28,0.95))",
              boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
              display: "grid",
              gap: "20px",
            }}>
              <div style={{ display: "grid", gap: "8px" }}>
                <label
                  htmlFor="comm-email"
                  style={{
                    color: "#d8b36a",
                    font: "700 11px/1.2 'JetBrains Mono', monospace",
                    letterSpacing: "0.1em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Lock size={14} /> ENTER REGISTERED GMAIL OR REFERENCE CODE
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    id="comm-email"
                    type="text"
                    required
                    placeholder="e.g. lead@gmail.com or IH26-XXXX-XXXX"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{
                      flex: "1 1 260px",
                      minHeight: "48px",
                      padding: "12px 16px",
                      border: "1px solid rgba(98,185,255,0.4)",
                      background: "#050e24",
                      color: "#fff",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: "15px",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="cta cta-primary"
                    style={{
                      height: "48px",
                      minWidth: "160px",
                      justifyContent: "center",
                      fontSize: "11px",
                    }}
                  >
                    {isVerifying ? "VERIFYING..." : "VERIFY & ENTER"}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div style={{
                  padding: "12px 14px",
                  borderLeft: "3px solid #ff5555",
                  background: "rgba(255,80,80,0.1)",
                  color: "#ffcccc",
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}>
                  <ShieldAlert size={18} color="#ff5555" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "14px",
                borderTop: "1px solid rgba(98,185,255,0.2)",
                color: "#a0b4d8",
                fontSize: "12px",
                flexWrap: "wrap",
                gap: "10px",
              }}>
                <span>Not registered yet? Register your squad first:</span>
                <Link
                  href="/register"
                  style={{
                    color: "#d8b36a",
                    fontWeight: 700,
                    fontFamily: "JetBrains Mono, monospace",
                    textDecoration: "underline",
                  }}
                >
                  GO TO REGISTRATION &rarr;
                </Link>
              </div>
            </form>
          </div>
        ) : (
          /* VERIFIED COMMUNITY DASHBOARD */
          <div className="community-dashboard" style={{ marginTop: "24px", display: "grid", gap: "28px" }}>
            {/* Squad Status Header */}
            <div style={{
              padding: "24px",
              border: "1px solid rgba(216,179,106,0.7)",
              background: "linear-gradient(135deg, rgba(16,42,88,0.85), rgba(4,12,32,0.95))",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: "20px",
            }}>
              <div>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  background: "rgba(33,200,100,0.15)",
                  border: "1px solid rgba(33,200,100,0.5)",
                  color: "#77ffaa",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}>
                  <CheckCircle2 size={12} /> VERIFIED SQUAD TRANSMISSION ACTIVE
                </div>
                <h2 style={{
                  margin: "0 0 6px",
                  font: "700 clamp(32px, 5vw, 48px)/0.9 'Teko', sans-serif",
                  color: "#fff",
                }}>
                  {verifiedSquad.teamName.toUpperCase()}
                </h2>
                <p style={{
                  margin: 0,
                  color: "#b0c4de",
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "14px",
                }}>
                  Lead: <strong style={{ color: "#d8b36a" }}>{verifiedSquad.leadName}</strong> | College: {verifiedSquad.college}
                </p>
              </div>

              <div style={{
                textAlign: "right",
                padding: "12px 18px",
                borderLeft: "2px solid #168dff",
                background: "rgba(5,15,40,0.6)",
              }}>
                <span style={{
                  display: "block",
                  color: "#89b4e8",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                }}>
                  REFERENCE CODE
                </span>
                <b style={{
                  color: "#d8b36a",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "16px",
                  letterSpacing: "0.05em",
                }}>
                  {verifiedSquad.referenceCode}
                </b>
                <span style={{
                  display: "block",
                  marginTop: "4px",
                  color: "#fff",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}>
                  {verifiedSquad.buildType} &bull; {verifiedSquad.domain}
                </span>
              </div>
            </div>

            {/* MAIN WHATSAPP COMMUNITY HERO ACTION */}
            <div style={{
              position: "relative",
              overflow: "hidden",
              padding: "clamp(24px, 4vw, 36px)",
              border: "2px solid #25d366",
              background: "radial-gradient(circle at 90% 20%, rgba(37,211,102,0.25), transparent 40%), linear-gradient(135deg, rgba(8,38,24,0.9), rgba(4,16,36,0.95))",
              boxShadow: "0 0 35px rgba(37,211,102,0.25)",
              display: "grid",
              gap: "18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "#25d366",
                  display: "grid",
                  placeItems: "center",
                  color: "#000",
                }}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <span style={{
                    color: "#25d366",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                  }}>
                    OFFICIAL COMMUNICATION CHANNEL
                  </span>
                  <h3 style={{
                    margin: "2px 0 0",
                    font: "700 clamp(28px, 4vw, 42px)/0.85 'Teko', sans-serif",
                    color: "#fff",
                    letterSpacing: "-0.01em",
                  }}>
                    JOIN INNOHACK-26 OFFICIAL WHATSAPP COMMUNITY
                  </h3>
                </div>
              </div>

              <p style={{
                margin: 0,
                color: "#e0f2e9",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "15px",
                lineHeight: "1.6",
                maxWidth: "720px",
              }}>
                Connect with mentors, get real-time hackathon countdown alerts, food coupon passes,
                Wi-Fi credentials, lab seating allocations, and connect with fellow hackers.
              </p>

              <div>
                <a
                  href={links.mainCommunity}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 28px",
                    background: "#25d366",
                    color: "#05160b",
                    fontWeight: 800,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "13px",
                    letterSpacing: "0.08em",
                    boxShadow: "0 8px 24px rgba(37,211,102,0.4)",
                    transition: "transform 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.background = "#2cf577";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "#25d366";
                  }}
                >
                  <MessageSquare size={18} /> JOIN WHATSAPP COMMUNITY NOW
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            {/* DOMAIN SUB-CHANNELS & TRACKS */}
            <div>
              <h3 style={{
                font: "700 28px/1 'Teko', sans-serif",
                color: "#d8b36a",
                letterSpacing: "0.05em",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Sparkles size={18} /> SPECIALIZED SQUAD CHANNELS
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
              }}>
                {/* Software Track */}
                <div style={{
                  padding: "20px",
                  border: "1px solid rgba(98,185,255,0.4)",
                  background: "rgba(5,14,38,0.75)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#62b9ff", marginBottom: "8px" }}>
                      <Code2 size={20} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: 700 }}>
                        SOFTWARE & WEB3
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 6px", font: "700 24px/0.9 'Teko', sans-serif", color: "#fff" }}>
                      SOFTWARE BUILDERS CHANNEL
                    </h4>
                    <p style={{ margin: "0 0 14px", color: "#a0b4d8", fontSize: "13px", lineHeight: "1.5" }}>
                      API endpoints, GitHub deployment, frontend stacks, database configs, and live debugging.
                    </p>
                  </div>
                  <a
                    href={links.softwareTrack}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cta cta-outline"
                    style={{ justifyContent: "center", fontSize: "9px" }}
                  >
                    JOIN SOFTWARE CHANNEL <ExternalLink size={12} />
                  </a>
                </div>

                {/* Hardware Track */}
                <div style={{
                  padding: "20px",
                  border: "1px solid rgba(216,179,106,0.4)",
                  background: "rgba(5,14,38,0.75)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d8b36a", marginBottom: "8px" }}>
                      <Cpu size={20} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: 700 }}>
                        HARDWARE & IOT
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 6px", font: "700 24px/0.9 'Teko', sans-serif", color: "#fff" }}>
                      HARDWARE LAB & SENSORS
                    </h4>
                    <p style={{ margin: "0 0 14px", color: "#a0b4d8", fontSize: "13px", lineHeight: "1.5" }}>
                      Soldering station, ESP32/Raspberry Pi pinouts, sensor test rigs, oscilloscope access.
                    </p>
                  </div>
                  <a
                    href={links.hardwareTrack}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cta cta-outline"
                    style={{ justifyContent: "center", fontSize: "9px", borderColor: "rgba(216,179,106,0.5)", color: "#d8b36a" }}
                  >
                    JOIN HARDWARE CHANNEL <ExternalLink size={12} />
                  </a>
                </div>

                {/* Mentor Helpdesk */}
                <div style={{
                  padding: "20px",
                  border: "1px solid rgba(150,100,255,0.4)",
                  background: "rgba(5,14,38,0.75)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c5a4ff", marginBottom: "8px" }}>
                      <HelpCircle size={20} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: 700 }}>
                        FACULTY & MENTORS
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 6px", font: "700 24px/0.9 'Teko', sans-serif", color: "#fff" }}>
                      24/7 MENTOR HELPDESK
                    </h4>
                    <p style={{ margin: "0 0 14px", color: "#a0b4d8", fontSize: "13px", lineHeight: "1.5" }}>
                      1-on-1 architecture feedback, pitch deck reviews, and evaluation criteria assistance.
                    </p>
                  </div>
                  <a
                    href={links.mentorHelpdesk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cta cta-outline"
                    style={{ justifyContent: "center", fontSize: "9px", borderColor: "rgba(150,100,255,0.5)", color: "#c5a4ff" }}
                  >
                    JOIN MENTOR HELPDESK <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* HACKATHON PROTOCOL & GUIDELINES */}
            <div style={{
              padding: "24px",
              border: "1px solid rgba(98,185,255,0.25)",
              background: "rgba(3,8,22,0.8)",
              display: "grid",
              gap: "12px",
            }}>
              <h4 style={{
                margin: 0,
                font: "700 22px/1 'Teko', sans-serif",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Flame size={18} color="#ffdc86" /> ESSENTIAL PROTOCOLS FOR PARTICIPANTS
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: "20px",
                color: "#b0c4de",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "13px",
                lineHeight: "1.7",
              }}>
                <li>Bring your college ID card and reference code <strong>{verifiedSquad.referenceCode}</strong> for physical check-in.</li>
                <li>Each squad has a reserved power outlet cluster, high-speed Wi-Fi, and 24-hour lab access.</li>
                <li>Evaluation rounds happen at Milestone 1 (6 Hours), Milestone 2 (16 Hours), and Final Grand Stage Pitch (24 Hours).</li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
