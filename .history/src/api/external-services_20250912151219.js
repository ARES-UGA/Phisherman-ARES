// external-services.js
// Handles integrations with threat intelligence + scanning services

import fetch from "node-fetch";

export async function checkURLReputation(url) {
  // Example: OpenPhish / PhishTank (no key needed)
  try {
    const response = await fetch(`https://openphish.com/feed.txt`);
    const feed = await response.text();
    return feed.includes(url);
  } catch (err) {
    console.error("Error fetching URL reputation:", err);
    return false;
  }
}

export async function checkWithVirusTotal(hashOrUrl) {
  // Requires VirusTotal API key
  const API_KEY = process.env.VIRUSTOTAL_API_KEY;
  if (!API_KEY) {
    throw new Error("VirusTotal API key missing.");
  }

  try {
    const response = await fetch(`https://www.virustotal.com/api/v3/urls`, {
      method: "POST",
      headers: {
        "x-apikey": API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `url=${encodeURIComponent(hashOrUrl)}`,
    });
    return await response.json();
  } catch (err) {
    console.error("VirusTotal check failed:", err);
    return null;
  }
}
