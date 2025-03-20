export const handler = async (event) => {
// 1) Identify the domain the request came in on: 
const domainName = event.headers?.host || ""; 

// 2) The path requested by the user 
const originalPath = event.path || "/";

// 3) The query parameters 
const queryParameters = event.queryStringParameters || {}; 
let queryString = ""; 
const qpKeys = Object.keys(queryParameters); 
if (qpKeys.length > 0) { 
queryString = "?" + qpKeys
.map((param) => `${param}=${encodeURIComponent(queryParameters[param])}`) .join("&"); } 

// 4) Oracle Recruiting Cloud base URL
 const ORC_BASE = "https://egue-dev12.fa.us2.oraclecloud.com/hcmUI/CandidateExperience";
 
// 5) Define your group domain and sub-brand domains
 const GROUP_DOMAIN = "work.radiantglobaltech.com"; 
 const SUB_BRAND_DOMAINS = [ "campus.vision-vanity.com",
 "jobs.vision-vanity.com", ];
 
// 6) Mapping from subdomains to custom paths 
const subdomainPaths = { "campus.vision-vanity.com": "/en/sites/CX_1042",
 "jobs.vision-vanity.com": "/en/sites/CX_1002", };
 
// 7) Mapping from site codes to subdomains
 const cxToDomainMap = { 
 CX_1042: "campus.vision-vanity.com", 
 CX_1002: "jobs.vision-vanity.com", };
 
// Helper: Build a 301 redirect response
 const buildRedirect = (locationUrl) => 
 ({ statusCode: 301, 
 headers: { Location: locationUrl,
 "Content-Type": "text/html", }, 
 body: `<html><body>Redirecting to <a href="${locationUrl}">${locationUrl}</a></body></html>`, });
 


 if (SUB_BRAND_DOMAINS.includes(domainName)) { 
 const customPath = subdomainPaths[domainName]; 
 // if path starts with customPath, proxy to Oracle 
 // otherwise, redirect to the domain with the custom path mapped to the site 
 if (originalPath.startsWith(customPath)) { 
 return await proxyToOracle({ 
 oracleBaseUrl: ORC_BASE, 
 path: originalPath,
queryString, 
originatingDomainName: domainName, }); }
 else { 
// redirect to the domain with the custom path mapped to the site 
const newUrl = `https://${domainName}${customPath}`; 
return buildRedirect(newUrl); 
}
}


if (domainName === GROUP_DOMAIN) { 
// Example path: /en/sites/CX_1 => redirect to careers.bmw.com/en/sites/CX_1 
const match = originalPath.match(/(CX_[0-9]+)/); 
if (match) { 
const cxCode = match[1]; // e.g. "CX_1" 
const newDomain = cxToDomainMap[cxCode];
 if (newDomain) { 
 const newUrl = `https://${newDomain}${originalPath}${queryString}`; 
 return buildRedirect(newUrl); 
 } }
 // If no CX match, proxy to Oracle 
 return await proxyToOracle({ oracleBaseUrl: ORC_BASE,
 path: originalPath, 
 queryString, 
 originatingDomainName: domainName, }); }


return await proxyToOracle({ 
oracleBaseUrl: ORC_BASE,
 path: originalPath,
 queryString,
 originatingDomainName: domainName, }); };

 async function proxyToOracle({ 
 oracleBaseUrl,
 path,
 queryString,
 originatingDomainName, })
 { 
 const targetUrl = oracleBaseUrl + path + queryString;
try { 
// In a production scenario, handle other HTTP methods, request body, etc.
 
const response = await fetch(targetUrl, { 
headers: { "ora-irc-vanity-domain": "Y", },
 redirect: "manual", // handle 3xx ourselves });
const status = response.status; 
const contentType = response.headers.get("Content-Type") || "text/html";

let location = response.headers.get("Location") || "";
 if (location.startsWith(oracleBaseUrl)) { 
 // Replace Oracle domain with the user's domain
 location = location.replace( oracleBaseUrl, `https://${originatingDomainName}` ); }
const bodyText = await response.text();
return { statusCode: status,
 headers: { "Content-Type": contentType, 
Location: location, // may be empty if no redirect 
}, 
body: bodyText, }; } catch (err) {
console.error("Error proxying to Oracle:", err); 
return { 
statusCode: 500,
 headers: { "Content-Type": "text/plain" },
 body: "Internal Server Error", }; 
 } }
