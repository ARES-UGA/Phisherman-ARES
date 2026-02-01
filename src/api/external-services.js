// external-services.js
// Handles integrations with threat intelligence + scanning services

import fetch from "node-fetch";

/**
 * 
 * @param {*} url 
 * @returns 
 */
export async function checkURLReputation(url) {
  // TODO: Database checking

  // OpenPhish & PhishTank Database

  //VirusTotalURL


  // Requires VirusTotal API key
  const API_KEY = process.env.VIRUSTOTAL_API_KEY;
  if (!API_KEY) {
    throw new Error("VirusTotal API key missing.");
  }

  const responseURLSubmission = await fetch("https://www.virustotal.com/api/v3/urls", { 
    method: "POST", 
    headers: { 
      "x-apikey": API_KEY, 
      "content-type": "application/x-www-form-urlencoded" 
    }, 
    body: `url=${encodeURIComponent(urlToScan)}` 
  }); 
  
  const submitData = await responseURLSubmission.json(); 
  const analysisId = submitData.data.id; 

  // Fetching the result
  (async () => { 
    const result = await virusTotalAnalysis(analysisId); 
    return result;
  })();

  

  // Example: OpenPhish / PhishTank (no key needed)

  // We intend on implementing a database of the following products

  /*
  try {
    const response = await fetch(`https://openphish.com/feed.txt`);
    const feed = await response.text();
    return feed.includes(url);
  } catch (err) {
    console.error("Error fetching URL reputation:", err);
    return false;
  }
  */

}

/**
 * A function for checking the legitamacy of an attachement
 * 
 * @param {*} hashOrUrl 
 * @returns the json of the analysis report
 */
export async function checkAttachementWithVirusTotal(hashOrUrl) {
  //TODO: Check hash with database

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

/**
 * Takes a virus total analysisId and returns the report from the virus total api.
 * 
 * @param {*} analysisId 
 * @returns the json report of the virus total request or timeout information
 */
export async function virusTotalAnalysis(analysisId) {
  //TODO: Add report to database


  // Requires VirusTotal API key
  const API_KEY = process.env.VIRUSTOTAL_API_KEY;
  if (!API_KEY) {
    throw new Error("VirusTotal API key missing.");
  }

  // Used for timeout checking
  const startTime = Date.now();

  // Poll VirusTotal until analysis is complete 
  let report; 
  while (true) { 
    const reportResponse = await fetch( `https://www.virustotal.com/api/v3/analyses/${analysisId}`, { 
      headers: { "x-apikey": API_KEY } 
    }); 
    
    report = await reportResponse.json(); 
    
    // Exits the loop if the report is no longer queued. I.e. it failed or succeeded
    if (report.data.attributes.status !== "queued") {
      return report;
    } 

    // Check timeout 
    if (Date.now() - startTime > 20000) { 
      return { 
        timeout: true, 
        message: "Analysis still queued when timeout was reached.", 
        analysisId 
      };
    }
    
    // Wait a moment before polling again 
    await new Promise(resolve => setTimeout(resolve, 1500)); 
  }
}