// outlook-integration.js

import fetch from "node-fetch";

const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

// Configuration constants
const CONFIG = {
  MAX_SAFE_HOPS: 15, // Most enterprise emails pass through 5-12 hops
  DOMAIN_AGE_SUSPICIOUS_DAYS: 90,
  DOMAIN_AGE_CRITICAL_DAYS: 7,
  URGENCY_KEYWORDS: [
    'urgent', 'immediate', 'suspended', 'verify now', 'click here',
    'confirm your', 'unusual activity', 'expires today', 'act now',
    'account locked', 'security alert', 'update required'
  ],
  RISKY_TLDs: ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top'],
  TRUSTED_SENDERS_KEY: 'phisherman_trusted_senders', // For localStorage
};

/* ================================
   AUTH
   ================================ */

export async function getGraphAccessToken() {
  try {
    return await OfficeRuntime.auth.getAccessToken({
      allowSignInPrompt: true,
      allowConsentPrompt: true,
      forMSGraphAccess: true,
    });
  } catch (error) {
    console.error('[Phisherman] Auth failed:', error);
    throw new Error('Failed to authenticate with Microsoft Graph');
  }
}

/* ================================
   CURRENT MESSAGE (OFFICE.JS)
   ================================ */

export function getCurrentEmail() {
  const item = Office.context.mailbox.item;

  if (!item) {
    throw new Error("No active Outlook item.");
  }

  return new Promise((resolve, reject) => {
    item.body.getAsync("text", (result) => {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        reject(new Error(`Failed to fetch email body: ${result.error?.message}`));
        return;
      }

      // Also fetch HTML version for link analysis
      item.body.getAsync("html", (htmlResult) => {
        const htmlBody = htmlResult.status === Office.AsyncResultStatus.Succeeded 
          ? htmlResult.value 
          : null;

        resolve({
          subject: item.subject || "",
          from: {
            name: item.from?.displayName || "",
            address: item.from?.emailAddress || "",
          },
          to: item.to?.map(r => ({
            name: r.displayName,
            address: r.emailAddress
          })) || [],
          cc: item.cc?.map(r => ({
            name: r.displayName,
            address: r.emailAddress
          })) || [],
          replyTo: item.replyTo?.map(r => r.emailAddress) || [],
          body: result.value,
          htmlBody,
          internetMessageId: item.internetMessageId,
          dateTimeCreated: item.dateTimeCreated,
          attachments: item.attachments || [],
        });
      });
    });
  });
}

/* ================================
   HEADER FETCH (GRAPH)
   ================================ */

export async function getCurrentEmailHeaders() {
  const token = await getGraphAccessToken();
  const item = Office.context.mailbox.item;

  if (!item?.internetMessageId) {
    throw new Error("No internetMessageId available.");
  }

  // Properly encode the message ID for OData filter
  const encodedId = encodeURIComponent(item.internetMessageId);
  const url =
    `${GRAPH_API_URL}/me/messages` +
    `?$filter=internetMessageId eq '${encodedId}'` +
    `&$select=internetMessageHeaders,from,sender,replyTo`;

  try {
    const res = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Graph API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    if (!data.value?.length) {
      console.warn('[Phisherman] No messages found for ID:', item.internetMessageId);
      return null;
    }

    return data.value[0];
  } catch (error) {
    console.error('[Phisherman] Header fetch failed:', error);
    throw error;
  }
}

/* ================================
   HEADER ANALYSIS
   ================================ */

