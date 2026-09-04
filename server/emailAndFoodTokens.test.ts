import { describe, expect, it } from "vitest";
import {
  generateFoodTokens,
  MEAL_SCHEDULE,
  renderRegistrationEmailHtml,
  renderRegistrationEmailText,
} from "./emailTemplate";
import {
  getLiveHeadCountMetrics,
  lookupFoodPass,
  registerSquadFoodTokens,
  toggleMealRedemption,
} from "./foodTokenService";

describe("Email & Food Token Integration", () => {
  it("verifies the exact 2 times food and 5 times snacks slots specified by the organiser", () => {
    const mealIds = MEAL_SCHEDULE.map((m) => m.id);
    expect(mealIds).toEqual([
      "sep24_mrng_snacks",
      "sep24_eve_snacks",
      "sep24_night_dinner",
      "sep24_night_snacks",
      "sep25_mrng_bfast",
      "sep25_mrng_snacks",
      "sep25_aft_snacks",
    ]);

    // 2 times food (Main Meals)
    const foodSlots = MEAL_SCHEDULE.filter((m) => m.type === "food");
    expect(foodSlots).toHaveLength(2);
    expect(foodSlots.map((m) => m.id)).toEqual(["sep24_night_dinner", "sep25_mrng_bfast"]);

    // 5 times snacks (Refreshment breaks)
    const snackSlots = MEAL_SCHEDULE.filter((m) => m.type === "snacks");
    expect(snackSlots).toHaveLength(5);
    expect(snackSlots.map((m) => m.id)).toEqual([
      "sep24_mrng_snacks",
      "sep24_eve_snacks",
      "sep24_night_snacks",
      "sep25_mrng_snacks",
      "sep25_aft_snacks",
    ]);
  });

  it("calculates dynamic registration fee at ₹500 per head accurately", () => {
    const calculateFee = (memberCount: number) => memberCount * 500;
    expect(calculateFee(1)).toBe(500);
    expect(calculateFee(2)).toBe(1000);
    expect(calculateFee(3)).toBe(1500);
    expect(calculateFee(4)).toBe(2000);
    expect(calculateFee(5)).toBe(2500);
    expect(calculateFee(6)).toBe(3000);
  });

  it("calculates fee for 2 team members along with 1 team lead as 3 total participants (₹1500)", () => {
    const leadCount = 1;
    const additionalMembers = 2;
    const totalSquad = leadCount + additionalMembers;
    const totalFee = totalSquad * 500;
    expect(totalSquad).toBe(3);
    expect(totalFee).toBe(1500);

    const members = ["Lead Person", "Team Member One", "Team Member Two"];
    const tokens = generateFoodTokens("IH26-LEAD3", members);
    expect(tokens).toHaveLength(3);
    expect(tokens[0].role).toBe("Team Leader");
    expect(tokens[1].role).toBe("Squad Member 2");
    expect(tokens[2].role).toBe("Squad Member 3");
  });

  it("generates 4 individual food tokens for a 4-member squad with distinct QR codes", () => {
    const members = ["Asha Kumar", "Ravi Kumar", "Meera K", "Vikram S"];
    const tokens = generateFoodTokens("IH26-TEST4", members);

    expect(tokens).toHaveLength(4);
    expect(tokens[0].memberName).toBe("Asha Kumar");
    expect(tokens[0].role).toBe("Team Leader");
    expect(tokens[0].tokenId).toBe("IH26-TEST4-F1");
    expect(tokens[0].scanUrl).toContain("/food-token?token=IH26-TEST4-F1");

    expect(tokens[3].memberName).toBe("Vikram S");
    expect(tokens[3].role).toBe("Squad Member 4");
    expect(tokens[3].tokenId).toBe("IH26-TEST4-F4");
  });

  it("renders email HTML with poster cover image, ₹500/head fee breakdown, and all member passes", () => {
    const members = ["Asha Kumar", "Ravi Kumar", "Meera K", "Vikram S"];
    const html = renderRegistrationEmailHtml({
      referenceCode: "IH26-DEMO-99",
      teamName: "Quantum Builders",
      leadName: "Asha Kumar",
      email: "asha@example.com",
      phone: "+91 98765 43210",
      college: "Erode Sengunthar Engineering College",
      memberCount: 4,
      members,
      domain: "AI, Electronics & Intelligent Systems",
      buildType: "software",
      transactionId: "UPI-9876543210",
      amountPaid: 2000,
      submittedAt: new Date().toISOString(),
      siteUrl: "https://innohack26.vercel.app",
    });

    // Check poster cover image
    expect(html).toContain("innohack26-brochure-qr-updated_769f8c7b.webp");
    // Check reference code
    expect(html).toContain("IH26-DEMO-99");
    // Check ₹500 fee calculation
    expect(html).toContain("4 × ₹500 = ₹2,000");
    expect(html).toContain("₹2,000");
    // Check all member passes rendered
    expect(html).toContain("PASS #1 OF 4");
    expect(html).toContain("Asha Kumar");
    expect(html).toContain("IH26-DEMO-99-F1");
    expect(html).toContain("PASS #4 OF 4");
    expect(html).toContain("Vikram S");
    expect(html).toContain("IH26-DEMO-99-F4");
    // Check meals listed
    expect(html).toContain("24th Sep Night");
    expect(html).toContain("25th Sep Morning");
  });

  it("handles food pass lookup, meal redemption toggle, and live head count metrics", async () => {
    const refCode = "IH26-CATERING-TEST";
    const members = ["Lead Participant", "Member Two"];

    registerSquadFoodTokens({
      referenceCode: refCode,
      teamName: "Catering Squad",
      leadName: "Lead Participant",
      email: "catering@example.com",
      phone: "+919876543210",
      college: "ESEC",
      memberCount: 2,
      members,
      domain: "Robotics & Drones",
      buildType: "hardware",
    });

    // 1. Lookup pass
    const pass1 = await lookupFoodPass({ tokenId: `${refCode}-F1` });
    expect(pass1).not.toBeNull();
    expect(pass1?.memberName).toBe("Lead Participant");
    expect(pass1?.redemptions["sep24_night_dinner"]).toBeUndefined();

    // 2. Redeem 24th Night Dinner
    const result = await toggleMealRedemption({
      tokenId: `${refCode}-F1`,
      mealId: "sep24_night_dinner",
      scannedBy: "organiser@innohack26.in",
    });
    expect(result.action).toBe("redeemed");
    expect(result.pass.redemptions["sep24_night_dinner"]).toBeDefined();
    expect(result.pass.redemptions["sep24_night_dinner"].redeemedBy).toBe("organiser@innohack26.in");

    // 3. Check Head Count Metrics
    const metrics = getLiveHeadCountMetrics();
    const dinnerStat = metrics.mealStats.find((m) => m.id === "sep24_night_dinner");
    expect(dinnerStat?.servedCount).toBeGreaterThanOrEqual(1);

    // 4. Undo redemption
    const undoResult = await toggleMealRedemption({
      tokenId: `${refCode}-F1`,
      mealId: "sep24_night_dinner",
      forceAction: "undo",
    });
    expect(undoResult.action).toBe("undone");
    expect(undoResult.pass.redemptions["sep24_night_dinner"]).toBeUndefined();
  });
});
