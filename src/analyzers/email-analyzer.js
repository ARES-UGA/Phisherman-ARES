// email-analyzer.js
// Handles email content, headers, and phishing pattern detection

import { checkURLReputation } from "../api/external-services.js";

export async function analyzeEmailContent(email) {
  const results = {
    suspiciousKeywords: [],
    urlReputation: [],
    spfDkimDmarc: null,
    riskScore: 0,
  };

  try {
    // 1. Keyword-based detection (stub)
    const suspiciousPatterns = ["urgent", "password", "wire transfer"];
    suspiciousPatterns.forEach((word) => {
      if (email.body && email.body.toLowerCase().includes(word)) {
        results.suspiciousKeywords.push(word);
        results.riskScore += 1;
      }
    });

    // 2. URL reputation check // not sure we need this anymore?
    if (email.urls && email.urls.length > 0) {
      for (const url of email.urls) {
        const bad = await checkURLReputation(url);
        if (bad) {
          results.urlReputation.push({ url, flagged: true });
          results.riskScore += 3;
        } else {
          results.urlReputation.push({ url, flagged: false });
        }
      }
    }

    // 3. SPF/DKIM/DMARC (stub – can integrate with mail header parser) //not sure we need this anymore?
    results.spfDkimDmarc = {
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
    };
  } catch (err) {
    console.error("Error analyzing email content:", err);
  }

  return results;
}
