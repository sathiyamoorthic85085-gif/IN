import { MEAL_SCHEDULE } from "./emailTemplate";
import { lookupRegisteredParticipant } from "./registrationService";

export interface MealRedemptionInfo {
  redeemedAt: string;
  redeemedBy?: string;
}

export interface FoodPassRecord {
  tokenId: string; // e.g. IH26-ABCDEF-F1
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
  redemptions: Record<string, MealRedemptionInfo>; // keyed by mealId
}

export interface MealHeadCountStat {
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

// In-memory food pass store for instant lookup and scanner updates
const foodPassStore = new Map<string, FoodPassRecord>();

// Activity feed of recent scans
export interface RecentScanActivity {
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

const recentActivityFeed: RecentScanActivity[] = [];

/**
 * Register food passes for a newly registered squad
 */
export function registerSquadFoodTokens(params: {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  college: string;
  memberCount: number;
  members: string[];
  domain: string;
  buildType: string;
  createdAt?: string;
}): FoodPassRecord[] {
  const createdAt = params.createdAt || new Date().toISOString();
  const records: FoodPassRecord[] = [];

  params.members.forEach((memberName, idx) => {
    const memberIndex = idx + 1;
    const role = memberIndex === 1 ? "Team Leader" : `Squad Member ${memberIndex}`;
    const tokenId = `${params.referenceCode}-F${memberIndex}`.toUpperCase();

    const passRecord: FoodPassRecord = {
      tokenId,
      referenceCode: params.referenceCode.toUpperCase(),
      memberIndex,
      memberName: memberName.trim() || `Member ${memberIndex}`,
      role,
      teamName: params.teamName,
      college: params.college,
      domain: params.domain,
      buildType: params.buildType,
      email: params.email,
      phone: params.phone,
      memberCount: params.memberCount,
      createdAt,
      redemptions: {},
    };

    foodPassStore.set(tokenId.toLowerCase(), passRecord);
    records.push(passRecord);
  });

  return records;
}

/**
 * Lookup a food pass by tokenId, reference code & member index, or raw query
 */
export async function lookupFoodPass(query: {
  tokenId?: string;
  referenceCode?: string;
  memberIndex?: number;
}): Promise<FoodPassRecord | null> {
  const tokenQuery = (query.tokenId || "").trim().toLowerCase();

  if (tokenQuery && foodPassStore.has(tokenQuery)) {
    return foodPassStore.get(tokenQuery)!;
  }

  // Check if reference code is provided
  const refCode = (query.referenceCode || tokenQuery.split("-F")[0] || "").trim().toUpperCase();
  const mIndex = query.memberIndex || (tokenQuery.includes("-f") ? parseInt(tokenQuery.split("-f")[1], 10) : 1);

  const exactTokenKey = `${refCode}-F${mIndex}`.toLowerCase();
  if (foodPassStore.has(exactTokenKey)) {
    return foodPassStore.get(exactTokenKey)!;
  }

  // If not found in memory, try to reconstruct from registered participant lookup
  try {
    const squad = await lookupRegisteredParticipant(refCode);
    if (squad) {
      const members = [
        squad.leadName,
        squad.memberCount >= 2 ? "Member 2" : "",
        squad.memberCount >= 3 ? "Member 3" : "",
        squad.memberCount >= 4 ? "Member 4" : "",
        squad.memberCount >= 5 ? "Member 5" : "",
        squad.memberCount === 6 ? "Member 6" : "",
      ].filter(Boolean);

      const generated = registerSquadFoodTokens({
        referenceCode: squad.referenceCode,
        teamName: squad.teamName,
        leadName: squad.leadName,
        email: squad.email,
        phone: squad.phone,
        college: squad.college,
        memberCount: squad.memberCount,
        members: members.length > 0 ? members : [squad.leadName],
        domain: squad.domain,
        buildType: squad.buildType,
        createdAt: squad.submittedAt,
      });

      const found = generated.find((p) => p.memberIndex === mIndex) || generated[0] || null;
      return found;
    }
  } catch {
    // Non-fatal
  }

  // Fallback synthetic pass if reference code format is valid
  if (refCode.startsWith("IH26-") || tokenQuery.startsWith("ih26-")) {
    const syntheticPass: FoodPassRecord = {
      tokenId: `${refCode}-F${mIndex}`,
      referenceCode: refCode,
      memberIndex: mIndex,
      memberName: `InnoHack Participant #${mIndex}`,
      role: mIndex === 1 ? "Team Leader" : `Squad Member ${mIndex}`,
      teamName: `Squad ${refCode.slice(-6)}`,
      college: "Registered Institution",
      domain: "Open Innovation",
      buildType: "software",
      email: "participant@innohack26.in",
      phone: "+91",
      memberCount: Math.max(mIndex, 2),
      createdAt: new Date().toISOString(),
      redemptions: {},
    };
    foodPassStore.set(syntheticPass.tokenId.toLowerCase(), syntheticPass);
    return syntheticPass;
  }

  return null;
}

/**
 * Toggle or record meal redemption for a food pass
 */
export async function toggleMealRedemption(params: {
  tokenId: string;
  mealId: string;
  scannedBy?: string;
  forceAction?: "redeem" | "undo";
}): Promise<{ success: boolean; pass: FoodPassRecord; action: "redeemed" | "undone" }> {
  const pass = await lookupFoodPass({ tokenId: params.tokenId });
  if (!pass) {
    throw new Error(`Food pass "${params.tokenId}" not found.`);
  }

  const mealConfig = MEAL_SCHEDULE.find((m) => m.id === params.mealId);
  const mealLabel = mealConfig?.label || params.mealId;
  const mealIcon = mealConfig?.icon || "🍽️";

  const isCurrentlyRedeemed = Boolean(pass.redemptions[params.mealId]);
  let action: "redeemed" | "undone" = "redeemed";

  if (params.forceAction === "undo" || (isCurrentlyRedeemed && !params.forceAction)) {
    delete pass.redemptions[params.mealId];
    action = "undone";
  } else {
    pass.redemptions[params.mealId] = {
      redeemedAt: new Date().toISOString(),
      redeemedBy: params.scannedBy || "Catering Desk Coordinator",
    };
    action = "redeemed";
  }

  // Update memory
  foodPassStore.set(pass.tokenId.toLowerCase(), pass);

  // Log activity
  recentActivityFeed.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tokenId: pass.tokenId,
    memberName: pass.memberName,
    teamName: pass.teamName,
    mealId: params.mealId,
    mealLabel,
    mealIcon,
    timestamp: new Date().toISOString(),
    action,
    scannedBy: params.scannedBy || "Organiser",
  });

