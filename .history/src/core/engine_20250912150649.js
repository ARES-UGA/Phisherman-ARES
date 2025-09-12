// engine.js
// Main detection engine that orchestrates analyzers & scoring

import { analyzeEmailContent } from "../analyzers/email-analyzer.js";
import { analyzeAttachment } from "../analyzers/attachment-analyzer.js";
import { analyzeBehavioralPatterns } from "../analyzers/behavioral-analyzer.js";

/**
 * Main function to process an incoming email
 * @param {Object} email - Parsed email object with headers, body, attachments, etc.
 * @param {Object} userProfile - User/organization profile for behavioral analysis
 */
export async function processEmail(email, userProfile = {}) {
  const report = {
    emailId: email.id || null,
    from: email.from,
    subject: email.subject,
    results: {},
    finalRiskScore: 0,
    riskLevel: "low",
  };

  try {
    // 1. Content analysis
    const contentResults = await analyzeEmailContent(email);
    report.results.content = contentResults;
    report.finalRiskScore += contentResults.riskScore;

    // 2. Attachment analysis
    if (email.attachments && email.attachments.length > 0) {
      report.results.attachments = [];
      for (const file of email.attachments) {
        const attachmentResults = await analyzeAttachment(file);
        report.results.attachments.push(attachmentResults);
        report.finalRiskScore += attachmentResults.riskScore;
      }
    }

    // 3. Behavioral analysis
    const behavioralResults = await analyzeBehavioralPatterns(
      email,
      userProfile
    );
    report.results.behavioral = behavioralResults;
    report.finalRiskScore += behavioralResults.riskScore;

    // 4. Final scoring → classify into risk levels
    if (report.finalRiskScore >= 8) {
      report.riskLevel = "high";
    } else if (report.finalRiskScore >= 4) {
      report.riskLevel = "medium";
    } else {
      report.riskLevel = "low";
    }
  } catch (err) {
    console.error("Engine failed while processing email:", err);
    report.error = err.message;
  }

  return report;
}

/**
 * Example: batch process emails (could be used by Outlook integration)
 */
export async function processEmailBatch(emails, userProfile) {
  const results = [];
  for (const email of emails) {
    const result = await processEmail(email, userProfile);
    results.push(result);
  }
  return results;
}
