const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Base Oracle Cloud URL
const BASE_URL = "https://egue-dev12.fa.us2.oraclecloud.com/hcmUI/CandidateExperience";

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`🔹 Request received: ${req.method} ${req.url} from ${req.headers.host}`);
  next();
});

// Proxy handler for all requests
app.all("/*", async (req, res) => {
  try {
    const originalPath = req.path || "";
    const queryString = new URLSearchParams(req.query).toString();
    const targetUrl = `${BASE_URL}${originalPath}${queryString ? `?${queryString}` : ""}`;

    console.log(`🔹 Proxying request to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: { "ora-irc-vanity-domain": "Y" },
      redirect: "manual",
    });

    // Extract response details
    const bodyText = await response.text();
    const status = response.status;
    const contentType = response.headers.get("Content-Type") || "text/html";
    let location = response.headers.get("Location") || "";

    // Rewrite redirect location if necessary
    if (location.startsWith(BASE_URL)) {
  const relativePath = location.replace(BASE_URL, ""); // Keep only the path
  location = `http://work.radiantglobaltech.com${relativePath}`; // Ensure correct path
}
//location="http://work.radiantglobaltech.com/en/sites/CX_90008";

    console.log(`🔹 Final Redirect Location: ${location || "None"}`);

    // Send response
    res.status(status).set({
      "Content-Type": contentType,
      ...(location && { Location: location }), // Include Location header only if needed
    }).send(bodyText);

  } catch (err) {
    console.error("❌ Error proxying to Oracle:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
