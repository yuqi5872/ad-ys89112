const GLOBAL_URL = 'https://pgctvwer.com/';
const TAIWAN_HOSTS = new Set(['qwe11a3.site', 'www.qwe11a3.site']);
const BYPASS_PREFIXES = ['/img/', '/mascot/', '/functions/'];
const BYPASS_FILES = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml']);

function sanitizeForcedRegion(value) {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'tw' || normalized === 'taiwan') return 'tw';
  if (
    normalized === 'global' ||
    normalized === 'intl' ||
    normalized === 'international' ||
    normalized === 'overseas'
  ) {
    return 'global';
  }
  return null;
}

function isAssetRequest(pathname) {
  if (BYPASS_FILES.has(pathname)) return true;
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function detectRegion(request) {
  const country = (request.cf && request.cf.country ? request.cf.country : '').toUpperCase();
  if (country === 'TW') return 'tw';
  if (country) return 'global';

  const acceptLanguage = (request.headers.get('accept-language') || '').toLowerCase();
  if (acceptLanguage.includes('zh-tw') || acceptLanguage.includes('zh-hant-tw')) {
    return 'tw';
  }

  return 'global';
}

function buildRedirectUrl(requestUrl) {
  const nextUrl = new URL(GLOBAL_URL);
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== 'force_region') nextUrl.searchParams.set(key, value);
  });
  nextUrl.hash = requestUrl.hash;
  return nextUrl.toString();
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const forcedRegion = sanitizeForcedRegion(url.searchParams.get('force_region'));

  if (forcedRegion === 'global') {
    return Response.redirect(buildRedirectUrl(url), 302);
  }

  if (forcedRegion === 'tw') {
    const response = await next();
    response.headers.set('X-Geo-Route', 'tw-forced');
    response.headers.set('Vary', 'CF-IPCountry, Accept-Language');
    return response;
  }

  if (isAssetRequest(url.pathname)) {
    return next();
  }

  const isTaiwanHost = TAIWAN_HOSTS.has(url.hostname);
  const isEntryPath = url.pathname === '/' || url.pathname === '/index.html';

  if (isTaiwanHost && isEntryPath) {
    const region = detectRegion(request);
    if (region !== 'tw') {
      return Response.redirect(buildRedirectUrl(url), 302);
    }
  }

  const response = await next();
  response.headers.set('X-Geo-Route', isTaiwanHost && isEntryPath ? 'tw' : 'pass');
  response.headers.set('Vary', 'CF-IPCountry, Accept-Language');
  return response;
}