export function analyzeHeaders(headers) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return {
      spf: { status: 'unknown', score: 0 },
      dkim: { status: 'unknown', score: 0 },
      dmarc: { status: 'unknown', score: 0 },
      receivedCount: 0,
      riskScore: 0,
      issues: [],
    };
  }

  const result = {
    spf: { status: 'unknown', score: 0 },
    dkim: { status: 'unknown', score: 0 },
    dmarc: { status: 'unknown', score: 0 },
    receivedCount: 0,
    receivedPath: [],
    riskScore: 0,
    issues: [],
  };

  // Parse authentication results
  for (const h of headers) {
    const name = h.name.toLowerCase();
    const value = h.value.toLowerCase();

    if (name === "authentication-results") {
      // SPF analysis
      if (value.includes("spf=pass")) {
        result.spf = { status: 'pass', score: 0 };
      } else if (value.includes("spf=fail")) {
        result.spf = { status: 'fail', score: 30 };
        result.issues.push('SPF authentication failed');
      } else if (value.includes("spf=softfail")) {
        result.spf = { status: 'softfail', score: 15 };
        result.issues.push('SPF soft fail (suspicious)');
      } else if (value.includes("spf=none")) {
        result.spf = { status: 'none', score: 10 };
      }

      // DKIM analysis
      if (value.includes("dkim=pass")) {
        result.dkim = { status: 'pass', score: 0 };
      } else if (value.includes("dkim=fail")) {
        result.dkim = { status: 'fail', score: 25 };
        result.issues.push('DKIM signature verification failed');
      } else if (value.includes("dkim=none")) {
        result.dkim = { status: 'none', score: 5 };
      }

      // DMARC analysis (strongest signal)
      if (value.includes("dmarc=pass")) {
        result.dmarc = { status: 'pass', score: -20 }; // Negative = reduces risk
      } else if (value.includes("dmarc=fail")) {
        result.dmarc = { status: 'fail', score: 40 };
        result.issues.push('DMARC policy violation');
      } else if (value.includes("dmarc=none")) {
        result.dmarc = { status: 'none', score: 5 };
      }
    }

    if (name === "received") {
      result.receivedCount += 1;
      const match = h.value.match(/from\s+([^\s]+)/);
      if (match) result.receivedPath.push(match[1]);
    }
  }

  // Excessive hops indicate potential forwarding or spoofing
  if (result.receivedCount > CONFIG.MAX_SAFE_HOPS) {
    result.riskScore += 15;
    result.issues.push(`Unusual mail path (${result.receivedCount} hops)`);
  }

  // Calculate total risk from authentication
  result.riskScore += result.spf.score + result.dkim.score + result.dmarc.score;

  return result;
}

/* ================================
   DISPLAY-NAME & SENDER SPOOFING
   ================================ */

export function detectSpoofing(email, headers) {
  const issues = [];
  let riskScore = 0;

  const displayName = email.from.name || "";
  const fromAddress = email.from.address || "";
  const emailDomain = fromAddress.split("@")[1]?.toLowerCase();

  // Extract domain from header "From:" field
  let headerFromDomain = null;
  for (const h of headers) {
    if (h.name.toLowerCase() === "from") {
      const match = h.value.match(/@([^\s>]+)/);
      if (match) headerFromDomain = match[1].toLowerCase();
      break;
    }
  }

  // Check 1: Display name contains different domain/brand
  const displayNameDomainMatch = displayName.match(/@([\w.-]+\.\w+)/);
  if (displayNameDomainMatch) {
    const displayDomain = displayNameDomainMatch[1].toLowerCase();
    if (displayDomain !== emailDomain) {
      riskScore += 35;
      issues.push(`Display name shows ${displayDomain} but email is from ${emailDomain}`);
    }
  }

  // Check 2: Display name impersonates known brands
  const knownBrands = [
    'paypal', 'microsoft', 'apple', 'amazon', 'google', 'facebook',
    'meta', 'netflix', 'bank of america', 'wells fargo', 'chase',
    'irs', 'fedex', 'ups', 'dhl'
  ];
  
  const displayLower = displayName.toLowerCase();
  for (const brand of knownBrands) {
    if (displayLower.includes(brand) && !emailDomain?.includes(brand)) {
      riskScore += 40;
      issues.push(`Display name mentions "${brand}" but domain doesn't match`);
      break;
    }
  }

  // Check 3: Reply-To mismatch
  if (email.replyTo && email.replyTo.length > 0) {
    const replyToAddress = email.replyTo[0];
    if (replyToAddress !== fromAddress) {
      const replyToDomain = replyToAddress.split("@")[1]?.toLowerCase();
      if (replyToDomain !== emailDomain) {
        riskScore += 25;
        issues.push(`Reply-To address (${replyToDomain}) differs from sender domain`);
      }
    }
  }

  // Check 4: Generic suspicious patterns
  if (/\b(noreply|no-reply|donotreply)\b/i.test(fromAddress)) {
    // These are actually common for legitimate automated emails, so low score
    riskScore += 3;
  }

  return {
    riskScore,
    issues,
    displayName,
    emailDomain,
    headerFromDomain,
  };
}

