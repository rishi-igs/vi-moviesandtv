// ---------------------------------------------------------------------------
// Data layer for the dashboard.
//
// Right now this returns a STATIC snapshot (hand-computed from the current
// DB Data/*.json files: websites -> latest successful audit -> metrics).
// It exists so the React prototype can be proven out without depending on
// a live server.
//
// TO SWITCH TO LIVE DATA LATER: replace the body of loadDashboardRows()
// with a fetch of DB Data/websites.json, DB Data/audits.json and
// DB Data/metrics.json, and reuse buildRowsFromRaw() below to join them
// exactly the way this snapshot was produced. Nothing else in the app
// needs to change — every component consumes the same row shape.
// ---------------------------------------------------------------------------

const MOCK_ROWS = [
  { websiteId: 2, page: "www.amazon.com", url: "https://www.amazon.com/", fcp: 6.854737, lcp: 15.50896465, tbt: 1363.1694, clsVal: 0.1025777810646708, si: 9.702237626692342, accessibility: 92, bestPractices: 54, seo: 92, performance: 28, pageLoad: null },
  { websiteId: 3, page: "github.com", url: "https://github.com/rishimanjunath15?tab=repositories", fcp: 6.167776, lcp: 6.692776, tbt: 1052.000000000001, clsVal: 0, si: 6.167776, accessibility: 92, bestPractices: 96, seo: 100, performance: 39, pageLoad: null },
  { websiteId: 6, page: "in.puma.com", url: "https://in.puma.com/in/en", fcp: 5.9102975, lcp: 6.9920775, tbt: 18975.80737000002, clsVal: 0.1231657501376731, si: 10.92256092113921, accessibility: 92, bestPractices: 54, seo: 92, performance: 23, pageLoad: null },
  { websiteId: 8, page: "search.brave.com", url: "https://search.brave.com/search?q=nike&source=desktop", fcp: 4.636446, lcp: 4.936446, tbt: 3429, clsVal: 0, si: 7.813536153596087, accessibility: 75, bestPractices: 96, seo: 0, performance: 36, pageLoad: null },
  { websiteId: 14, page: "localhost:3001", url: "http://localhost:3001/", fcp: 0.813396, lcp: 2.020396, tbt: 3798, clsVal: 0, si: 0.813396, accessibility: 100, bestPractices: 96, seo: 91, performance: 70, pageLoad: null },
  { websiteId: 16, page: "chatgpt.com", url: "https://chatgpt.com/", fcp: 1.93296, lcp: 1.93296, tbt: 1039, clsVal: 0, si: 1.93296, accessibility: 100, bestPractices: 79, seo: 92, performance: 76, pageLoad: null },
  { websiteId: 18, page: "www.amazon.in", url: "https://www.amazon.in/", fcp: 7.36583995, lcp: 10.2664919, tbt: 1501.158150000005, clsVal: 0, si: 8.822950579324981, accessibility: 95, bestPractices: 61, seo: 92, performance: 31, pageLoad: null },
  { websiteId: 19, page: "www.flipkart.com", url: "https://www.flipkart.com/", fcp: 2.19394218, lcp: 3.18723798, tbt: 11815.8278, clsVal: 0.00002476890702911911, si: 10.25914178235611, accessibility: 79, bestPractices: 96, seo: 0, performance: 52, pageLoad: null },
  { websiteId: 20, page: "example.com", url: "https://example.com", fcp: 0.844921, lcp: 0.844921, tbt: 0, clsVal: 0, si: 0.844921, accessibility: 100, bestPractices: 96, seo: 80, performance: 100, pageLoad: null },
  { websiteId: 21, page: "www.flipkart.com", url: "https://www.flipkart.com/mens-footwear/pr?sid=osp%2Ccil&p%5B%5D=facets.brand%255B%255D%3DCAMPUS", fcp: 1.8016559, lcp: 3.0011081, tbt: 11079.3332, clsVal: 0, si: 3.222300886196981, accessibility: 66, bestPractices: 96, seo: 54, performance: 63, pageLoad: null },
  { websiteId: 24, page: "console.neon.tech", url: "https://console.neon.tech/app/projects", fcp: 2.8405045, lcp: 4.0216515, tbt: 375, clsVal: 0.007044880793686371, si: 4.776139095992387, accessibility: 89, bestPractices: 100, seo: 54, performance: 70, pageLoad: null },
  { websiteId: 28, page: "www.marutisuzuki.com", url: "https://www.marutisuzuki.com/", fcp: 1.182052, lcp: 3.2817072, tbt: 3123.3721, clsVal: 0.1266724651722004, si: 8.496563250624917, accessibility: 89, bestPractices: 61, seo: 92, performance: 50, pageLoad: null },
  { websiteId: 34, page: "github.com", url: "https://github.com/login/oauth/select_account?client_id=01ab8ac9400c4e429b23", fcp: 6.0053115, lcp: 6.0053115, tbt: 372.5, clsVal: 0.009600101552518819, si: 6.0053115, accessibility: 100, bestPractices: 100, seo: 100, performance: 55, pageLoad: null },
  { websiteId: 38, page: "127.0.0.1", url: "http://127.0.0.1:64147/?redirect_uri=vscode%3A%2F%2Fvscode.github-authentication", fcp: null, lcp: null, tbt: null, clsVal: null, si: null, accessibility: 0, bestPractices: 0, seo: 0, performance: 0, pageLoad: null },
  { websiteId: 40, page: "example.com", url: "https://example.com/", fcp: 0.884979, lcp: 0.884979, tbt: 0, clsVal: 0, si: 0.884979, accessibility: 100, bestPractices: 96, seo: 80, performance: 100, pageLoad: null }
];

async function loadDashboardRows() {
  // Static prototype data — see the header comment for the live-fetch swap point.
  return MOCK_ROWS;
}
