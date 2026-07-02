<?php
declare(strict_types=1);

$twLandingFile = __DIR__ . '/index.html';
$globalUrl = 'https://pgctvwer.com/';

header('Vary: CF-IPCountry, Accept-Language');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function sanitize_region_override(?string $value): ?string
{
    if ($value === null) {
        return null;
    }

    $normalized = strtolower(trim($value));
    if (in_array($normalized, ['tw', 'taiwan'], true)) {
        return 'tw';
    }
    if (in_array($normalized, ['global', 'intl', 'international', 'overseas'], true)) {
        return 'global';
    }

    return null;
}

function detect_region(): string
{
    $countryHeaders = [
        'HTTP_CF_IPCOUNTRY',
        'GEOIP_COUNTRY_CODE',
        'HTTP_X_COUNTRY_CODE',
        'HTTP_X_APPENGINE_COUNTRY',
        'HTTP_CF_COUNTRY',
    ];

    foreach ($countryHeaders as $header) {
        if (!empty($_SERVER[$header])) {
            $country = strtoupper(trim((string) $_SERVER[$header]));
            if ($country === 'TW') {
                return 'tw';
            }
            if ($country !== '' && $country !== 'XX' && $country !== 'T1') {
                return 'global';
            }
        }
    }

    $acceptLanguage = strtolower((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''));
    if (
        strpos($acceptLanguage, 'zh-tw') !== false ||
        strpos($acceptLanguage, 'zh-hant-tw') !== false
    ) {
        return 'tw';
    }

    return 'global';
}

function build_redirect_url(string $baseUrl): string
{
    $params = $_GET;
    unset($params['force_region']);

    if (!$params) {
        return $baseUrl;
    }

    $separator = str_contains($baseUrl, '?') ? '&' : '?';
    return $baseUrl . $separator . http_build_query($params);
}

$forcedRegion = sanitize_region_override($_GET['force_region'] ?? null);
$region = $forcedRegion ?? detect_region();

header('X-Geo-Route: ' . $region);

if ($region === 'tw' && is_file($twLandingFile)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($twLandingFile);
    exit;
}

header('Location: ' . build_redirect_url($globalUrl), true, 302);
exit;