/* ================================
   URL & LINK ANALYSIS
   ================================ */

export function analyzeLinks(htmlBody, body, fromDomain) {
  if (!htmlBody && !body) {
    return { riskScore: 0, issues: [], urls: [] };
  }

  const issues = [];
  let riskScore = 0;
  const urls = [];

  // Extract URLs from HTML and plain text
  const urlRegex = /https?:\/\/[^\s<>"]+/gi;
  const foundUrls = new Set();
  
  if (htmlBody) {
    const matches = htmlBody.match(urlRegex);
    if (matches) matches.forEach(url => foundUrls.add(url));
  }
  
  if (body) {
    const matches = body.match(urlRegex);
    if (matches) matches.forEach(url => foundUrls.add(url));
  }

  foundUrls.forEach(url => {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.toLowerCase();
      urls.push({ url, domain });

      // Check 1: IP address instead of domain
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
        riskScore += 30;
        issues.push(`Link uses IP address instead of domain: ${domain}`);
      }

      // Check 2: Risky TLDs
      const tld = domain.substring(domain.lastIndexOf('.'));
      if (CONFIG.RISKY_TLDs.includes(tld)) {
        riskScore += 20;
        issues.push(`Suspicious domain extension: ${domain}`);
      }

      // Check 3: URL shorteners (can hide destination)
      const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
      if (shorteners.some(s => domain.includes(s))) {
        riskScore += 15;
        issues.push('Email contains shortened URLs');
      }

      // Check 4: Domain doesn't match sender
      if (fromDomain && !domain.includes(fromDomain) && !fromDomain.includes(domain)) {
        // This is common in legitimate emails, so low score
        riskScore += 5;
      }

      // Check 5: Homograph attack (lookalike domains)
      if (/[а-яА-Я]/.test(domain) || /[^\x00-\x7F]/.test(domain)) {
        riskScore += 35;
        issues.push(`Suspicious characters in domain: ${domain}`);
      }

    } catch (e) {
      // Invalid URL
      riskScore += 10;
      issues.push('Malformed URL detected');
    }
  });

  return { riskScore, issues, urls };
}

/* ================================
   CONTENT ANALYSIS
   ================================ */

export function analyzeContent(subject, body) {
  const issues = [];
  let riskScore = 0;

  const fullText = `${subject} ${body}`.toLowerCase();

  // Check 1: Urgency/pressure tactics
  const urgencyCount = CONFIG.URGENCY_KEYWORDS.filter(keyword => 
    fullText.includes(keyword)
  ).length;

  if (urgencyCount >= 3) {
    riskScore += 25;
    issues.push('Multiple urgency/pressure tactics detected');
  } else if (urgencyCount >= 1) {
    riskScore += 10;
    issues.push('Urgency language detected');
  }

  // Check 2: Requests for sensitive info
  const sensitivePatterns = [
    /\b(password|ssn|social security|credit card|bank account|pin)\b/i,
    /\b(verify.*account|confirm.*identity|update.*payment)\b/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(fullText)) {
      riskScore += 30;
      issues.push('Requests sensitive information');
      break;
    }
  }

  // Check 3: Poor grammar/spelling (common in phishing)
  const grammarIssues = [
    /\b(kindly|do the needful|revert back)\b/i, // Non-native English patterns
    /[A-Z]{5,}/, // EXCESSIVE CAPS
  ];

  if (grammarIssues.some(pattern => pattern.test(fullText))) {
    riskScore += 8;
    issues.push('Unusual language patterns');
  }

  return { riskScore, issues };
}

/* ================================
   ATTACHMENT ANALYSIS
   ================================ */

