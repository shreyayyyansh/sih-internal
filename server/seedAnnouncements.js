/**
 * Seed Script: Populate UrbanConnect Announcements Collection
 *
 * Creates ~20-25 synthetic announcements from the 5 existing Administration officials:
 * - SDM (Delhi, Revenue)
 * - Municipal Corporation (Delhi, Civic)
 * - Fire Department (Delhi, Emergency Services)
 * - BMC Commissioner (Mumbai, Civic)
 * - Traffic Police (Mumbai, Police)
 *
 * Each announcement gets a 768-dim embedding via the Python agent for RAG fact-checking.
 *
 * Usage:
 *   node seedAnnouncements.js
 */

import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";
import Administration from "./src/models/urbanconnect/administrationModel.js";
import Announcement from "./src/models/urbanconnect/announcementModel.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/urbanconnect";
const AGENT_URL = process.env.PYTHON_SERVER ;

// --- Synthetic Announcements per Official ---
const SEED_DATA = [
  {
    postName: "SDM",
    city: "Prayagraj",
    announcements: [
      {
        title: "Property Tax Deadline Extension",
        body: "The last date for property tax payment for FY 2025-26 has been extended to April 30, 2026. Residents of Prayagraj can pay online via the Nagar Nigam portal or at designated facilitation centers in Civil Lines and Allahabad High Court area. A 10% rebate applies for payments before March 31.",
      },
      {
        title: "Revenue Camp: Land Record Verification",
        body: "A revenue camp for land record verification and mutation will be held at the SDM Office, Civil Lines, Prayagraj from March 20-25, 2026. Residents must bring original property documents, Aadhaar, and recent photographs.",
      },
      {
        title: "Encroachment Removal Drive – Sangam Area",
        body: "A scheduled encroachment removal drive will take place near Sangam, Daraganj, and Arail from March 18 to March 22, 2026. Unauthorized structures on government land will be demolished. Affected parties should contact the SDM office immediately.",
      },
      {
        title: "Marriage Registration Camp",
        body: "A special marriage registration camp will be organized at SDM Court, Prayagraj on March 28, 2026. Both parties must be present with two witnesses, Aadhaar cards, photographs, and marriage invitation/proof.",
      },
    ],
  },
  {
    postName: "Municipal Corporation",
    city: "Prayagraj",
    announcements: [
      {
        title: "Water Supply Schedule Update – Civil Lines & Georgetown",
        body: "Due to maintenance work on the Phaphamau Water Treatment Plant, water supply in Civil Lines, Georgetown, and Tagore Town areas will be disrupted from March 16-17, 2026 between 6 AM and 6 PM. Water tankers will be deployed in affected areas.",
      },
      {
        title: "Waste Collection Schedule Change – Zone III",
        body: "Starting March 20, 2026, door-to-door waste collection in Zone III (Rajapur, Kareli, Mutthiganj, Lukerganj) will shift from 7 AM to 6 AM. Segregated waste bins must be placed outside by 5:45 AM.",
      },
      {
        title: "Road Resurfacing – MG Marg Stretch",
        body: "The MG Marg stretch from Prayagraj Junction to Civil Lines is undergoing complete resurfacing from March 15 to April 5, 2026. Expect single-lane traffic from 10 PM to 6 AM. Alternate route via Kamla Nehru Road is recommended.",
      },
      {
        title: "Public Park Renovation – Chandrashekhar Azad Park",
        body: "Chandrashekhar Azad Park (Company Garden) will be closed for renovation from March 20 to April 15, 2026. The renovation includes new jogging tracks, children's play area, and improved lighting. Entry will resume after completion.",
      },
      {
        title: "Mosquito Fogging Schedule – Naini & Jhunsi",
        body: "The Nagar Nigam will conduct anti-mosquito fogging in residential areas of Naini, Jhunsi, and Phaphamau from March 18-25, 2026 between 5 PM and 8 PM. Residents are requested to keep windows open for effective fogging.",
      },
    ],
  },
  {
    postName: "Fire Department",
    city: "Prayagraj",
    announcements: [
      {
        title: "Fire Safety Advisory – Summer Season",
        body: "With summer approaching, Prayagraj Fire Services advises all residents to check electrical wiring, avoid overloading sockets, and keep fire extinguishers accessible. Industrial units in Naini Industrial Area must ensure fire NOC compliance. Emergency helpline: 101.",
      },
      {
        title: "Fire Station Open Day – March 22",
        body: "Prayagraj Fire Services is hosting an open day at the Central Fire Station, Civil Lines on March 22, 2026. Citizens can visit between 10 AM and 4 PM to learn about fire safety, see equipment demonstrations, and get free home safety assessments.",
      },
      {
        title: "High-Rise Building Fire Drill Notice",
        body: "Mandatory fire drills will be conducted in all commercial high-rise buildings in Civil Lines and Tagore Town areas during the week of March 24-28, 2026. Building managers must coordinate with the nearest fire station.",
      },
      {
        title: "Magh Mela Ground Fire Safety Measures",
        body: "Enhanced fire safety measures are in place at the Magh Mela grounds near Sangam. All temporary structures must maintain fire extinguishers and maintain minimum 3-meter gaps. Cooking with open flames is restricted to designated zones only.",
      },
    ],
  },
  {
    postName: "BMC Commissioner",
    city: "Prayagraj",
    announcements: [
      {
        title: "Pre-Monsoon Drain Cleaning – Trans Yamuna Area",
        body: "Prayagraj's pre-monsoon drain cleaning program begins March 18, 2026 in Trans Yamuna areas (Jhunsi, Phaphamau, Naini). Major nullahs and storm water drains will be desilted. Temporary road closures may occur near drain access points.",
      },
      {
        title: "Water Supply Restored in Rajapur Colony",
        body: "The 48-hour water supply disruption in Rajapur Colony has been resolved. Normal water supply has been restored as of March 14, 2026, 6:00 AM. Residents should allow 2-3 hours for full pressure normalization.",
      },
      {
        title: "Smart City Road Project – Lukerganj to Allahpur",
        body: "Under the Prayagraj Smart City project, the road from Lukerganj to Allahpur is being upgraded with smart lighting and drainage. Work expected March 15 to May 30, 2026. Traffic will be diverted via Stanley Road during construction.",
      },
      {
        title: "Property Tax Rebate for Green Buildings",
        body: "Prayagraj Nagar Nigam is offering a 5% property tax rebate to residential societies that implement rainwater harvesting and solar panels. Applications open until June 30, 2026. Details available at the Nagar Nigam office, Zero Road.",
      },
      {
        title: "Heritage Walk Program – Prayagraj",
        body: "Prayagraj Nagar Nigam launches a free guided heritage walk program covering historic landmarks including Allahabad Fort, Anand Bhawan, and Swaraj Bhawan starting April 2026. Walks every Saturday at 7 AM from Anand Bhawan. Registration opens March 25.",
      },
    ],
  },
  {
    postName: "Traffic Police",
    city: "Prayagraj",
    announcements: [
      {
        title: "Road Closure – Sangam Ghat Festivities",
        body: "Roads around Sangam Ghat, Daraganj Bridge, and Arail areas will be closed for religious festivities on March 23, 2026 from 4 AM to 12 PM. Vehicles should use the Shastri Bridge or Phaphamau Bridge. PRTC buses will operate from Prayagraj Junction.",
      },
      {
        title: "Traffic Diversion – Flyover Construction on Stanley Road",
        body: "Due to flyover construction, traffic on Stanley Road (Civil Lines to Prayagraj Junction) is diverted via MG Marg and Kamla Nehru Road. This diversion is effective from March 15 to May 30, 2026. Heavy vehicles are prohibited during peak hours (8-11 AM, 5-9 PM).",
      },
      {
        title: "Speed Camera Enforcement – GT Road",
        body: "New speed cameras are now active on GT Road from Prayagraj to Naini. Speed limit is 60 km/h for cars and 40 km/h for commercial vehicles near residential areas. Violations will be automatically e-challaned via the vehicle's registration number.",
      },
      {
        title: "No-Parking Zone Expansion – Civil Lines",
        body: "Civil Lines no-parking zones have been expanded to include MG Marg, Hastings Road, and Kamla Nehru Road. Towing operations will be active 24/7 starting March 20, 2026. Use designated parking near Prayagraj Junction or SP Marg.",
      },
    ],
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("[Seed] Connected to MongoDB");

    // Clear existing announcements
    const deleteResult = await Announcement.deleteMany({});
    console.log(`[Seed] Cleared ${deleteResult.deletedCount} existing announcements`);

    let totalCreated = 0;

    for (const official of SEED_DATA) {
      // Look up the Administration document
      const authority = await Administration.findOne({
        postName: official.postName,
        city: official.city,
      });

      if (!authority) {
        console.warn(
          `[Seed] ⚠️ Administration not found: ${official.postName} (${official.city}). Skipping.`
        );
        continue;
      }

      console.log(
        `[Seed] Processing: ${official.postName} (${official.city}) — ${official.announcements.length} announcements`
      );

      for (const ann of official.announcements) {
        // Generate embedding via Python agent
        let embedding = [];
        try {
          const response = await axios.post(`${AGENT_URL}/embed`, {
            text: `${ann.title}. ${ann.body}`,
          });
          embedding = response.data?.embedding || [];
          console.log(
            `  ✅ Embedded: "${ann.title.substring(0, 40)}..." (${embedding.length}d)`
          );
        } catch (err) {
          console.error(
            `  ❌ Embedding failed for "${ann.title}":`,
            err.message
          );
        }

        // Create announcement document
        await Announcement.create({
          authority: authority._id,
          title: ann.title,
          body: ann.body,
          city: official.city,
          department: authority.department,
          embedding: embedding,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL
        });

        totalCreated++;
      }
    }

    console.log(`\n[Seed] ✅ Successfully created ${totalCreated} announcements`);
  } catch (err) {
    console.error("[Seed] Fatal error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("[Seed] Disconnected from MongoDB");
  }
}

seed();
