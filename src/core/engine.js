// engine.js

import { analyzeEmailContent } from "../analyzers/email-analyzer.js";
import { analyzeAttachment } from "../analyzers/attachment-analyzer.js";
import { analyzeBehavioralPatterns } from "../analyzers/behavioral-analyzer.js";

const WEIGHTS = {
  content: 0.45,
  behavioral: 0.35,
  attachment: 0.20,
};

export async function processEmail(email, userProfile = {}) {
  const report = {
    emailId: email.id || null,
    from: email.from,
    subject: email.subject,
    analyzers: [],
    finalScore: 0,
    riskLevel: "low",
    explanation: [],
  };

  try {
    // Run analyzers in parallel (faster + realistic)
    const analyzerPromises = [
      analyzeEmailContent(email),
      analyzeBehavioralPatterns(email, userProfile),
      ...(email.attachments?.map(f => analyzeAttachment(f)) || []),
    ];

    const results = await Promise.all(analyzerPromises);

    let weightedScore = 0;
    let weightSum = 0;

    for (const result of results) {
      report.analyzers.push(result);
      report.explanation.push(...result.signals);

      const weight = WEIGHTS[result.name] ?? 0.1;
      weightedScore += result.score * weight;
      weightSum += weight;
    }

    report.finalScore = weightSum > 0 ? Math.round(weightedScore / weightSum) : 0;

    // Risk classification (realistic SOC-style thresholds)
    if (report.finalScore >= 70) report.riskLevel = "high";
    else if (report.finalScore >= 40) report.riskLevel = "medium";
    else report.riskLevel = "low";

  } catch (err) {
    console.error("Engine error:", err);
    report.error = err.message;
  }

  return report;
}
