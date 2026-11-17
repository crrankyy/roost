// A report-builder report as the roost-report skill builds it, cut down. The CLI's and the Worker's filing readers
// are both tested against this one page, so they cannot drift apart.
export const page = ({ kind = 'investigation', project = 'alpha', stream = '', date = '2026-11-17', title = 'Token expiry', body = '' } = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="report:kind" content="${kind}">
<meta name="report:project" content="${project}">
${stream ? `<meta name="report:stream" content="${stream}">\n` : ''}<meta name="report:date" content="${date}">
<link rel="stylesheet" href="/_fonts/v1/report-type.css">
<style>/* themes/nord.css */
:root { --canvas: light-dark(#eceff4, #2e3440); }</style>
<style>/* report.css */
:root[data-host] [data-slot="host-bar"] { display: none; }</style>
</head>
<body>
<div class="topbar" data-slot="host-bar"><div class="wrap">
  <span class="wordmark">${title}</span>
  <span class="meta"><button class="theme-toggle" type="button">Theme: System</button></span>
</div></div>
<header class="hero"><div class="wrap">
  <div class="hero-copy">
    <span class="eyebrow">Auth</span>
    <h1>Refresh tokens expire <em>early</em> &amp; silently</h1>
    <p class="lead">Tokens die after 50&nbsp;minutes, not 60, because the clock skew is subtracted twice.</p>
    <p class="hero-meta">payments-api · 17 November 2026</p>
  </div>
</div></header>
<main>${body}<img src="assets/chart.svg" alt=""><a href="/p/payments-api/r/2026-10-01-auth-plan/">Plan</a></main>
</body>
</html>
`;

/** What both readers must make of page() with its defaults. */
export const expected = {
  kind: 'investigation', project: 'alpha', stream: '', date: '2026-11-17', title: 'Token expiry',
  claim: 'Refresh tokens expire early & silently',
  lead: 'Tokens die after 50 minutes, not 60, because the clock skew is subtracted twice.', palette: 'nord',
};
