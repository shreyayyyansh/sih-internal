import { ApifyClient } from "apify-client";
import axios from "axios";
// IMPORTANT: Make sure this path matches where you create your Mongoose model
import SocialPulse from "../../models/urbanconnect/socialPulseModel.js";
import fs from "fs";

const logToFile = (msg) => {
  fs.appendFileSync("pulse.log", `[${new Date().toISOString()}] ${msg}\n`);
};

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const PYTHON_AI_URL = process.env.PYTHON_SERVER || "http://localhost:8000";

export const fetchAndAnalyzeCityPulse = async () => {
  try {
    logToFile("--- INITIATING CITY PULSE ---");
    console.log("[CITY PULSE] 1. Initiating parallel Apify scrapers...");

    const twitterPayload = {
      searchTerms: [
        "(Prayagraj OR Allahabad) AND (municipal OR issue OR complaint OR news OR water OR electricity OR road OR traffic OR garbage OR corruption)"
      ],
      maxTweets: 50, 
      sort: "Latest"  
    };

    const redditPayload = {
      startUrls: [
        { url: "https://www.reddit.com/r/allahabad/new/" },
        { url: "https://www.reddit.com/r/prayagraj/new/" },
        { url: "https://www.reddit.com/r/india/search/?q=Prayagraj&restrict_sr=1&t=day" },
        { url: "https://www.reddit.com/r/uttarpradesh/search/?q=Prayagraj&restrict_sr=1&t=day" }
      ],
      skipComments: true, 
      skipUserPosts: true,
      maxItems: 20 
    };

    const runOptions = { waitSecs: 150 }; // CORRECT PROPERTY IS waitSecs
    
    // Launch all sources in parallel: Tavily + the three Apify actors
    console.log("[CITY PULSE] 1. Launching multi-source data gathering (Tavily + Apify)...");
    
    const [tavilyResults, twitterRun, redditRun, newsRun] = await Promise.all([
      // A. Tavily Search (Reliable primary news/social search)
      (async () => {
        try {
          console.log("[TAVILY] 🚀 Searching for latest Prayagraj civic updates...");
          const tResponse = await axios.post("https://api.tavily.com/search", {
            api_key: process.env.TAVILY_API_KEY,
            query: "latest civic issues municipal complaints Prayagraj Allahabad news",
            search_depth: "advanced",
            include_answer: false,
            max_results: 15
          });
          console.log(`[TAVILY] ✅ Found ${tResponse.data.results?.length || 0} results.`);
          return tResponse.data.results || [];
        } catch (err) {
          console.error("[TAVILY] ❌ Search FAILED:", err.message);
          return [];
        }
      })(),

      // B. Apify Twitter
      (async () => {
        try {
          console.log("[APIFY] 🚀 Launching Twitter Scraper...");
          return await apifyClient.actor("apidojo/twitter-scraper-lite").call(twitterPayload, runOptions);
        } catch (err) {
          console.error("[APIFY] ❌ Twitter FAILED:", err.message);
          return null;
        }
      })(),

      // C. Apify Reddit
      (async () => {
        try {
          console.log("[APIFY] 🚀 Launching Reddit Scraper...");
          return await apifyClient.actor("trudax/reddit-scraper-lite").call(redditPayload, runOptions);
        } catch (err) {
          console.error("[APIFY] ❌ Reddit FAILED:", err.message);
          return null;
        }
      })(),

      // D. Apify Google News
      (async () => {
        try {
          console.log("[APIFY] 🚀 Launching Google News Scraper...");
          const gnPayload = { queries: ["Prayagraj news today", "Allahabad municipal issues"], maxItems: 10 };
          return await apifyClient.actor("apify/google-news-scraper").call(gnPayload, runOptions);
        } catch (err) {
          console.error("[APIFY] ❌ News FAILED:", err.message);
          return null;
        }
      })()
    ]);

    console.log("[CITY PULSE] 2. Raw data runs finished. Fetching datasets...");

    const apifyDatasets = await Promise.all([
      twitterRun ? apifyClient.dataset(twitterRun.defaultDatasetId).listItems() : { items: [] },
      redditRun ? apifyClient.dataset(redditRun.defaultDatasetId).listItems() : { items: [] },
      newsRun ? apifyClient.dataset(newsRun.defaultDatasetId).listItems() : { items: [] }
    ]);

    const twitterItems = apifyDatasets[0].items || [];
    const redditItems = apifyDatasets[1].items || [];
    const newsItems = apifyDatasets[2].items || [];

    const stats = `Tavily=${tavilyResults.length}, Twitter=${twitterItems.length}, Reddit=${redditItems.length}, News=${newsItems.length}`;
    logToFile(`Scrape Results: ${stats}`);
    console.log(`[CITY PULSE] Results: ${stats}`);

    const combinedRawData = [
      ...tavilyResults.map(res => ({
        source: "Tavily Search",
        text: (res.title || "") + " " + (res.content || ""),
        url: res.url
      })),
      ...twitterItems.map(item => ({ 
        source: "Twitter", 
        text: item.full_text || item.text || "", 
        url: item.url 
      })),
      ...redditItems.map(item => ({ 
        source: "Reddit", 
        text: (item.title || "") + " " + (item.body || item.selftext || ""), 
        url: item.url 
      })),
      ...newsItems.map(item => ({
        source: "Google News",
        text: (item.title || "") + " " + (item.description || item.snippet || ""),
        url: item.link || item.url
      }))
    ];

    if (combinedRawData.length === 0) {
      console.warn("[CITY PULSE] ⚠️ No data found from any source. Still proceeding to AI for 'Empty Report' generation.");
    }

    console.log(`[CITY PULSE] 3. Merged ${combinedRawData.length} posts. Fetching historical data...`);

    // Fetch yesterday's pulse from MongoDB
    const yesterdayPulse = await SocialPulse.findOne({ city: "Prayagraj" }).sort({ createdAt: -1 });
    
    let historicalContext = null;
    if (yesterdayPulse && yesterdayPulse.sentiment_metrics) {
      historicalContext = {
         previous_trust_score: yesterdayPulse.sentiment_metrics.public_trust_score,
         previous_summary: yesterdayPulse.executive_summary
      };
      console.log(`[CITY PULSE] Found previous data. Yesterday's Score: ${historicalContext.previous_trust_score}`);
    } else {
      console.log("[CITY PULSE] No previous data found (First run).");
    }

    // Send the raw posts AND historical context to the Python AI
    logToFile(`Sending ${combinedRawData.length} posts to Python AI...`);
    console.log("[CITY PULSE] Sending to Python AI for analysis...");
    const aiResponse = await axios.post(`${PYTHON_AI_URL}/analyze-pulse`, {
      city: "Prayagraj",
      posts: combinedRawData,
      previous_data: historicalContext
    });

    const cleanData = aiResponse.data;
    
    if (!cleanData || !cleanData.executive_summary) {
        throw new Error("AI Backend returned invalid/empty analysis.");
    }

    logToFile(`AI Analysis complete. Trend: ${cleanData.trend_analysis.direction}`);
    console.log(`[CITY PULSE] 4. AI Analysis complete. Trend: ${cleanData.trend_analysis.direction}`);

    // Save the fully structured AI analysis to MongoDB
    await SocialPulse.create({
      city: "Prayagraj",
      executive_summary: cleanData.executive_summary,
      sentiment_metrics: cleanData.sentiment_metrics,
      trend_analysis: cleanData.trend_analysis,
      extracted_issues: cleanData.extracted_issues,
      recommended_actions: cleanData.recommended_actions
    });

    logToFile("Successfully saved Pulse to DB.");
    console.log("[CITY PULSE] 5. Successfully saved to database!");

  } catch (error) {
    console.error("[CITY PULSE] ❌ FATAL ERROR during execution:", error.message);
    if (error.response) {
        console.error("[CITY PULSE] AI Backend Error Details:", error.response.data);
    }
  }
};