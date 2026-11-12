// ============================================================================
// CALMBLUR — FOUNDER CONFIGURATION (POLAR.SH RECURRING MRR READY!)
// ============================================================================
(function (root) {
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  const CALMBLUR_CONFIG = {
    brandName: "CalmBlur",
    siteUrl: "https://calmblur.vercel.app",

    // Pricing shown across the Web App, Sofa TV Buzz & Browser Extensions:
    monthlyPriceText: "£3.99/mo",
    monthlyUsdHint: "$4.99/mo USD",
    yearlyPriceText: "£24.99/yr",
    yearlyUsdHint: "$29.99/yr USD",
    yearlySavingsBadge: "Save 48% · £2.08/mo",

    // 1. YOUR VERIFIED POLAR.SH ORGANIZATION ID (ALREADY CONNECTED!):
    polarOrganizationId: "f54cc5b7-b9ad-443e-9c8c-60a686a6ac1c",

    // 2. PASTE YOUR 2 POLAR CHECKOUT LINKS INSIDE THE QUOTES ON LINES 21 & 22:
    //    (Or add POLAR_MONTHLY_URL and POLAR_YEARLY_URL in Vercel Environment Variables!)
    monthlyCheckoutUrl: "https://buy.polar.sh/polar_cl_uqnhvuNEJbJIRukI68Mzf4MaIK0qxg6Ahv1NG3VGswL",
    yearlyCheckoutUrl: "https://buy.polar.sh/polar_cl_1tuLT1HXav69GubtL6vBm1ja2HZHE6SJFbscT2bNqsH",

    // 3. Free Taster Limits (generous enough for 5-star reviews, converts to MRR):
    freeTriggersAllowed: 1,
    freeSofaSessionsAllowed: 1,

    // 4. Optional Store Links (paste once Mozilla / Chrome approve your extension):
    firefoxAmoStoreUrl: "",
    chromeStoreUrl: "",

    // 5. Re-check Polar subscription every 24 hours so cancelled subscriptions auto-stop:
    recheckIntervalMs: TWENTY_FOUR_HOURS_MS,

    // 6. Founder VIP code so YOU & your husband can unlock everything anytime (great for filming TikTok demos!):
    founderTestCode: "CALM-VIP-2026"
  };

  // Optional live override from /api/config when running on Vercel
  CALMBLUR_CONFIG.loadRemoteConfig = async function () {
    if (typeof location === "undefined" || !/^https?:$/i.test(location.protocol)) return;
    if (!location.hostname.includes("vercel.app") && !location.hostname.includes("calmblur")) return;
    try {
      const resp = await fetch("/api/config", { method: "GET" });
      if (!resp.ok) return;
      const remote = await resp.json();
      if (remote.monthlyCheckoutUrl) CALMBLUR_CONFIG.monthlyCheckoutUrl = remote.monthlyCheckoutUrl;
      if (remote.yearlyCheckoutUrl) CALMBLUR_CONFIG.yearlyCheckoutUrl = remote.yearlyCheckoutUrl;
      if (remote.firefoxAmoStoreUrl) CALMBLUR_CONFIG.firefoxAmoStoreUrl = remote.firefoxAmoStoreUrl;
      if (remote.chromeStoreUrl) CALMBLUR_CONFIG.chromeStoreUrl = remote.chromeStoreUrl;
    } catch (_) {
      // Ignore offline/static fallback
    }
  };

  // Shared Polar.sh Subscription License Key Validator
  // Automatically checks status === "granted". When a subscriber cancels and their period ends,
  // Polar sets status = "revoked", and CalmBlur automatically steps back to the Free 1-trigger tier!
  CALMBLUR_CONFIG.validatePolarKey = async function (rawKey) {
    const key = String(rawKey || "").trim();
    if (!key) return { valid: false, revoked: false, error: "Please enter the Pass key from your Polar email." };

    if (key.toUpperCase() === CALMBLUR_CONFIG.founderTestCode.toUpperCase()) {
      return {
        valid: true,
        revoked: false,
        plan: "CalmBlur Founder VIP Pass",
        checkedAt: Date.now()
      };
    }

    if (
      !CALMBLUR_CONFIG.polarOrganizationId ||
      CALMBLUR_CONFIG.polarOrganizationId.includes("REPLACE_WITH")
    ) {
      return {
        valid: false,
        revoked: false,
        error: "Polar Organization ID missing in config.js."
      };
    }

    try {
      const resp = await fetch("https://api.polar.sh/v1/customer-portal/license-keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key,
          organization_id: CALMBLUR_CONFIG.polarOrganizationId
        })
      });

      if (resp.status === 404) {
        return {
          valid: false,
          revoked: true,
          error: "Pass key not found — please check the key inside your Polar confirmation email."
        };
      }
      if (resp.status === 403 || resp.status === 422) {
        return {
          valid: false,
          revoked: true,
          error: "This subscription key is no longer active or reached its 5-device household limit."
        };
      }
      if (!resp.ok) {
        return {
          valid: false,
          revoked: false,
          error: "Could not reach Polar right now (HTTP " + resp.status + "). Please try again."
        };
      }

      const data = await resp.json();
      const notExpired = !data.expires_at || new Date(data.expires_at).getTime() > Date.now();

      if (data.status === "granted" && notExpired) {
        return {
          valid: true,
          revoked: false,
          plan: "CalmBlur Active Pass",
          checkedAt: Date.now()
        };
      }

      return {
        valid: false,
        revoked: true,
        error: "Your CalmBlur subscription has ended. Re-subscribe anytime to unlock all 10 trigger shields!"
      };
    } catch (_) {
      return {
        valid: false,
        revoked: false,
        networkError: true,
        error: "Connection check paused while offline — keeping current status."
      };
    }
  };

  root.CALMBLUR_CONFIG = CALMBLUR_CONFIG;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = CALMBLUR_CONFIG;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : window));
