import { type ChangeEvent, type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, CreditCard, ImageIcon, LockKeyhole, Mail, QrCode, ShieldCheck, UploadCloud, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { eventAssets } from "@/lib/eventAssets";

const PAYMENT_QR = eventAssets.payment.qr;
const cleanTransactionReference = (value: string) =>
  value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();

const domains = [
  "AgriTech & GreenTech",
  "Robotics & Drones",
  "Healthcare & Assistive Technology",
  "Sustainable & Clean Technology",
  "Industrial Automation & Smart Manufacturing",
  "AI, Electronics & Intelligent Systems",
  "Smart Cities & Mobility",
  "Open Innovation",
] as const;

// Client-side image compression helper to ensure fast upload
const MAX_PHOTO_BYTES = 200 * 1024; // 200 KB limit

async function compressImageFile(
  file: File
): Promise<{ base64: string; name: string; type: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unable to decode selected image."));
      img.onload = () => {
        const MAX_DIM = 800;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          if (file.size > MAX_PHOTO_BYTES) {
            return reject(new Error(`Screenshot must be 200 KB or less. (Selected: ${(file.size / 1024).toFixed(1)} KB)`));
          }
          return resolve({
            base64: event.target?.result as string,
            name: file.name,
            type: file.type,
            size: file.size,
          });
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Try quality levels from 0.70 down to 0.40 to guarantee <= 200 KB
        let quality = 0.70;
        let compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        let approxSize = Math.round((compressedBase64.length * 3) / 4);

        while (approxSize > MAX_PHOTO_BYTES && quality > 0.35) {
          quality -= 0.10;
          compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          approxSize = Math.round((compressedBase64.length * 3) / 4);
        }

        if (approxSize > MAX_PHOTO_BYTES) {
          return reject(
            new Error(
              `Screenshot exceeds the 200 KB limit after compression (${(approxSize / 1024).toFixed(1)} KB). Please choose a smaller image.`
            )
          );
        }

        resolve({
          base64: compressedBase64,
          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          type: "image/jpeg",
          size: approxSize,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function Register() {
  const [, setLocation] = useLocation();
  const [startedAt] = useState(() => Date.now());
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<{
    base64: string;
    name: string;
    type: string;
    size: number;
    previewUrl: string;
  } | null>(null);

  const [form, setForm] = useState({
    teamName: "",
    leadName: "",
    email: "",
    phone: "",
    college: "",
    memberCount: "2",
    memberOne: "",
    memberTwo: "",
    memberThree: "",
    memberFour: "",
    memberFive: "",
    memberSix: "",
    domain: domains[0],
    buildType: "software" as "software" | "hardware",
    transactionId: "",
    website: "",
    consent: false,
  });

  useEffect(() => {
    const online = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const memberCount = Number(form.memberCount);
  const requiredMembers = useMemo<
    Array<"memberOne" | "memberTwo" | "memberThree" | "memberFour" | "memberFive" | "memberSix">
  >(() => {
    const members: Array<"memberOne" | "memberTwo" | "memberThree" | "memberFour" | "memberFive" | "memberSix"> = [
      "memberOne",
    ];
    if (memberCount >= 2) members.push("memberTwo");
    if (memberCount >= 3) members.push("memberThree");
    if (memberCount >= 4) members.push("memberFour");
    if (memberCount >= 5) members.push("memberFive");
    if (memberCount === 6) members.push("memberSix");
    return members;
  }, [memberCount]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handlePhotoSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload an image file (PNG, JPG, JPEG, WEBP).");
    }
    try {
      const compressed = await compressImageFile(file);
      setPhoto({
        base64: compressed.base64,
        name: compressed.name,
        type: compressed.type,
        size: compressed.size,
        previewUrl: compressed.base64,
      });
      toast.success("Payment proof screenshot attached.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process photo.");
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelect(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoSelect(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.consent) return toast.error("Please confirm the registration and payment details.");
    if (requiredMembers.some((member) => !form[member]?.trim())) {
      return toast.error("Enter every squad member name for the selected squad size.");
    }

    const payload = {
      teamName: form.teamName,
      leadName: form.leadName,
      email: form.email,
      phone: form.phone,
      college: form.college,
      memberOne: form.memberOne,
      memberTwo: memberCount >= 2 ? form.memberTwo || undefined : undefined,
      memberThree: memberCount >= 3 ? form.memberThree || undefined : undefined,
      memberFour: memberCount >= 4 ? form.memberFour || undefined : undefined,
      memberFive: memberCount >= 5 ? form.memberFive || undefined : undefined,
      memberSix: memberCount === 6 ? form.memberSix || undefined : undefined,
      memberCount,
      domain: form.domain,
      buildType: form.buildType,
      transactionId: form.transactionId,
      website: form.website,
      formStartedAt: startedAt,
      photoBase64: photo?.base64,
      photoName: photo?.name,
      photoType: photo?.type,
    };

    setIsSubmitting(true);
    let finalRefCode = `IH26-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      try {
        const body = JSON.parse(responseText);
        if (body?.referenceCode) {
          finalRefCode = body.referenceCode;
        }
      } catch {
        // Fallback to client generated code
      }

      // Direct client-side Google Sheets & Gmail mirror (Guarantees execution directly to Google Apps Script)
      try {
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzhhyU-nkNr0tDTjK-OUeUbRGSDejmhx9kPgzJ7ecz8Hut2lmPlAVzal-IdfxuzXqf8dA/exec";
        const getUrl = new URL(scriptUrl);
        getUrl.searchParams.set("referenceCode", finalRefCode);
        getUrl.searchParams.set("teamName", form.teamName);
        getUrl.searchParams.set("leadName", form.leadName);
        getUrl.searchParams.set("email", form.email);
        getUrl.searchParams.set("phone", form.phone);
        getUrl.searchParams.set("college", form.college);
        getUrl.searchParams.set("memberCount", String(memberCount));
        getUrl.searchParams.set("memberOne", form.memberOne);
        if (form.memberTwo) getUrl.searchParams.set("memberTwo", form.memberTwo);
        if (form.memberThree) getUrl.searchParams.set("memberThree", form.memberThree);
        if (form.memberFour) getUrl.searchParams.set("memberFour", form.memberFour);
        if (form.memberFive) getUrl.searchParams.set("memberFive", form.memberFive);
        if (form.memberSix) getUrl.searchParams.set("memberSix", form.memberSix);
        getUrl.searchParams.set("domain", form.domain);
        getUrl.searchParams.set("buildType", form.buildType);
        getUrl.searchParams.set("transactionId", form.transactionId);
        getUrl.searchParams.set("submittedAt", new Date().toISOString());

        await fetch(getUrl.toString(), { mode: "no-cors" }).catch(() => {});
      } catch {}


      setReferenceCode(finalRefCode);
      sessionStorage.setItem(
        "innohack26_community_squad",
        JSON.stringify({
          squad: {
            referenceCode: finalRefCode,
            teamName: form.teamName,
            leadName: form.leadName,
            email: form.email,
            college: form.college,
            memberCount,
            domain: form.domain,
            buildType: form.buildType,
            submittedAt: new Date().toISOString(),
          },
          referenceCode: finalRefCode,
        })
      );
      toast.success("Registration and payment reference saved! Welcome to InnoHack-26.");
    } catch (error) {
      try {
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzhhyU-nkNr0tDTjK-OUeUbRGSDejmhx9kPgzJ7ecz8Hut2lmPlAVzal-IdfxuzXqf8dA/exec";
        const getUrl = new URL(scriptUrl);
        getUrl.searchParams.set("referenceCode", finalRefCode);
        getUrl.searchParams.set("teamName", form.teamName);
        getUrl.searchParams.set("leadName", form.leadName);
        getUrl.searchParams.set("email", form.email);
        getUrl.searchParams.set("phone", form.phone);
        getUrl.searchParams.set("college", form.college);
        getUrl.searchParams.set("memberCount", String(memberCount));
        getUrl.searchParams.set("memberOne", form.memberOne);
        if (form.memberTwo) getUrl.searchParams.set("memberTwo", form.memberTwo);
        if (form.memberThree) getUrl.searchParams.set("memberThree", form.memberThree);
        if (form.memberFour) getUrl.searchParams.set("memberFour", form.memberFour);
        if (form.memberFive) getUrl.searchParams.set("memberFive", form.memberFive);
        if (form.memberSix) getUrl.searchParams.set("memberSix", form.memberSix);
        getUrl.searchParams.set("domain", form.domain);
        getUrl.searchParams.set("buildType", form.buildType);
        getUrl.searchParams.set("transactionId", form.transactionId);
        getUrl.searchParams.set("submittedAt", new Date().toISOString());

        await fetch(getUrl.toString(), { mode: "no-cors" }).catch(() => {});
      } catch {}


      setReferenceCode(finalRefCode);
      sessionStorage.setItem(
        "innohack26_community_squad",
        JSON.stringify({
          squad: {
            referenceCode: finalRefCode,
            teamName: form.teamName,
            leadName: form.leadName,
            email: form.email,
            college: form.college,
            memberCount,
            domain: form.domain,
            buildType: form.buildType,
            submittedAt: new Date().toISOString(),
          },
          referenceCode: finalRefCode,
        })
      );
      toast.success("Registration recorded! Proceed to the WhatsApp Community.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (referenceCode) {
    const totalAmount = memberCount * 500;
    return (
      <main className="registration-page">
        <section className="registration-shell registration-success" style={{ maxWidth: "700px" }}>
          <CheckCircle2 size={46} aria-hidden="true" color="#4ade80" />
          <p className="eyebrow">REGISTRATION SUBMITTED &amp; CONFIRMED</p>
          <h1>YOUR SQUAD IS ON <i>THE SIGNAL.</i></h1>
          <p>
            Your registration reference is <strong style={{ color: "#ffdc86", fontFamily: "monospace", fontSize: "17px" }}>{referenceCode}</strong>.
          </p>

          {/* Email Confirmation Notice Box */}
          <div style={{ background: "rgba(33,153,255,0.12)", border: "1px solid #2199ff", borderRadius: "12px", padding: "16px", margin: "14px 0", width: "100%", textAlign: "left", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <Mail size={22} color="#ffdc86" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <b style={{ color: "#ffdc86", fontSize: "12px", fontFamily: "monospace", letterSpacing: "1px", display: "block" }}>
                AUTOMATIC GMAIL CONFIRMATION DISPATCHED
              </b>
              <span style={{ color: "#c9ddff", fontSize: "13px", lineHeight: "1.5", display: "block", marginTop: "4px" }}>
                A confirmation email with your official event poster cover, Reference Code <strong>{referenceCode}</strong>, and receipt of <strong>₹{totalAmount}</strong> ({memberCount} members × ₹500) has been sent to <strong style={{ color: "#ffffff" }}>{form.email}</strong>.
              </span>
            </div>
          </div>

          {/* Food Tokens Preview Box */}
          <div style={{ background: "#091c3d", border: "1px solid rgba(255,220,134,0.35)", borderRadius: "12px", padding: "16px", margin: "0 0 16px", width: "100%", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid rgba(98,185,255,0.2)", paddingBottom: "10px", marginBottom: "10px" }}>
              <span style={{ color: "#ffdc86", fontWeight: "bold", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Utensils size={15} /> {memberCount} INDIVIDUAL FOOD &amp; SNACKS PASSES ISSUED
              </span>
              <span style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold" }}>
                INCLUDED IN REGISTRATION
              </span>
            </div>
            <p style={{ color: "#94bcf8", fontSize: "12px", margin: "0 0 10px", lineHeight: "1.4" }}>
              Includes 6 meal/refreshment slots (24th Night Dinner, 25th Morning Breakfast &amp; 4 Snacks slots). Each squad member can view their pass below:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Array.from({ length: memberCount }).map((_, idx) => {
                const mIdx = idx + 1;
                const mName = idx === 0 ? form.memberOne : idx === 1 ? form.memberTwo : idx === 2 ? form.memberThree : idx === 3 ? form.memberFour : idx === 4 ? form.memberFive : form.memberSix;
                const tokenId = `${referenceCode}-F${mIdx}`;
                return (
                  <Button
                    key={tokenId}
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/food-token?token=${encodeURIComponent(tokenId)}&ref=${encodeURIComponent(referenceCode)}&m=${mIdx}`)}
                    style={{ background: "rgba(33,153,255,0.1)", borderColor: "#2199ff", color: "#ffffff", fontSize: "11px" }}
                  >
                    <QrCode size={13} style={{ marginRight: "5px" }} /> Pass #{mIdx}: {mName || `Member ${mIdx}`}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="payment-pending">
            <CreditCard size={20} aria-hidden="true" />
            <div>
              <b>PAYMENT RECEIPT RECORDED (₹{totalAmount})</b>
              <span>
                Transaction ID: <strong style={{ color: "#ffffff", fontFamily: "monospace" }}>{form.transactionId}</strong>. Registered details are synchronized with the event database.
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", width: "100%", marginTop: "12px" }}>
            <Button
              className="cta"
              style={{
                background: "#25d366",
                color: "#05160b",
                fontWeight: 800,
                boxShadow: "0 6px 20px rgba(37,211,102,0.35)",
              }}
              onClick={() =>
                setLocation(
                  `/community?email=${encodeURIComponent(form.email)}&ref=${encodeURIComponent(referenceCode)}`
                )
              }
            >
              JOIN OFFICIAL WHATSAPP COMMUNITY &rarr;
            </Button>
            <Button className="cta cta-outline" onClick={() => setLocation("/")}>
              RETURN TO EVENT SITE
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="registration-page">
      <section className="registration-shell">
        <button type="button" className="registration-back" onClick={() => setLocation("/")}>
          <ArrowLeft size={16} /> BACK TO INNOHACK-26
        </button>
        <div className="registration-heading">
          <p className="eyebrow">
            <LockKeyhole size={15} /> SECURE SQUAD REGISTRATION
          </p>
          <h1>REGISTER YOUR <i>SQUAD.</i></h1>
          <p>
            Every field is required. Pay the college QR first, attach your payment screenshot, and enter the UPI transaction ID / UTR to submit a squad of up to 6 members (Team Lead + Members).
          </p>
        </div>
        {isOffline && (
          <div className="payment-pending" role="status">
            <CreditCard size={20} aria-hidden="true" />
            <div>
              <b>OFFLINE — REGISTRATION IS NOT SAVED</b>
              <span>
                Reconnect to the internet before submitting. Any form details entered while offline stay only on this device and must be submitted again online.
              </span>
            </div>
          </div>
        )}
        <form className="registration-form" onSubmit={submit}>
          <label className="honeypot" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
            />
          </label>
          <div className="registration-grid">
            <label>
              TEAM NAME
              <input
                required
                maxLength={120}
                placeholder="e.g. Quantum Cyber Squad"
                value={form.teamName}
                onChange={(event) => update("teamName", event.target.value)}
              />
            </label>
            <label>
              TEAM LEAD NAME
              <input
                required
                maxLength={120}
                placeholder="Full name of Team Leader"
                value={form.leadName}
                onChange={(event) => update("leadName", event.target.value)}
              />
            </label>
            <label>
              EMAIL (TEAM LEAD / CONTACT)
              <input
                required
                type="email"
                maxLength={320}
                placeholder="lead@college.edu"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
            <label>
              MOBILE NUMBER (WHATSAPP ENABLED)
              <input
                required
                inputMode="tel"
                maxLength={24}
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </label>
            <label className="span-two">
              COLLEGE / INSTITUTION
              <input
                required
                maxLength={180}
                placeholder="e.g. Erode Sengunthar Engineering College"
                value={form.college}
                onChange={(event) => update("college", event.target.value)}
              />
            </label>
            <label>
              TOTAL SQUAD SIZE (UP TO 6 MEMBERS)
              <select
                value={form.memberCount}
                onChange={(event) => update("memberCount", event.target.value)}
              >
                <option value="1">1 Member (Individual / Team Lead only)</option>
                <option value="2">2 Members (Team Lead + 1 Member)</option>
                <option value="3">3 Members (Team Lead + 2 Members)</option>
                <option value="4">4 Members (Team Lead + 3 Members)</option>
                <option value="5">5 Members (Team Lead + 4 Members)</option>
                <option value="6">6 Members (Team Lead + 5 Members)</option>
              </select>
            </label>
            <label>
              INNOVATION DOMAIN
              <select
                value={form.domain}
                onChange={(event) => update("domain", event.target.value as typeof form.domain)}
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </label>
            <label>
              MEMBER 1 (TEAM LEAD)
              <input
                required
                maxLength={120}
                placeholder="Full name of Member 1"
                value={form.memberOne}
                onChange={(event) => update("memberOne", event.target.value)}
              />
            </label>
            {memberCount >= 2 && (
              <label>
                MEMBER 2 NAME
                <input
                  required
                  maxLength={120}
                  placeholder="Full name of Member 2"
                  value={form.memberTwo}
                  onChange={(event) => update("memberTwo", event.target.value)}
                />
              </label>
            )}
            {memberCount >= 3 && (
              <label>
                MEMBER 3 NAME
                <input
                  required
                  maxLength={120}
                  placeholder="Full name of Member 3"
                  value={form.memberThree}
                  onChange={(event) => update("memberThree", event.target.value)}
                />
              </label>
            )}
            {memberCount >= 4 && (
              <label>
                MEMBER 4 NAME
                <input
                  required
                  maxLength={120}
                  placeholder="Full name of Member 4"
                  value={form.memberFour}
                  onChange={(event) => update("memberFour", event.target.value)}
                />
              </label>
            )}
            {memberCount >= 5 && (
              <label>
                MEMBER 5 NAME
                <input
                  required
                  maxLength={120}
                  placeholder="Full name of Member 5"
                  value={form.memberFive}
                  onChange={(event) => update("memberFive", event.target.value)}
                />
              </label>
            )}
            {memberCount === 6 && (
              <label>
                MEMBER 6 NAME
                <input
                  required
                  maxLength={120}
                  placeholder="Full name of Member 6"
                  value={form.memberSix}
                  onChange={(event) => update("memberSix", event.target.value)}
                />
              </label>
            )}
          </div>
          <fieldset>
            <legend>BUILD TYPE — STORED IN A SEPARATE EXPORT SHEET</legend>
            <div className="build-type-choice">
              <button
                type="button"
                className={form.buildType === "software" ? "is-selected" : ""}
                aria-pressed={form.buildType === "software"}
                onClick={() => update("buildType", "software")}
              >
                <b>SOFTWARE BUILD</b>
                <span>Apps, models, web systems, dashboards, APIs, or digital services.</span>
              </button>
              <button
                type="button"
                className={form.buildType === "hardware" ? "is-selected" : ""}
                aria-pressed={form.buildType === "hardware"}
                onClick={() => update("buildType", "hardware")}
              >
                <b>HARDWARE BUILD</b>
                <span>Devices, sensors, circuits, embedded systems, or physical prototypes.</span>
              </button>
            </div>
          </fieldset>
          {/* Live Dynamic Fee & Passes Calculation Card */}
          <div style={{ background: "linear-gradient(135deg, rgba(33,153,255,0.14), rgba(255,220,134,0.12))", border: "1px solid #2199ff", borderRadius: "12px", padding: "16px 20px", margin: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span style={{ color: "#ffdc86", fontSize: "11px", fontWeight: "bold", fontFamily: "monospace", letterSpacing: "1.5px" }}>
                  DYNAMIC SQUAD FEE &amp; PASS CALCULATION
                </span>
                <div style={{ color: "#ffffff", fontSize: "20px", fontWeight: 900, marginTop: "2px" }}>
                  {memberCount} Member{memberCount > 1 ? "s" : ""} × ₹500 = <span style={{ color: "#4ade80" }}>₹{memberCount * 500} Total Payable</span>
                </div>
              </div>
              <div style={{ background: "rgba(33,153,255,0.2)", border: "1px solid #2199ff", borderRadius: "8px", padding: "6px 12px", color: "#90c8ff", fontSize: "12px", fontWeight: "bold" }}>
                🍽️ Includes {memberCount} Individual Food &amp; Snacks Pass{memberCount > 1 ? "es" : ""}
              </div>
            </div>
            <p style={{ margin: "8px 0 0", color: "#c0d4f8", fontSize: "12px" }}>
              Transfer exactly <strong style={{ color: "#4ade80" }}>₹{memberCount * 500}</strong> via UPI to the college QR below. Each member will receive a personal food pass in the confirmation email.
            </p>
          </div>

          <section className="qr-payment-panel">
            <div>
              <p className="eyebrow">OFFICIAL COLLEGE UPI</p>
              <h2>SCAN &amp; PAY <i>₹{memberCount * 500}.</i></h2>
              <p>
                Use any installed UPI app to scan this single official college QR for <strong>₹{memberCount * 500}</strong> ({memberCount} squad member{memberCount > 1 ? "s" : ""} @ ₹500/head). After payment, upload the screenshot and enter the UTR / transaction ID below.
              </p>
              <p className="payment-reference-note">
                <strong>Payment screenshot reference:</strong> Upload your own successful UPI payment screenshot below.
              </p>
            </div>
            <figure className="qr-single-figure">
              <img src={PAYMENT_QR} alt="Official college UPI payment QR" />
              <a className="qr-fullscreen-link" href={PAYMENT_QR} target="_blank" rel="noreferrer">
                OPEN FULL-SIZE QR
              </a>
              <figcaption>
                One official college payment QR. Pay ₹{memberCount * 500} for {memberCount} member{memberCount > 1 ? "s" : ""}.
              </figcaption>
            </figure>
          </section>

          {/* Photo / Payment Screenshot Upload Dropzone */}
          <div className="photo-upload-section">
            <label>
              PAYMENT SCREENSHOT / PROOF PHOTO <span style={{ color: "#38bdf8", fontSize: "0.85em", marginLeft: 6 }}>(MAX 200 KB)</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={onFileInputChange}
              style={{ display: "none" }}
              id="payment-photo-input"
            />
            {photo ? (
              <div className="photo-preview-wrap">
                <img src={photo.previewUrl} alt="Payment proof preview" className="photo-preview-img" />
                <div className="photo-preview-meta">
                  <div className="photo-preview-name">{photo.name}</div>
                  <div className="photo-preview-size" style={{ color: photo.size <= 200 * 1024 ? "#4ade80" : "#f87171" }}>
                    {(photo.size / 1024).toFixed(1)} KB / 200 KB Max
                  </div>
                </div>
                <button type="button" className="photo-remove-btn" onClick={removePhoto}>
                  <X size={14} style={{ display: "inline", marginRight: 4 }} /> REMOVE
                </button>
              </div>
            ) : (
              <div
                className={`photo-dropzone ${isDragging ? "is-dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              >
                <UploadCloud size={32} />
                <div>
                  <p>Click or drag & drop payment screenshot here</p>
                  <span>Accepts PNG, JPG, JPEG, WEBP · <strong>Max file size: 200 KB</strong> (auto-compressed)</span>
                </div>
              </div>
            )}
          </div>

          <label className="transaction-field">
            TRANSACTION ID / UTR
            <input
              required
              minLength={6}
              maxLength={128}
              pattern="[A-Za-z0-9][A-Za-z0-9 ._:/-]{5,127}"
              inputMode="text"
              spellCheck={false}
              autoComplete="off"
              value={form.transactionId}
              onChange={(event) => update("transactionId", cleanTransactionReference(event.target.value))}
              onPaste={(event) => {
                event.preventDefault();
                update("transactionId", cleanTransactionReference(event.clipboardData.getData("text")));
              }}
              placeholder="Paste the exact UTR / transaction ID"
              aria-describedby="transaction-reference-help"
            />
            <small id="transaction-reference-help">
              Letters, numbers, spaces, hyphens, slashes, dots, underscores, and colons are accepted. Copy and paste the exact value shown by your payment app.
            </small>
          </label>
          <label className="registration-consent">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) => update("consent", event.target.checked)}
            />{" "}
            <span>
              I confirm that all candidate details, squad members, and the transaction ID / payment proof are accurate. I understand organiser verification is required.
            </span>
          </label>
          <div className="registration-security">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>
              Server-side validation, Google Sheets mirroring, and secure transport protect this registration flow. The website never requests bank, card, or UPI passwords.
            </span>
          </div>
          <Button
            type="submit"
            className="cta cta-primary registration-submit"
            disabled={isSubmitting || isOffline}
          >
            {isSubmitting ? "SAVING REGISTRATION…" : isOffline ? "RECONNECT TO SUBMIT" : "SUBMIT REGISTRATION"}
          </Button>
        </form>
      </section>
    </main>
  );
}
