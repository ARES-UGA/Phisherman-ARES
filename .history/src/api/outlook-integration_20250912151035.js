// outlook-integration.js
// Handles Outlook email access via Microsoft Graph API

import fetch from "node-fetch";

const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

export async function getUserEmails(accessToken) {
  // Requires Microsoft Graph OAuth2 token
  if (!accessToken) {
    throw new Error("Access token required.");
  }

  try {
    const response = await fetch(`${GRAPH_API_URL}/me/messages`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    return data.value || [];
  } catch (err) {
    console.error("Failed to fetch Outlook emails:", err);
    return [];
  }
}

export async function sendAlertEmail(accessToken, subject, body) {
  if (!accessToken) {
    throw new Error("Access token required.");
  }

  const email = {
    message: {
      subject,
      body: {
        contentType: "Text",
        content: body,
      },
      toRecipients: [
        {
          emailAddress: { address: "user@example.com" },
        },
      ],
    },
  };

  try {
    const response = await fetch(`${GRAPH_API_URL}/me/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email),
    });

    if (!response.ok) throw new Error("Failed to send email");
    return true;
  } catch (err) {
    console.error("Email alert failed:", err);
    return false;
  }
}