export function analyzeAttachments(attachments) {
  if (!attachments || attachments.length === 0) {
    return { riskScore: 0, issues: [] };
  }

  const issues = [];
  let riskScore = 0;

  const riskyExtensions = [
    '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js',
    '.jar', '.zip', '.rar', '.iso', '.msi'
  ];

  const macroExtensions = ['.doc', '.xls', '.ppt', '.docm', '.xlsm', '.pptm'];

  for (const attachment of attachments) {
    const name = attachment.name?.toLowerCase() || '';

    // Check for risky file types
    for (const ext of riskyExtensions) {
      if (name.endsWith(ext)) {
        riskScore += 40;
        issues.push(`Dangerous attachment type: ${attachment.name}`);
        break;
      }
    }

    // Check for macro-enabled documents
    for (const ext of macroExtensions) {
      if (name.endsWith(ext)) {
        riskScore += 20;
        issues.push(`Macro-enabled document: ${attachment.name}`);
        break;
      }
    }

    // Check for double extensions
    if (/\.\w+\.\w+$/.test(name)) {
      riskScore += 25;
      issues.push(`Double extension detected: ${attachment.name}`);
    }
  }

  return { riskScore, issues };
}

/* ================================
   SENDER HISTORY CHECK
   ================================ */

export async function checkSenderHistory(senderEmail) {
  // Check if user has interacted with this sender before
  // In production, this would query Graph API for sent items
  // For now, use simple localStorage cache
  
  try {
    const trusted = JSON.parse(localStorage.getItem(CONFIG.TRUSTED_SENDERS_KEY) || '[]');
    
    if (trusted.includes(senderEmail.toLowerCase())) {
      return {
        isKnown: true,
        riskScore: -15, // Negative = reduces risk
        note: 'Previously contacted sender',
      };
    }

    return {
      isKnown: false,
      riskScore: 10,
      note: 'Unknown sender',
    };
  } catch {
    return { isKnown: false, riskScore: 0, note: 'Unable to check history' };
  }
}

export function markSenderTrusted(senderEmail) {
  try {
    const trusted = JSON.parse(localStorage.getItem(CONFIG.TRUSTED_SENDERS_KEY) || '[]');
    if (!trusted.includes(senderEmail.toLowerCase())) {
      trusted.push(senderEmail.toLowerCase());
      localStorage.setItem(CONFIG.TRUSTED_SENDERS_KEY, JSON.stringify(trusted));
    }
  } catch (e) {
    console.error('[Phisherman] Failed to save trusted sender:', e);
  }
}

/* ================================
   DOMAIN INTELLIGENCE
   ================================ */

