/**
 * Single source of truth for InnoHack-26 event media assets.
 * All media is bundled and served statically from /media/.
 */
export const eventAssets = {
  backgrounds: {
    milkyWay: "/media/innohack26-milkyway-zoom_6b0b6e7d.png",
    nebulaPanel: "/media/innohack26-nebula-panel_f635f4b9.png",
  },
  brand: {
    logo: "/media/innohack26-blue-gold-logo-alpha-final_f7112a97.png",
  },
  event: {
    brochure: "/media/innohack26-brochure-qr-updated_769f8c7b.webp",
    participantGuidelines: "/media/main_89d663ac.pdf",
  },
  payment: {
    qr: "/media/innohack26-college-payment-qr-current_92d85bc1.jpeg",
  },
  team: {
    sathiyamoorthi: "/media/sathiyamoorthi-c-eie-tech-lead-v2_117a6adf.png",
    abhiRuban: "/media/abhi-ruban-eie-event-lead_c19bb0b4.jpeg",
    roboticsLead: "/media/innohack26-robotics-team-lead_0bacd821.png",
  },
  leadership: {
    mechHod: "/media/innohack26-mech-hod.jpg",
    roboticsHod: "/media/innohack26-robotics-hod.jpg",
    roboticsFacultyCoordinator: "/media/innohack26-robotics-faculty-coordinator.jpg",
    mechStudentCoordinator1: "/media/innohack26-mech-student-coordinator-1.jpg",
    mechStudentCoordinator2: "/media/innohack26-mech-student-coordinator-2.jpg",
  },
  contacts: {
    vinodhini: "/media/innohack26-vinodhini-c-eie-faculty-coordinator_913ccc76.png",
  },
  partners: {
    nexara: "/media/nexara-auto-tech-solutions-logo_21c4197c.png",
    misdAutomation: "/media/misd-automation-knowledge-partner_d9d363ae.png",
  },
  prizeImages: {
    ai: "/media/prize-digital-light-stage_c899bc58.jpg",
    impact: "/media/prize-innovation-award_519a1baa.jpeg",
    sustainability: "/media/prize-creative-awards_69a3d2a0.jpg",
    leadership: "/media/prize-hackathon-trophies_21fbd411.jpg",
    industry: "/media/prize-tech-trophy_c30f58c8.jpg",
  },
} as const;

export const offlineEventMediaAssets = [
  eventAssets.backgrounds.milkyWay,
  eventAssets.backgrounds.nebulaPanel,
  eventAssets.brand.logo,
  eventAssets.event.brochure,
  eventAssets.event.participantGuidelines,
  eventAssets.payment.qr,
  eventAssets.team.sathiyamoorthi,
  eventAssets.team.abhiRuban,
  eventAssets.team.roboticsLead,
  eventAssets.leadership.mechHod,
  eventAssets.leadership.roboticsHod,
  eventAssets.leadership.roboticsFacultyCoordinator,
  eventAssets.leadership.mechStudentCoordinator1,
  eventAssets.leadership.mechStudentCoordinator2,
  eventAssets.contacts.vinodhini,
  eventAssets.partners.nexara,
  eventAssets.partners.misdAutomation,
  ...Object.values(eventAssets.prizeImages),
] as const;
