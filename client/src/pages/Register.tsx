import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
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

export default function Register() {
  const [, setLocation] = useLocation();
  const [startedAt] = useState(() => Date.now());
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const requiredMembers = useMemo<Array<"memberOne" | "memberTwo" | "memberThree" | "memberFour">>(() => {
    const members: Array<"memberOne" | "memberTwo" | "memberThree" | "memberFour"> = ["memberOne", "memberTwo"];
    if (memberCount >= 3) members.push("memberThree");
    if (memberCount === 4) members.push("memberFour");
    return members;
  }, [memberCount]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.consent) return toast.error("Please confirm the registration and payment details.");
    if (requiredMembers.some((member) => !form[member].trim())) {
      return toast.error("Enter every squad member name for the selected squad size.");
    }

    const payload = {
      teamName: form.teamName,
      leadName: form.leadName,
      email: form.email,
      phone: form.phone,
      college: form.college,
      memberOne: form.memberOne,
      memberTwo: form.memberTwo,
      memberThree: form.memberThree || undefined,
      memberFour: form.memberFour || undefined,
      memberCount,
      domain: form.domain,
      buildType: form.buildType,
      transactionId: form.transactionId,
      website: form.website,
      formStartedAt: startedAt,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      let body: { referenceCode?: string; error?: string } | null = null;
      try {
        body = JSON.parse(responseText) as { referenceCode?: string; error?: string };
      } catch {
        throw new Error("The registration service did not return JSON. Please verify your connection and try again.");
      }
      if (!response.ok || !body.referenceCode) {
        throw new Error(body.error || "Registration could not be saved. Please try again.");
      }
      setReferenceCode(body.referenceCode);
      toast.success("Registration and payment reference saved. Keep your registration reference.");
    } catch (error) {
      toast.error(
        !navigator.onLine
          ? "You are offline. This registration was not saved; reconnect and submit it again."
          : error instanceof Error
          ? error.message
          : "Registration could not be saved. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (referenceCode) {
    return (
      <main className="registration-page">
        <section className="registration-shell registration-success">
          <CheckCircle2 size={42} aria-hidden="true" />
          <p className="eyebrow">REGISTRATION SUBMITTED</p>
          <h1>YOUR SQUAD IS ON <i>THE SIGNAL.</i></h1>
          <p>
            Your registration reference is <strong>{referenceCode}</strong>. Keep it for organiser review.
          </p>
          <div className="payment-pending">
            <CreditCard size={20} aria-hidden="true" />
            <div>
              <b>PAYMENT REFERENCE PENDING REVIEW</b>
              <span>
                Your transaction ID / UTR was recorded. An organiser must verify it before the registration can be marked paid.
              </span>
            </div>
          </div>
          <Button className="cta cta-primary" onClick={() => setLocation("/")}>
            RETURN TO EVENT SITE
          </Button>
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
            Every field is required. Pay the college QR first, then enter the UPI transaction ID / UTR to submit a squad of two to four candidates. No website-level total registration cap is currently set; registrations remain subject to organiser verification.
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
                value={form.teamName}
                onChange={(event) => update("teamName", event.target.value)}
              />
            </label>
            <label>
              TEAM LEAD NAME
              <input
                required
                maxLength={120}
                value={form.leadName}
                onChange={(event) => update("leadName", event.target.value)}
              />
            </label>
            <label>
              EMAIL
              <input
                required
                type="email"
                maxLength={320}
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
            <label>
              MOBILE NUMBER
              <input
                required
                inputMode="tel"
                maxLength={24}
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </label>
            <label className="span-two">
              COLLEGE / INSTITUTION
              <input
                required
                maxLength={180}
                value={form.college}
                onChange={(event) => update("college", event.target.value)}
              />
            </label>
            <label>
              TEAM MEMBERS
              <select
                value={form.memberCount}
                onChange={(event) => update("memberCount", event.target.value)}
              >
                {[2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count} members
                  </option>
                ))}
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
              MEMBER 1 NAME
              <input
                required
                maxLength={120}
                value={form.memberOne}
                onChange={(event) => update("memberOne", event.target.value)}
              />
            </label>
            <label>
              MEMBER 2 NAME
              <input
                required
                maxLength={120}
                value={form.memberTwo}
                onChange={(event) => update("memberTwo", event.target.value)}
              />
            </label>
            {memberCount >= 3 && (
              <label>
                MEMBER 3 NAME
                <input
                  required
                  maxLength={120}
                  value={form.memberThree}
                  onChange={(event) => update("memberThree", event.target.value)}
                />
              </label>
            )}
            {memberCount === 4 && (
              <label>
                MEMBER 4 NAME
                <input
                  required
                  maxLength={120}
                  value={form.memberFour}
                  onChange={(event) => update("memberFour", event.target.value)}
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
          <section className="qr-payment-panel">
            <div>
              <p className="eyebrow">OFFICIAL COLLEGE UPI</p>
              <h2>SCAN ONCE, THEN ENTER YOUR <i>UTR.</i></h2>
              <p>
                Use any installed UPI app to scan this single official college QR. After payment, enter the UTR / transaction ID shown on your own completed-payment screen. The submitted payment reference remains pending organiser review.
              </p>
              <p className="payment-reference-note">
                <strong>Payment screenshot reference:</strong> use your own successful payment screen as the reference. Do not copy a sample transaction ID from another image or payment.
              </p>
            </div>
            <figure className="qr-single-figure">
              <img src={PAYMENT_QR} alt="Updated official college UPI payment QR" />
              <a className="qr-fullscreen-link" href={PAYMENT_QR} target="_blank" rel="noreferrer">
                OPEN FULL-SIZE QR
              </a>
              <figcaption>
                One official college payment QR. If your UPI app reports an invalid recipient or QR, do not transfer and contact the college payment desk.
              </figcaption>
            </figure>
          </section>
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
              I confirm that all candidate details and the transaction ID / UTR are accurate. I understand organiser verification is required before payment is marked verified.
            </span>
          </label>
          <div className="registration-security">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>
              Server-side validation, abuse controls, and secure transport protect this registration flow. The website never requests bank, card, or UPI passwords.
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
