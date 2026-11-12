// Optional Vercel Serverless Config Bridge:
// Lets you set POLAR_MONTHLY_URL and POLAR_YEARLY_URL inside Vercel -> Settings -> Environment Variables
// without even editing config.js if you prefer!
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.status(200).json({
    monthlyCheckoutUrl: process.env.POLAR_MONTHLY_URL || "",
    yearlyCheckoutUrl: process.env.POLAR_YEARLY_URL || "",
    firefoxAmoStoreUrl: process.env.FIREFOX_AMO_URL || "",
    chromeStoreUrl: process.env.CHROME_STORE_URL || ""
  });
};