export async function enrichDomainAge(domain) {
  // THIS MUST BE IMPLEMENTED SERVER-SIDE IN PRODUCTION
  // Example endpoint that queries WHOIS or threat intelligence APIs
  
  try {
    const res = await fetch(`https://your-backend.example/api/domain-intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });

    if (!res.ok) return null;
    
    const data = await res.json();
    // Expected: { daysOld: number, threatIntelligence: { malicious: boolean, reputation: number } }
    
    let riskScore = 0;
    const issues = [];

    if (data.daysOld < CONFIG.DOMAIN_AGE_CRITICAL_DAYS) {
      riskScore += 30;
      issues.push(`Very new domain (${data.daysOld} days old)`);
    } else if (data.daysOld < CONFIG.DOMAIN_AGE_SUSPICIOUS_DAYS) {
      riskScore += 15;
      issues.push(`Recently registered domain (${data.daysOld} days old)`);
    }

    if (data.threatIntelligence?.malicious) {
      riskScore += 50;
      issues.push('Domain flagged in threat intelligence feeds');
    }

    return { ...data, riskScore, issues };
  } catch (error) {
    console.warn('[Phisherman] Domain intelligence unavailable:', error);
    return null;
  }
}

/* ================================
   FULL ANALYSIS PIPELINE
   ================================ */

export async function analyzeCurrentMessage() {
  try {
    // Fetch email data
    const email = await getCurrentEmail();
    const graphData = await getCurrentEmailHeaders();

    if (!email) {
      throw new Error('Unable to retrieve email data');
    }

    const headers = graphData?.internetMessageHeaders || [];
    const fromDomain = email.from.address?.split("@")[1];

    // Run all analysis modules in parallel
    const [
      headerAnalysis,
      spoofing,
      links,
      content,
      attachments,
      senderHistory,
      domainIntel,
    ] = await Promise.all([
      Promise.resolve(analyzeHeaders(headers)),
      Promise.resolve(detectSpoofing(email, headers)),
      Promise.resolve(analyzeLinks(email.htmlBody, email.body, fromDomain)),
      Promise.resolve(analyzeContent(email.subject, email.body)),
      Promise.resolve(analyzeAttachments(email.attachments)),
      checkSenderHistory(email.from.address),
      fromDomain ? enrichDomainAge(fromDomain) : Promise.resolve(null),
    ]);

    // Aggregate risk score
    const totalRiskScore = 
      headerAnalysis.riskScore +
      spoofing.riskScore +
      links.riskScore +
      content.riskScore +
      attachments.riskScore +
      senderHistory.riskScore +
      (domainIntel?.riskScore || 0);

    // Aggregate all issues
    const allIssues = [
      ...headerAnalysis.issues,
      ...spoofing.issues,
      ...links.issues,
      ...content.issues,
      ...attachments.issues,
      ...(domainIntel?.issues || []),
    ];

    // Determine verdict and confidence
    let verdict, confidence, explanation;
    
    if (totalRiskScore >= 80) {
      verdict = 'phishing';
      confidence = 'high';
      explanation = 'Multiple critical security indicators detected';
    } else if (totalRiskScore >= 50) {
      verdict = 'suspicious';
      confidence = 'medium';
      explanation = 'Several concerning patterns identified';
    } else if (totalRiskScore >= 25) {
      verdict = 'caution';
      confidence = 'low';
      explanation = 'Some minor risk factors present';
    } else {
      verdict = 'clean';
      confidence = totalRiskScore < 0 ? 'high' : 'medium';
      explanation = 'No significant threats detected';
    }

    return {
      verdict,
      confidence,
      riskScore: Math.max(0, totalRiskScore), // Floor at 0
      explanation,
      timestamp: new Date().toISOString(),
      email: {
        subject: email.subject,
        from: email.from,
        to: email.to,
        timestamp: email.dateTimeCreated,
      },
      analysis: {
        headers: headerAnalysis,
        spoofing,
        links,
        content,
        attachments,
        senderHistory,
        domainIntel,
      },
      issues: allIssues,
      recommendations: generateRecommendations(verdict, allIssues),
    };

  } catch (error) {
    console.error('[Phisherman] Analysis failed:', error);
    return {
      verdict: 'error',
      confidence: 'none',
      riskScore: 0,
      explanation: `Analysis failed: ${error.message}`,
      timestamp: new Date().toISOString(),
      issues: [],
      recommendations: ['Unable to analyze this message. Exercise caution.'],
    };
  }
}

/* ================================
   RECOMMENDATIONS
   ================================ */

function generateRecommendations(verdict, issues) {
  const recommendations = [];

  if (verdict === 'phishing') {
    recommendations.push('❌ Do not click any links or download attachments');
    recommendations.push('❌ Do not reply or provide any information');
    recommendations.push('⚠️ Report this email to your IT security team');
    recommendations.push('🗑️ Delete this email immediately');
  } else if (verdict === 'suspicious') {
    recommendations.push('⚠️ Verify sender identity through a separate channel');
    recommendations.push('⚠️ Hover over links to inspect URLs before clicking');
    recommendations.push('⚠️ Do not download attachments unless verified');
  } else if (verdict === 'caution') {
    recommendations.push('ℹ️ Verify sender if unexpected');
    recommendations.push('ℹ️ Inspect links before clicking');
  } else {
    recommendations.push('✅ Email appears legitimate');
    if (issues.length > 0) {
      recommendations.push('ℹ️ Minor anomalies detected but likely safe');
    }
  }

  return recommendations;
}

/* ================================
   EXPORT REPORT
   ================================ */

export function generateAnalysisReport(analysisResult) {
  const { verdict, confidence, riskScore, explanation, issues, recommendations } = analysisResult;
  
  let report = `
PHISHERMAN ARES - EMAIL SECURITY ANALYSIS
==========================================

VERDICT: ${verdict.toUpperCase()} (Confidence: ${confidence})
Risk Score: ${riskScore}/100

${explanation}

ISSUES DETECTED (${issues.length}):
${issues.length > 0 ? issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') : 'None'}

RECOMMENDATIONS:
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---
Analyzed: ${analysisResult.timestamp}
From: ${analysisResult.email.from.name} <${analysisResult.email.from.address}>
Subject: ${analysisResult.email.subject}
`;

  return report.trim();
}
