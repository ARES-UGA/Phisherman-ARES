// attachment-analyzer.js
// Handles scanning files, detecting malware/macros, and embedded links

import { checkAttachementWithVirusTotal } from "../api/external-services.js";

export async function analyzeAttachment(file) {
  const results = {
    fileName: file.name,
    type: file.type,
    size: file.size,
    malwareDetected: false,
    macrosDetected: false,
    embeddedLinks: [],
    riskScore: 0,
  };

  try {
    // 1. File scanning with VirusTotal
    const vtResult = await checkAttachementWithVirusTotal(file.hash);
    if (vtResult && vtResult.data) {
      const positives = vtResult.data.attributes.last_analysis_stats.malicious;
      if (positives > 0) {
        results.malwareDetected = true;
        results.riskScore += 5;
      }
    }

    // 2. Macro detection (stub)
    if (file.type.includes("doc") && file.containsMacros) {
      results.macrosDetected = true;
      results.riskScore += 3;
    }

    // 3. Extract embedded URLs (stub)
    if (file.embeddedUrls && file.embeddedUrls.length > 0) {
      results.embeddedLinks = file.embeddedUrls;
      results.riskScore += 2;
    }
  } catch (err) {
    console.error("Error analyzing attachment:", err);
  }

  return results;
}
