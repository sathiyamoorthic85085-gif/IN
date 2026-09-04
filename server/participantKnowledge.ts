export type EventKnowledgeChunk = {
  id: string;
  title: string;
  text: string;
  keywords: string[];
};

export const eventKnowledgeBase: EventKnowledgeChunk[] = [
  {
    id: "event",
    title: "Event Dates, Venue & Duration",
    keywords: ["date", "when", "venue", "where", "college", "perundurai", "24", "hour", "time", "location", "erode"],
    text: "InnoHack-26 is a 24-hour continuous national hackathon held on 24–25 September 2026 at Erode Sengunthar Engineering College (ESEC), Thuduppathi, Perundurai, Erode – 638 057, Tamil Nadu.",
  },
  {
    id: "coordinators_robotics",
    title: "Robotics & Automation Coordinators & Contact Numbers",
    keywords: ["robotics", "drone", "harish", "jayamanikandan", "automation", "sensor", "ros", "hardware lead", "robot"],
    text: "For Robotics & Automation track, Drone queries, ROS, sensor interfacing, and hardware prototyping rules, contact: 1. Jayamanikandan P (Student Coordinator, 3rd Year Robotics) at +91 99433 71076 (jayamanijayamani43@gmail.com). 2. Harish Gopal (Student Coordinator, 3rd Year Robotics) at +91 8300191535 (abdharishgopal@gmail.com).",
  },
  {
    id: "coordinators_mechanical",
    title: "Mechanical Engineering Coordinators & Contact Numbers",
    keywords: ["mechanical", "mech", "samuel", "naveen", "cad", "cam", "fabrication", "workshop", "3d printing", "accommodation"],
    text: "For Mechanical Engineering track, CAD/CAM design, fabrication tools, 3D printing components, and accommodation queries, contact: 1. Samuel A (Student Coordinator, 3rd Year Mech) at +91 9342683393 (samandrew8464@gmail.com). 2. Naveen V (Student Coordinator, 3rd Year Mech) at naveenvenu2007@gmail.com.",
  },
  {
    id: "coordinators_eie_tech",
    title: "EIE, Tech Lead & Faculty Coordinator Contact Numbers",
    keywords: ["tech lead", "sathiyamoorthi", "vinodhini", "faculty", "eie", "website", "qr pass", "portal", "od", "approval", "letter", "abhi ruban"],
    text: "For Website issues, QR Food Passes, portal technical support, payment references, and Software Build track, contact Sathiyamoorthi C. (Tech Lead & 3rd Year EIE) at +91 7708914279. For official college OD letters, faculty approvals, and institutional sponsorship, contact Mrs. Vinodhini C. (Faculty Coordinator, A/P EIE) at +91 6382249016. Abhi Ruban serves as Event Lead.",
  },
  {
    id: "registration",
    title: "Registration & Dynamic Fee Calculation (₹500 / Head)",
    keywords: ["registration", "register", "fee", "cost", "500", "member", "squad", "team", "price", "how much", "amount", "total"],
    text: "Registration fee is strictly ₹500 per head (₹500 per participant). Squad sizes range from 1 to 6 members: 1 Participant (Leader solo) = ₹500; 2 Participants (Leader + 1 Member) = ₹1,000; 3 Participants (Leader + 2 Members) = ₹1,500; 4 Participants (Leader + 3 Members) = ₹2,000; 5 Participants (Leader + 4 Members) = ₹2,500; 6 Participants (Leader + 5 Members) = ₹3,000. All squad members receive full hackathon access and food passes.",
  },
  {
    id: "food_and_refreshments",
    title: "Food, Dining & Refreshment Schedule (All 6 Included)",
    keywords: ["food", "meal", "dinner", "breakfast", "snacks", "tea", "refreshment", "catering", "buffet", "eat", "menu", "pass"],
    text: "All 6 meals & refreshments are included with registration: 1. Day 1 Morning Welcome Refreshments & Tea (Sep 24, 10:30 AM). 2. Grand Hackathon Dinner Feast Buffet (Sep 24, 08:30 PM). 3. Midnight Energy Snacks & Hot Drinks (Sep 25, 01:00 AM). 4. Day 2 South Indian Breakfast & Coffee (Sep 25, 07:30 AM). 5. Day 2 Pre-Evaluation Refreshments (Sep 25, 11:30 AM). 6. Valedictory High Tea (Sep 25, 03:30 PM). Show your Digital Team QR Pass at the catering desk for instant check-off.",
  },
  {
    id: "payment",
    title: "Payment, UPI QR & UTR Verification",
    keywords: ["payment", "utr", "transaction", "qr", "upi", "verify", "verification", "screenshot", "receipt", "gpay", "phonepe", "paytm"],
    text: "Participants pay via official college UPI QR displayed on the registration page, then submit the UTR / Transaction ID and upload the payment proof screenshot (max 200 KB). An automatic confirmation email containing the official Reference Code and Team QR Pass is instantly sent to the Team Leader's Gmail.",
  },
  {
    id: "transport",
    title: "Bus Transport Routes & 24x7 Logistics Helpdesk",
    keywords: ["transport", "bus", "route", "travel", "pickup", "helpdesk", "41", "salem", "tirupur", "erode", "bhavani", "kangeyam", "shuttle"],
    text: "Free college buses operate across 41 routes connecting Salem, Tirupur, Erode Central, Bhavani, Gobichettipalayam, Kangeyam, Kundadam, and surrounding transit points directly to ESEC Campus. 24x7 Logistics Helpdesk: 04294-232701.",
  },
  {
    id: "domains",
    title: "Innovation Domains & Software vs Hardware Tracks",
    keywords: ["domain", "software", "hardware", "track", "problem", "statement", "agritech", "healthcare", "ai", "smart cities", "open innovation"],
    text: "8 Innovation Domains: 1. AgriTech & GreenTech 2. Robotics & Drones 3. Healthcare & Assistive Technology 4. Sustainable & Clean Technology 5. Industrial Automation & Smart Manufacturing 6. AI, Electronics & Intelligent Systems 7. Smart Cities & Mobility 8. Open Innovation. Each squad chooses either a Software Build (web/mobile/AI/cloud) or Hardware Build (embedded/IoT/robotics).",
  },
  {
    id: "prizes",
    title: "Prize Pool & Special Awards",
    keywords: ["prize", "award", "50000", "50k", "cash", "winner", "trophy", "special", "women", "impact", "sustainability"],
    text: "Total cash prize pool is ₹50,000. In addition to main winners, special awards include: Best AI Innovation, Best Social Impact Solution, Best Sustainability Innovation, Best Women-Led Team, and Best Industry Solution.",
  },
  {
    id: "contact",
    title: "Whom to Contact for Specific Queries",
    keywords: ["contact", "email", "help", "coordinator", "doubt", "support", "call", "phone", "number", "whom to contact", "whatsapp"],
    text: "• Robotics/Drones: Jayamanikandan P (+91 99433 71076) or Harish Gopal (+91 8300191535)\n• Mechanical/CAD/Accommodation: Samuel A (+91 9342683393)\n• Website/QR Pass/Registrations: Sathiyamoorthi C. (+91 7708914279)\n• Faculty Approvals & OD Letters: Mrs. Vinodhini C. (+91 6382249016)\n• 24x7 Bus Logistics: 04294-232701\n• Official Email: innohack26@gmail.com\n• WhatsApp Community: https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t",
  },
];

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9₹]+/g, " ").trim();

