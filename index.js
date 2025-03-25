const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Constants
const ORC_BASE = "https://egue-dev12.fa.us2.oraclecloud.com/hcmUI/CandidateExperience";
const GROUP_DOMAIN = "careers.vision-vanity.com";
const SUB_BRAND_DOMAINS = ["campus.vision-vanity.com", "jobs.vision-vanity.com"];

const subdomainPaths = {
  "campus.vision-vanity.com": "/en/sites/CX_1042",
  "jobs.vision-vanity.com": "/en/sites/CX_1002",
};

const cxToDomainMap = {
  CX_1042: "campus.vision-vanity.com",
  CX_1002: "jobs.vision-vanity.com",
};

// Helper to build a redirect response
function buildRedirect(res, locationUrl) {
  res.status(301).header({ Location: locationUrl, 'Content-Type': 'text/html' })
     .send(`<html><body>Redirecting to <a href="${locationUrl}">${locationUrl}</a></body></html>`);
}

// Proxy to Oracle
async function proxyToOracle(req, res, oracleBaseUrl, path, queryString, originatingDomainName) {
  const targetUrl = oracleBaseUrl + path + queryString;
  try {
    const response = await fetch(targetUrl, {
      headers: { 'ora-irc-vanity-domain': 'Y' },
      redirect: 'manual',
    });

    let location = response.headers.get('Location') || '';
    if (location.startsWith(oracleBaseUrl)) {
      location = location.replace(oracleBaseUrl, `https://${originatingDomainName}`);
    }

    const bodyText = await response.text();
    res.status(response.status).header({
      'Content-Type': response.headers.get('Content-Type') || 'text/html',
      Location: location,
    }).send(bodyText);
  } catch (err) {
    console.error("Error proxying to Oracle:", err);
    res.status(500).send("Internal Server Error");
  }
}

// Main handler
app.all('*', async (req, res) => {
  const domainName = req.headers?.host || '';
  const originalPath = req.path || '/';
  const queryString = Object.keys(req.query).length > 0
    ? '?' + new URLSearchParams(req.query).toString()
    : '';

  if (SUB_BRAND_DOMAINS.includes(domainName)) {
    const customPath = subdomainPaths[domainName];
    if (originalPath.startsWith(customPath)) {
      return await proxyToOracle(req, res, ORC_BASE, originalPath, queryString, domainName);
    } else {
      return buildRedirect(res, `https://${domainName}${customPath}`);
    }
  }

  if (domainName === GROUP_DOMAIN) {
    const match = originalPath.match(/(CX_[0-9]+)/);
    if (match) {
      const cxCode = match[1];
      const newDomain = cxToDomainMap[cxCode];
      if (newDomain) {
        return buildRedirect(res, `https://${newDomain}${originalPath}${queryString}`);
      }
    }
    return await proxyToOracle(req, res, ORC_BASE, originalPath, queryString, domainName);
  }

  return await proxyToOracle(req, res, ORC_BASE, originalPath, queryString, domainName);
});

// Server setup
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