  if (recentActivityFeed.length > 50) {
    recentActivityFeed.pop();
  }

  return {
    success: true,
    pass,
    action,
  };
}

/**
 * Calculate live head count metrics across all registered passes
 */
export function getLiveHeadCountMetrics(): {
  totalRegisteredAttendees: number;
  totalSquads: number;
  mealStats: MealHeadCountStat[];
  recentActivity: RecentScanActivity[];
} {
  const allPasses = Array.from(foodPassStore.values());
  const uniqueSquads = new Set(allPasses.map((p) => p.referenceCode));
  const totalEligible = allPasses.length;

  const mealStats: MealHeadCountStat[] = MEAL_SCHEDULE.map((meal) => {
    const servedCount = allPasses.filter((p) => Boolean(p.redemptions[meal.id])).length;
    const remainingCount = Math.max(0, totalEligible - servedCount);
    const percentServed = totalEligible > 0 ? Math.round((servedCount / totalEligible) * 100) : 0;

    return {
      id: meal.id,
      label: meal.label,
      icon: meal.icon,
      type: meal.type,
      time: meal.time,
      desc: meal.desc,
      servedCount,
      totalEligible,
      remainingCount,
      percentServed,
    };
  });

  return {
    totalRegisteredAttendees: totalEligible,
    totalSquads: uniqueSquads.size,
    mealStats,
    recentActivity: recentActivityFeed.slice(0, 20),
  };
}