export function retrieveEventKnowledge(question: string, limit = 4): EventKnowledgeChunk[] {
  const query = new Set(normalise(question).split(/\s+/).filter((token) => token.length > 1));
  const ranked = eventKnowledgeBase.map((chunk) => ({
    chunk,
    score:
      chunk.keywords.reduce((score, keyword) => score + (query.has(normalise(keyword)) ? 4 : 0), 0) +
      Array.from(query).reduce(
        (score, token) => score + (normalise(chunk.text).includes(token) ? 1.5 : 0) + (normalise(chunk.title).includes(token) ? 3 : 0),
        0
      ),
  })).sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id));

  const relevant = ranked.filter((item) => item.score > 0).slice(0, limit).map((item) => item.chunk);
  return relevant.length > 0 ? relevant : eventKnowledgeBase.slice(0, Math.min(limit, 2));
}

export function participantHelpSystemPrompt(retrieved: EventKnowledgeChunk[]) {
  const context = retrieved.map((chunk) => `### ${chunk.title}\n${chunk.text}`).join("\n\n");
  return `You are the official InnoHack-26 AI Assistant for Erode Sengunthar Engineering College.
Answer the participant's question accurately, concisely, and warmly based on the verified event facts below.

Key Rules:
1. When asked about coordinators or whom to contact, provide the EXACT name, role, phone number, and email.
2. When asked about registration fees, specify ₹500/head with the exact squad size formula ($1\\text{ Lead} + N\\text{ Members} \\times ₹500$).
3. When asked about meals, confirm all 6 meals/refreshments are included with the digital QR pass.
4. Keep answers friendly, crisp (under 180 words), with clear bullet points.
5. Never ask for banking passwords, OTPs, or UPI PINs.

Trusted InnoHack-26 Event Facts:
${context}`;
}
