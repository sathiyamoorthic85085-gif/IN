import { describe, expect, it } from "vitest";
import { eventAssets, offlineEventMediaAssets } from "./eventAssets";

describe("event media catalogue", () => {
  it("lists unique local media for offline caching", () => {
    expect(offlineEventMediaAssets).toHaveLength(17);
    expect(new Set(offlineEventMediaAssets).size).toBe(offlineEventMediaAssets.length);
    expect(eventAssets.payment.qr).toBe("/media/innohack26-college-payment-qr-current_92d85bc1.jpeg");
    expect(offlineEventMediaAssets).toContain(eventAssets.payment.qr);
    expect(offlineEventMediaAssets).toContain(eventAssets.partners.nexara);
    expect(offlineEventMediaAssets).toContain(eventAssets.team.roboticsLead);
    expect(offlineEventMediaAssets).toContain(eventAssets.contacts.vinodhini);
    expect(offlineEventMediaAssets.every((asset) => asset.startsWith("/media/"))).toBe(true);
  });
});

