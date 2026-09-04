/**
 * Galactic Command Deck: blue-and-gold event identity guides the cosmic interface, while spatial scroll scenes and source-aligned transit data preserve the command-deck experience.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ParticipantHelpWidget } from "@/components/ParticipantHelpWidget";
import TransportDirectory from "@/components/TransportDirectory";
import { eventAssets } from "@/lib/eventAssets";
import {
  Award, ArrowDown, ArrowUpRight, Bot, BrainCircuit, BusFront, CalendarDays, CarFront, ChevronRight, CircleDot,
  Clock3, Cpu, Download, ExternalLink, Factory, Gauge, HeartPulse, Instagram, Laptop, Lightbulb, Mail, MapPin, Menu,
  PhoneCall, Radio, Recycle, Route, Satellite, ShieldAlert, Sparkles, Sprout, Trophy, UsersRound, X, Linkedin,
} from "lucide-react";

const HERO_BG = eventAssets.backgrounds.milkyWay;
const BROCHURE_IMAGE = eventAssets.event.brochure;
const PANEL_BG = eventAssets.backgrounds.nebulaPanel;
const SIGNAL_MARK = eventAssets.brand.logo;
const HEADER_LOGO = eventAssets.brand.logo;
const INITIALIZATION_EMBLEM = HEADER_LOGO;
const TRANSPARENT_EMBLEM = eventAssets.brand.logo;
const PARTICIPANT_GUIDELINES_PDF = eventAssets.event.participantGuidelines;
const targetDate = new Date("2026-09-24T09:00:00+05:30").getTime();

const domains = [
  { number: "01", title: "AgriTech & GreenTech", tag: "GROW THE FUTURE", copy: "Build resilient green systems.", icon: Sprout },
  { number: "02", title: "Robotics & Drones", tag: "SYSTEMS IN MOTION", copy: "Design autonomous machines.", icon: Satellite },
  { number: "03", title: "Healthcare", tag: "HUMAN-CENTRED", copy: "Create accessible health solutions.", icon: HeartPulse },
  { number: "04", title: "Clean Technology", tag: "CLEANER BY DESIGN", copy: "Explore circular energy systems.", icon: Recycle },
  { number: "05", title: "Smart Manufacturing", tag: "MAKE BETTER", copy: "Reimagine industrial operations.", icon: Factory },
  { number: "06", title: "AI & Electronics", tag: "SENSE THE SIGNAL", copy: "Turn data into decisions.", icon: BrainCircuit },
  { number: "07", title: "Smart Cities", tag: "MOVE THE CITY", copy: "Build connected urban experiences.", icon: CarFront },
  { number: "08", title: "Open Innovation", tag: "NO BOX REQUIRED", copy: "Solve a problem worth solving.", icon: Lightbulb },
];

const buildTypeChoices = [
  { id: "software", title: "SOFTWARE BUILD", definition: "Digital apps, AI, and software solutions.", icon: Laptop },
  { id: "hardware", title: "HARDWARE BUILD", definition: "Physical prototypes and hardware devices.", icon: Cpu },
] as const;
type BuildTypeChoice = (typeof buildTypeChoices)[number]["id"];

const timeline = [
  { index: "01", phase: "Registration", date: "Open now", detail: "Form your squad and register." },
  { index: "02", phase: "Preparation", date: "Before arrival", detail: "Review guidelines and prepare." },
  { index: "03", phase: "Hackathon Starts", date: "24 Sep · 09:00", detail: "24-hour sprint begins." },
  { index: "04", phase: "Final Demo", date: "25 Sep", detail: "Present your prototype." },
];

const faqs = [
  { question: "What is InnoHack-26?", answer: "A 24-hour hackathon at Erode Sengunthar Engineering College." },
  { question: "When and where is the event?", answer: "24-25 September 2026 at ESEC Campus, Perundurai." },
  { question: "What can we build?", answer: "Software or hardware projects within the 8 innovation domains." },
  { question: "What is the fee and prize?", answer: "₹500 per head. Compete for a ₹50,000 overall prize pool." },
  { question: "Is transport available?", answer: "Yes, 41 bus routes and a campus shuttle are provided." },
  { question: "What to bring?", answer: "Student ID, laptop, chargers, and your build components." },
];

const eieCommandHierarchy = {
  department: "ELECTRONICS & INSTRUMENTATION",
  hod: "Mr. M. Karthick Kumar",
  faculty: { name: "Vinodhini C.", credential: "A/P EIE", phone: "6382249016", image: eventAssets.contacts.vinodhini },
  studentDeskPhone: "7708914279",
  students: [
    { name: "Sathiyamoorthi C.", role: "TECH LEAD", year: "3RD YEAR · EIE", image: eventAssets.team.sathiyamoorthi },
    { name: "Abhi Ruban", role: "EVENT LEAD", year: "3RD YEAR · EIE", image: eventAssets.team.abhiRuban },
  ],
} as const;

const leadershipDepartments = [
  {
    department: "MECHANICAL ENGINEERING",
    hod: { name: "HEAD OF DEPARTMENT", detail: "MECHANICAL ENGINEERING", image: eventAssets.leadership.mechHod },
    faculty: { name: "FACULTY COORDINATOR", detail: "MECHANICAL ENGINEERING" },
    student: {
      name: "MECHANICAL STUDENT COORDINATORS",
      detail: "SAMUEL A · NAVEEN V · 3RD YEAR",
      phone: "9342683393",
      profiles: [
        {
          name: "Samuel A",
          role: "STUDENT COORDINATOR",
          year: "3RD YEAR · MECH",
          phone: "9342683393",
          image: eventAssets.leadership.samuelA,
          instagram: "https://www.instagram.com/marvellous_vision07?igsh=MTJyM2o4cjcxaGF3bg==&igsi=MTJyM2o4cjcxaGF3bg==",
          email: "samandrew8464@gmail.com",
          linkedin: "https://www.linkedin.com/public-profile/settings/",
        },
        {
          name: "Naveen V",
          role: "STUDENT COORDINATOR",
          year: "3RD YEAR · MECH",
          image: eventAssets.leadership.naveenV,
          instagram: "https://www.instagram.com/invites/contact/?utm_source=ig_contact_invite&utm_medium=copy_link&utm_content=rvdorlv",
          email: "naveenvenu2007@gmail.com",
          linkedin: "https://www.linkedin.com/public-profile/settings/",
        },
      ],
    },
  },
  {
    department: "ROBOTICS & AUTOMATION",
    hod: { name: "HEAD OF DEPARTMENT", detail: "ROBOTICS & AUTOMATION", image: eventAssets.leadership.roboticsHod },
    faculty: { name: "FACULTY COORDINATOR", detail: "ROBOTICS & AUTOMATION", image: eventAssets.leadership.roboticsFacultyCoordinator },
    student: {
      name: "ROBOTICS STUDENT COORDINATORS",
      detail: "JAYAMANIKANDAN P · HARISH GOPAL · 3RD YEAR",
      phone: "9943371076",
      profiles: [
        {
          name: "Jayamanikandan P",
          role: "STUDENT COORDINATOR",
          year: "3RD YEAR · ROBOTICS",
          phone: "9943371076",
          image: eventAssets.team.roboticsLead,
          instagram: "https://www.instagram.com/jayamani_k_i_n_g?igsi=Y3lsMno3ZXkzamNk",
          email: "jayamanijayamani43@gmail.com",
          linkedin: "https://www.linkedin.com/in/jayamanikandan-p-4b6627427?utm_source=share_via&utm_content=profile&utm_medium=member_android",
        },
        {
          name: "Harish Gopal",
          role: "STUDENT COORDINATOR",
          year: "3RD YEAR · ROBOTICS",
          phone: "8300191535",
          image: eventAssets.team.harishGopal,
          instagram: "https://www.instagram.com/call_me_abd_360?igsi=eGVmZnV2dWV1MmQy",
          email: "abdharishgopal@gmail.com",
          linkedin: "https://www.linkedin.com/in/harish-harish-513b4b329?utm_source=share_via&utm_content=profile&utm_medium=member_android",
        },
      ],
    },
  },
  {
    department: eieCommandHierarchy.department,
    hod: { name: eieCommandHierarchy.hod, detail: "HEAD OF DEPARTMENT" },
    faculty: { name: eieCommandHierarchy.faculty.name, detail: eieCommandHierarchy.faculty.credential, image: eieCommandHierarchy.faculty.image, phone: eieCommandHierarchy.faculty.phone },
    student: {
      name: "EIE STUDENT COORDINATORS",
      detail: "SATHIYAMOORTHI C. · ABHI RUBAN · 3RD YEAR",
      phone: eieCommandHierarchy.studentDeskPhone,
      profiles: eieCommandHierarchy.students,
    },
  },
] as const;

const featuredRoutes = [
  { number: "01", bus: "BUS 01", time: "06:40 AM", origin: "Kundadam", via: "Kovil Vazhi · Koduvai · Kangeyam · Perundurai", phone: "9841788501" },
  { number: "05", bus: "BUS 05", time: "07:15 AM", origin: "Tiruchengode", via: "SPB Colony · Pallipalayam · Karungalpalayam · ESEC", phone: "6381886719" },
  { number: "12", bus: "BUS 12", time: "07:25 AM", origin: "Tirupur", via: "Vavipalayam · Uthukuli RS · Perundurai Four Road", phone: "9842425522" },
  { number: "16", bus: "BUS 16", time: "07:45 AM", origin: "Gobichettipalayam", via: "Gobi New Stand · Kunjaramadi · Thingalur · Perundurai RS", phone: "9976865500" },
  { number: "20", bus: "BUS 20", time: "07:40 AM", origin: "Erode Central", via: "Erode Bus Stand · Surampatty · Collectorate · Thindal · Perundurai", phone: "9788797636" },
];

const specialAwards = [
  { title: "Best AI Innovation", tag: "AI FRONTIER", icon: BrainCircuit, image: eventAssets.prizeImages.ai },
  { title: "Best Social Impact Solution", tag: "HUMAN IMPACT", icon: HeartPulse, image: eventAssets.prizeImages.impact },
  { title: "Best Sustainability Innovation", tag: "GREEN SIGNAL", icon: Recycle, image: eventAssets.prizeImages.sustainability },
  { title: "Best Women-Led Team", tag: "LEADERSHIP SIGNAL", icon: UsersRound, image: eventAssets.prizeImages.leadership },
  { title: "Best Industry Solution", tag: "INDUSTRY READY", icon: Factory, image: eventAssets.prizeImages.industry },
];
const sponsorSlots = [
  { tier: "TITLE PARTNER", slots: "01", tone: "lime" }, { tier: "TRACK PARTNERS", slots: "04", tone: "pink" },
  { tier: "COMMUNITY PARTNERS", slots: "06", tone: "violet" },
];
const countdownLabels = ["DAYS", "HOURS", "MINUTES", "SECONDS"];

function getRemainingTime() {
  const total = Math.max(0, targetDate - Date.now());
  return [Math.floor(total / 86_400_000), Math.floor((total / 3_600_000) % 24), Math.floor((total / 60_000) % 60), Math.floor((total / 1_000) % 60)];
}

function downloadGuidelines() {
  window.open(PARTICIPANT_GUIDELINES_PDF, "_blank", "noopener,noreferrer");
  toast.success("InnoHack-26 participant guidelines opened in a new tab.");
}

function ProfileLinkPlaceholders({
  label,
  size = 12,
  instagram,
  email,
  linkedin,
}: {
  label: string;
  size?: number;
  instagram?: string;
  email?: string;
  linkedin?: string;
}) {
  return (
    <div className="profile-icon-actions leadership-profile-links" aria-label={`${label} profile links`}>
      {instagram ? (
        <a
          href={instagram}
          target="_blank"
          rel="noreferrer"
          aria-label={`${label} Instagram profile`}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          <Instagram size={size} />
        </a>
      ) : (
        <button
          type="button"
          aria-label={`${label} Instagram profile awaiting organiser details`}
          onClick={() => toast.info(`${label} Instagram profile is awaiting organiser details.`)}
        >
          <Instagram size={size} />
        </button>
      )}
      {email ? (
        <a
          href={`mailto:${email}`}
          aria-label={`Email ${label}`}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          <Mail size={size} />
        </a>
      ) : (
        <button
          type="button"
          aria-label={`${label} email profile awaiting organiser details`}
          onClick={() => toast.info(`${label} email profile is awaiting organiser details.`)}
        >
          <Mail size={size} />
        </button>
      )}
      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${label} LinkedIn profile`}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          <Linkedin size={size} />
        </a>
      ) : (
        <button
          type="button"
          aria-label={`${label} LinkedIn profile awaiting organiser details`}
          onClick={() => toast.info(`${label} LinkedIn profile is awaiting organiser details.`)}
        >
          <Linkedin size={size} />
        </button>
      )}
    </div>
  );
}

function LeadershipDepartmentCard({ department }: { department: (typeof leadershipDepartments)[number] }) {
  const isConfirmed = true;
  const hodHasImage = "image" in department.hod && Boolean(department.hod.image);
  const facultyHasPhone = "phone" in department.faculty;
  const facultyHasImage = "image" in department.faculty && Boolean(department.faculty.image);
  const studentHasPhone = "phone" in department.student;
  const studentProfiles: readonly any[] = "profiles" in department.student && Array.isArray(department.student.profiles) ? department.student.profiles : [];

  return (
    <article className={`leadership-department ${isConfirmed ? "is-confirmed-department" : ""}`}>
      <header className="leadership-department-header">
        <span className="leadership-department-title">{department.department}</span>
        <small className="leadership-department-tier">HOD → FACULTY → STUDENTS</small>
      </header>

      <div className="leadership-role-stack">
        {/* Tier 01: HOD */}
        <section className="leadership-role-card leadership-hod-card">
          <div className="leadership-card-top">
            <span className="role-tag">01 · HEAD OF DEPARTMENT</span>
          </div>
          <div className="leadership-role-body">
            <div className="leadership-role-copy">
              <h3>{department.hod.name}</h3>
              <p>{department.hod.detail}</p>
              <ProfileLinkPlaceholders label={`${department.department} HOD`} />
            </div>
            <div className="leadership-avatar-frame">
              {hodHasImage ? (
                <img src={department.hod.image} alt={`Portrait of ${department.hod.name}, HOD`} />
              ) : (
                <div className="leadership-role-placeholder"><UsersRound size={20} /></div>
              )}
            </div>
          </div>
        </section>

        <i className="leadership-connector-line" aria-hidden="true" />

        {/* Tier 02: Faculty Coordinator */}
        <section className="leadership-role-card leadership-faculty-card">
          <div className="leadership-card-top">
            <span className="role-tag">02 · FACULTY COORDINATOR</span>
          </div>
          <div className="leadership-role-body">
            <div className="leadership-role-copy">
              <h3>{department.faculty.name}</h3>
              <p>{department.faculty.detail}</p>
              <div className="leadership-role-actions">
                {facultyHasPhone ? (
                  <a href={`tel:+91${department.faculty.phone}`} className="leadership-call-link">
                    <PhoneCall size={11} /> CALL +91 {department.faculty.phone}
                  </a>
                ) : (
                  <button type="button" className="leadership-desk-btn" onClick={() => toast.info(`${department.department} faculty coordinator desk.`)}>
                    COORDINATOR DESK
                  </button>
                )}
              </div>
              <ProfileLinkPlaceholders label={`${department.department} Faculty Coordinator`} />
            </div>
            <div className="leadership-avatar-frame">
              {facultyHasImage ? (
                <img src={department.faculty.image} alt={`Portrait of ${department.faculty.name}, Faculty Coordinator`} />
              ) : (
                <div className="leadership-role-placeholder"><UsersRound size={20} /></div>
              )}
            </div>
          </div>
        </section>

        <i className="leadership-connector-line" aria-hidden="true" />

        {/* Tier 03: Student Coordinators */}
        <section className="leadership-role-card leadership-student-section">
          <div className="leadership-card-top">
            <span className="role-tag">03 · STUDENT COORDINATOR{studentProfiles.length > 1 ? "S" : ""}</span>
            {studentHasPhone && (
              <a href={`tel:+91${department.student.phone}`} className="leadership-desk-call-tag">
                <PhoneCall size={10} /> DESK: +91 {department.student.phone}
              </a>
            )}
          </div>

          {studentProfiles.length > 0 ? (
            <div className={`leadership-students-container ${studentProfiles.length === 1 ? "is-single-student-layout" : "is-dual-student-layout"}`}>
              {studentProfiles.map((student, sIdx) => {
                const hasStudentPhone = "phone" in student && Boolean(student.phone);
                const yearTag = "year" in student ? student.year : "3RD YEAR";
                return (
                  <article className="leadership-student-tile" key={`${student.name}-${sIdx}`}>
                    <div className="leadership-student-avatar">
                      <img src={student.image} alt={`Portrait of ${student.name}`} />
                      <span className="leadership-student-year-badge">{yearTag}</span>
                    </div>
                    <div className="leadership-student-info">
                      <h4>{student.name}</h4>
                      <p>{student.role}</p>
                      {hasStudentPhone && (
                        <a href={`tel:+91${student.phone}`} className="student-call-btn">
                          <PhoneCall size={10} /> +91 {student.phone}
                        </a>
                      )}
                      <ProfileLinkPlaceholders
                        label={student.name}
                        size={11}
                        instagram={"instagram" in student ? (student.instagram as string) : undefined}
                        email={"email" in student ? (student.email as string) : undefined}
                        linkedin={"linkedin" in student ? (student.linkedin as string) : undefined}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="leadership-role-body">
              <div className="leadership-role-copy">
                <h3>{department.student.name}</h3>
                <p>{department.student.detail}</p>
                <ProfileLinkPlaceholders label={`${department.department} Student Coordinator`} />
              </div>
              <div className="leadership-avatar-frame">
                <div className="leadership-role-placeholder"><UsersRound size={20} /></div>
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [remaining, setRemaining] = useState(getRemainingTime);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScene, setActiveScene] = useState("landing");
  const [routeDirectoryOpen, setRouteDirectoryOpen] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [domainBuildChoices, setDomainBuildChoices] = useState<Record<string, BuildTypeChoice>>({});
  const countdown = useMemo(() => remaining.map((value) => String(value).padStart(2, "0")), [remaining]);

  useEffect(() => {
    const interval = window.setInterval(() => setRemaining(getRemainingTime()), 1000);
    const loader = window.setTimeout(() => setLoading(false), 3600);
    return () => { window.clearInterval(interval); window.clearTimeout(loader); };
  }, []);

  useEffect(() => {
    const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    const observer = new IntersectionObserver((entries) => {
      const dominant = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (dominant?.target instanceof HTMLElement) setActiveScene(dominant.target.dataset.scene ?? "landing");
    }, { threshold: [0.2, 0.45, 0.7], rootMargin: "-14% 0px -38%" });
    scenes.forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!routeDirectoryOpen) return;
    window.requestAnimationFrame(() => document.getElementById("route-directory")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [routeDirectoryOpen]);

  const sendRegistrationMessage = () => setLocation("/register");
  const communityUrl = "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t";
  const askForCommunity = () => window.open(communityUrl, "_blank", "noopener,noreferrer");
  const closeMenu = () => setMenuOpen(false);
  const toggleRouteDirectory = () => setRouteDirectoryOpen((open) => !open);
  const selectDomainBuildChoice = (domainNumber: string, domainTitle: string, choice: BuildTypeChoice) => {
    setDomainBuildChoices((current) => ({ ...current, [domainNumber]: choice }));
    toast.success(`${domainTitle}: ${choice === "software" ? "Software Build" : "Hardware Build"} selected.`);
  };
  const announcePlaceholder = (label: string) => toast.info(`${label} is ready for the organising team to populate.`);

  return (
    <div className={`app-shell scene-${activeScene}`}>
      <div className="galaxy-canvas" style={{ backgroundImage: `url(${HERO_BG})` }} aria-hidden="true" />
      <div className="galaxy-zoom-loop" style={{ backgroundImage: `url(${HERO_BG})` }} aria-hidden="true" />
      <div className="galaxy-veil" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />
      <div className="orbit orbit-a" aria-hidden="true" />
      <div className="orbit orbit-b" aria-hidden="true" />


      {loading && <div className="loader-screen" role="status" aria-live="polite"><div className="loader-halo" /><div className="loader-emblem-stage" aria-hidden="true"><span className="loader-emblem-orbit" /><i /><i /><img src={INITIALIZATION_EMBLEM} alt="" /></div><p>INITIALISING COSMIC BUILD SPACE</p><div className="loader-progress"><span /></div></div>}

      <header className="site-header">
        <a href="#top" className="wordmark wordmark-official" aria-label="Go to InnoHack-26 home"><img src={HEADER_LOGO} alt="InnoHack-26 official logo" /><span className="wordmark-label">INNO<span>HACK</span><em>26</em></span></a>
        <nav className={`desktop-nav ${menuOpen ? "open" : ""}`} aria-label="Main navigation">
          {[["ABOUT", "#about"], ["DOMAINS", "#domains"], ["PRIZES", "#prizes"], ["TRANSPORT", "#transport"], ["COMMUNITY", "/community"], ["PARTNERS", "#sponsors"], ["TEAM", "#team"], ["FAQ", "#faq"]].map(([label, href]) => (href.startsWith("/") ? <Link key={label} href={href} onClick={closeMenu}>{label}</Link> : <a key={label} href={href} onClick={closeMenu}>{label}</a>))}
        </nav>
        <div className="header-controls"><div className="innovation-badge"><Sparkles size={13} /><span>REM 2026<br /><b>INNOVATION</b></span></div><button className="menu-button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
      </header>

      <main id="top" className="page-content">
        <section className="hero-section section-shell" data-scene="landing" aria-labelledby="hero-title">
          <div className="hero-rail"><span>01</span><i /><span>LANDING</span></div>
          <div className="hero-cosmic-interface" aria-hidden="true"><div className="core-orb orb-lime" /><div className="core-orb orb-cyan" /><div className="core-orb orb-pink" /><div className="core-ring core-ring-a" /><div className="core-ring core-ring-b" /><img src={SIGNAL_MARK} alt="" /><span>INNOHACK26</span></div>
          <div className="hero-copy"><div className="eyebrow"><Radio size={15} /> 2026 EVENT</div><p className="institution">ERODE SENGUNTHAR ENGINEERING COLLEGE</p><div className="presents"><span /> PRESENTS <span /></div><h1 id="hero-title">INNO<span>HACK</span><em>-26</em></h1><p className="hero-statement">A 24-hour hackathon to build tangible prototypes.</p><div className="department-row" aria-label="Departments presenting InnoHack-26"><span>MECH</span><span>ROBOTICS</span><span>EIE</span></div><div className="registration-signal"><span>ENTRY</span><strong>₹500 <small>/ HEAD</small></strong><b>₹50K PRIZE POOL</b></div><div className="hero-actions"><Button className="cta cta-primary" onClick={sendRegistrationMessage}>REGISTER NOW <ArrowUpRight size={17} /></Button><Button variant="outline" className="cta cta-outline" onClick={askForCommunity}>JOIN WHATSAPP <ExternalLink size={15} /></Button></div></div>
          <div className="hero-visual brochure-hero" aria-label="Official InnoHack-26 event brochure"><div className="brochure-meta"><span>OFFICIAL EVENT COLLATERAL</span><b>INNOHACK26.EXE</b></div><img src={BROCHURE_IMAGE} alt="InnoHack-26 official event brochure" /><div className="brochure-caption"><i /><span>24-HOUR HACKATHON CHALLENGE</span><i /></div><div className="brochure-entry-lockup"><img src={TRANSPARENT_EMBLEM} alt="" aria-hidden="true" /><span>REGISTRATION FEE</span><b>₹500 <small>PER PARTICIPANT</small></b><em>YOUR SQUAD. YOUR SHOT AT ₹50K.</em></div></div>
          <div className="event-specs" aria-label="Event summary"><div><CalendarDays /><span><small>DATE</small><b>24 &amp; 25 SEP 2026</b></span></div><div><Clock3 /><span><small>FORMAT</small><b>24 HOURS · ONE BUILD</b></span></div><div><CircleDot /><span><small>MISSION ENTRY</small><b>₹500 / PARTICIPANT</b></span></div><div><MapPin /><span><small>VENUE</small><b>PERUNDURAI – 57</b></span></div></div>
          <a href="#about" className="scroll-cue"><span>ENTER BUILD SPACE</span><ArrowDown size={16} /></a>
        </section>

        <section className="countdown-wrap section-shell scroll-scene" data-scene="countdown" aria-label="Event countdown"><div className="countdown-title"><span>REGISTRATION WINDOW</span><h2>YOUR SQUAD’S<br /><i>NEXT LAUNCH</i></h2></div><div className="countdown-grid">{countdown.map((value, index) => <div className="time-unit" key={countdownLabels[index]}><strong>{value}</strong><span>{countdownLabels[index]}</span></div>)}</div><div className="countdown-note"><CircleDot size={15} /> 24 SEP 2026 · 09:00 IST · EVENT START</div></section>

        <section id="about" className="about-section section-shell content-section scroll-scene" data-scene="about"><div className="section-rail"><span>02</span><i /><span>ABOUT</span></div><div className="section-intro"><div className="eyebrow"><Satellite size={15} /> ABOUT EVENT</div><h2>BUILD WHAT<br />THE FUTURE<br /><i>CAN FEEL.</i></h2></div><div className="about-copy glass-panel"><p className="lead">A 24-hour challenge to make something real.</p><p>Presented by MECH, Robotics, and EIE departments.</p><div className="about-points"><span><Bot /> Build</span><span><Gauge /> Test</span><span><Sparkles /> Iterate</span></div></div><div className="about-satellite" style={{ backgroundImage: `linear-gradient(140deg, rgba(4,8,30,.18), rgba(7,8,23,.65)), url(${PANEL_BG})` }}><span>24H</span><p>NO PAUSE.<br />JUST PROGRESS.</p></div></section>

        <section id="domains" className="domains-section section-shell content-section scroll-scene" data-scene="domains"><div className="section-rail"><span>03</span><i /><span>DOMAINS</span></div><div className="section-heading"><div className="eyebrow"><CircleDot size={15} /> CHOOSE A BUILD ORBIT</div><h2>EIGHT INNOVATION<br /><i>DOMAINS.</i></h2></div><div className="domain-stack">{domains.map((domain) => { const Icon = domain.icon; const isExpanded = expandedDomain === domain.number; const selectedChoice = domainBuildChoices[domain.number]; return <article className={`domain-card ${isExpanded ? "is-domain-expanded" : ""}`} key={domain.number}><button type="button" className="domain-card-toggle" aria-expanded={isExpanded} aria-controls={`domain-build-choice-${domain.number}`} onClick={() => setExpandedDomain((current) => current === domain.number ? null : domain.number)}><div className="domain-number">{domain.number}</div><div className="domain-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></div><div className="domain-main"><p>{domain.tag}</p><h3>{domain.title}</h3><span>{domain.copy}</span></div><ChevronRight className="domain-arrow" /></button>{isExpanded && <div className="domain-build-options" id={`domain-build-choice-${domain.number}`} aria-label={`Choose a build type for ${domain.title}`}>{buildTypeChoices.map((choice) => { const ChoiceIcon = choice.icon; const isSelected = selectedChoice === choice.id; return <button type="button" className={`domain-build-option ${isSelected ? "is-build-selected" : ""}`} key={choice.id} aria-pressed={isSelected} onClick={() => selectDomainBuildChoice(domain.number, domain.title, choice.id)}><ChoiceIcon size={18} strokeWidth={1.9} /><span><b>{choice.title}</b><small>{choice.definition}</small></span></button>; })}</div>}</article>; })}</div></section>

        <section id="timeline" className="timeline-section section-shell content-section scroll-scene" data-scene="timeline"><div className="section-rail"><span>04</span><i /><span>TIMELINE</span></div><div className="timeline-heading"><div className="eyebrow"><Route size={15} /> PROTOTYPE PATH</div><h2>FROM FIRST PING<br />TO <i>FINAL DEMO.</i></h2></div><div className="timeline-track">{timeline.map((item) => <article className="timeline-item" key={item.index}><span className="timeline-index">{item.index}</span><span className="timeline-date">{item.date}</span><h3>{item.phase}</h3><p>{item.detail}</p></article>)}</div></section>

        <section id="prizes" className="prizes-section section-shell content-section scroll-scene" data-scene="prizes"><div className="section-rail"><span>05</span><i /><span>PRIZES</span></div><div className="section-heading"><div className="eyebrow"><Trophy size={15} /> REWARDS</div><h2>BUILD FOR THE<br /><i>₹50K PRIZE.</i></h2></div><div className="prize-console"><article className="grand-prize"><img className="prize-emblem-watermark" src={TRANSPARENT_EMBLEM} alt="" aria-hidden="true" /><span className="card-label">OVERALL PRIZE</span><div className="prize-value">₹50<span>K</span></div><h3>₹500 TO ENTER.<br />₹50K TO WIN.</h3><div className="prize-entry-lockup"><span>ENTRY</span><b>₹500 <small>/ HEAD</small></b></div><p>Register and build for the overall reward.</p><Button className="cta cta-primary" onClick={sendRegistrationMessage}>REGISTER NOW <ArrowUpRight size={16} /></Button></article><div className="special-prize-grid">{specialAwards.map((award, index) => { const Icon = award.icon; return <article className="special-prize" key={award.title}><span>SP.{String(index + 1).padStart(2, "0")}</span><img className="special-award-image" src={award.image} alt="" aria-hidden="true" /><div className="special-award-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.9} /></div><h3>{award.title}</h3><p>{award.tag}</p></article>; })}</div></div></section>

        <section id="transport" className="transport-section section-shell content-section scroll-scene" data-scene="transport"><div className="section-rail"><span>06</span><i /><span>TRANSPORT</span></div><div className="transport-heading"><div className="eyebrow"><MapPin size={15} /> TRAVEL</div><h2>REACH THE<br /><i>CAMPUS.</i></h2></div><div className="transport-layout"><article className="venue-card"><div className="venue-orbit" /><span className="card-label">DESTINATION</span><h3>Erode Sengunthar<br />Engineering College</h3><p>Perundurai – 57</p><a href="https://maps.google.com/?q=Erode+Sengunthar+Engineering+College+Perundurai" target="_blank" rel="noreferrer" className="map-link">OPEN MAP <ArrowUpRight size={15} /></a></article><article className="transport-info glass-panel"><div className="transport-icon"><BusFront /></div><div><span className="card-label">TRANSIT</span><h3>41 ROUTES.<br />180+ STOPS.</h3><p>Free campus shuttles and active routes available.</p><button type="button" className="text-button" onClick={toggleRouteDirectory} aria-expanded={routeDirectoryOpen} aria-controls="route-directory">{routeDirectoryOpen ? "HIDE ROUTES" : "VIEW 41 ROUTES"} <ExternalLink size={14} /></button></div></article></div><div className="transport-metrics"><span><b>41</b> ROUTES</span><span><b>180+</b> STOPS</span><span><b>FREE</b> SHUTTLE</span><span><b>24×7</b> DESK</span></div><div className="route-dashboard"><div className="route-dashboard-head"><div><span className="card-label">SNAPSHOT</span><h3>BUS ROUTES</h3></div><button type="button" className="text-button" onClick={toggleRouteDirectory} aria-expanded={routeDirectoryOpen} aria-controls="route-directory">{routeDirectoryOpen ? "HIDE ROUTES" : "VIEW ALL ROUTES"} <ArrowUpRight size={15} /></button></div><div className="route-grid">{featuredRoutes.map((route) => <article className="route-card" key={route.number}><span>ROUTE {route.number}</span><strong>{route.time}</strong><h4>{route.origin} ⇄ ESEC</h4><p>Via {route.via}</p><a href={`tel:+91${route.phone}`}><PhoneCall size={14} /> +91 {route.phone}</a></article>)}</div></div>{routeDirectoryOpen && <TransportDirectory />}<article className="emergency-console"><div className="emergency-icon"><ShieldAlert size={25} /></div><div><span className="card-label">SUPPORT</span><h3>HELPDESK</h3><p>Contact for late arrival or transit queries.</p></div><a href="tel:04294232701" className="emergency-call">CALL 04294-232701 <PhoneCall size={16} /></a></article></section>

        <section id="sponsors" className="sponsors-section section-shell content-section scroll-scene" data-scene="sponsors"><div className="section-rail"><span>07</span><i /><span>SPONSORS</span></div><div className="section-heading"><div className="eyebrow"><Sparkles size={15} /> PARTNERS</div><h2>SUPPORTED<br /><i>BY.</i></h2></div><div className="sponsor-console"><div className="sponsor-console-copy placeholder-pop"><span className="card-label">PARTNERS</span><h3>INDUSTRY<br /><i>ALLIES.</i></h3><p>Nexara Auto Tech and MISD Automation are confirmed partners.</p></div><div className="sponsor-slots"><article className="sponsor-slot sponsor-slot-confirmed"><div className="sponsor-logo-plate"><img src={eventAssets.partners.nexara} alt="Nexara Auto Tech Solutions logo" /></div><p className="sponsor-tier">TECHNOLOGY</p><b>NEXARA AUTO<br />TECH</b></article><article className="sponsor-slot sponsor-slot-confirmed sponsor-slot-knowledge"><div className="sponsor-logo-plate"><img src={eventAssets.partners.misdAutomation} alt="MISD Automation logo" /></div><p className="sponsor-tier">KNOWLEDGE</p><b>MISD<br />AUTOMATION</b></article>{sponsorSlots.map((slot) => <div className={`sponsor-slot placeholder-pop ${slot.tone}`} key={slot.tier}><span>{slot.slots}</span><b>{slot.tier}</b></div>)}</div></div></section>

        <section id="team" className="team-section section-shell content-section scroll-scene" data-scene="team"><div className="section-rail"><span>08</span><i /><span>TEAM</span></div><div className="section-heading"><div className="eyebrow"><UsersRound size={15} /> LEADERSHIP</div><h2>THE PEOPLE<br /><i>BEHIND IT.</i></h2></div><div className="team-console-head"><p>The organising team.</p></div><div className="leadership-department-grid">{leadershipDepartments.map((department) => <LeadershipDepartmentCard department={department} key={department.department} />)}</div></section>

        <section id="faq" className="faq-section section-shell content-section scroll-scene" data-scene="faq"><div className="section-rail"><span>10</span><i /><span>FAQ</span></div><div className="faq-heading"><div className="eyebrow"><Radio size={15} /> CLEAR THE STATIC</div><h2>GOT A<br /><i>QUESTION?</i></h2></div><Accordion type="single" collapsible className="faq-list">{faqs.map((faq, index) => <AccordionItem value={`faq-${index}`} key={faq.question}><AccordionTrigger><span>{String(index + 1).padStart(2, "0")}</span>{faq.question}</AccordionTrigger><AccordionContent>{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></section>

        <section className="final-section section-shell scroll-scene" data-scene="final"><div className="final-signal" style={{ backgroundImage: `linear-gradient(115deg, rgba(1, 4, 20, .3), rgba(4, 6, 24, .88)), url(${PANEL_BG})` }}><div><span className="eyebrow"><Sparkles size={15} /> READY FOR LIFTOFF</span><h2>CODE.<br /><i>DESIGN.</i><br />INNOVATE.</h2></div><div className="final-actions"><p>24 HOURS.<br />ONE BIG CHALLENGE.</p><Button className="cta cta-primary" onClick={sendRegistrationMessage}>REGISTER SQUAD <ArrowUpRight size={17} /></Button><button className="text-button" onClick={downloadGuidelines}>DOWNLOAD GUIDELINES <Download size={14} /></button></div></div></section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><img src={SIGNAL_MARK} alt="" /><span>INNOHACK-26</span></div><p>ERODE SENGUNTHAR ENGINEERING COLLEGE · PERUNDURAI – 57</p><span>CODE · DESIGN · INNOVATE · REPEAT</span><a className="footer-email" href="mailto:innohack26@gmail.com"><Mail size={13} /> innohack26@gmail.com</a><a className="footer-email" href="https://www.instagram.com/innohack?igsi=MTMweGc3MHlqem1heg==" target="_blank" rel="noreferrer"><Instagram size={13} /> @innohack</a></footer>
      <ParticipantHelpWidget />
    </div>
  );
}
