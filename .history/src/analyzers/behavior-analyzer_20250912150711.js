// behavioral-analyzer.js
// Looks at communication patterns and anomalies

export async function analyzeBehavioralPatterns(email, userProfile) {
  const results = {
    anomalyDetected: false,
    unusualSender: false,
    unusualTime: false,
    communicationDeviation: false,
    riskScore: 0,
  };

  try {
    // 1. Unusual sender (stub: compare to whitelist)
    if (
      userProfile.trustedSenders &&
      !userProfile.trustedSenders.includes(email.from)
    ) {
      results.unusualSender = true;
      results.riskScore += 2;
    }

    // 2. Odd sending time (stub)
    const hour = new Date(email.date).getHours();
    if (hour < 6 || hour > 22) {
      results.unusualTime = true;
      results.riskScore += 1;
    }

    // 3. Deviation from writing style (placeholder for AI analyzer)
    if (Math.random() > 0.8) {
      // dummy heuristic
      results.communicationDeviation = true;
      results.riskScore += 2;
    }

    results.anomalyDetected =
      results.unusualSender ||
      results.unusualTime ||
      results.communicationDeviation;
  } catch (err) {
    console.error("Behavioral analysis failed:", err);
  }

  return results;
}
