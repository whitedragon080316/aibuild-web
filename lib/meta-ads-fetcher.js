// Meta Ads Insights fetcher — read-only (v1.5 minimum)
// Calls Graph API v21.0 /{ad_account_id}/insights and returns normalized JSON
// for the admin-ads dashboard.
//
// Env vars:
//   META_ACCESS_TOKEN  — long-lived system user token (read perm enough)
//   META_AD_ACCOUNT_ID — e.g. act_736408359703015 (default below)
//
// Usage:
//   const { fetchAdsInsights } = require('./meta-ads-fetcher');
//   const data = await fetchAdsInsights({ datePreset: 'last_14d' });

const META_API_VERSION = 'v21.0';
const VALID_PRESETS = new Set([
  'today', 'yesterday', 'this_week_mon_today', 'last_7d', 'last_14d',
  'last_28d', 'last_30d', 'last_90d', 'this_month', 'last_month',
]);

function getEnv() {
  return {
    token: process.env.META_ACCESS_TOKEN || '',
    accountId: process.env.META_AD_ACCOUNT_ID || 'act_736408359703015',
  };
}

function buildUrl({ accountId, token, datePreset, level }) {
  const fields = [
    'adset_name',
    'adset_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'cpc',
    'actions',
    'cost_per_action_type',
  ].join(',');
  const params = new URLSearchParams({
    fields,
    level,
    date_preset: datePreset,
    limit: '100',
    access_token: token,
  });
  return `https://graph.facebook.com/${META_API_VERSION}/${accountId}/insights?${params.toString()}`;
}

function pickAction(actions, type) {
  if (!Array.isArray(actions)) return 0;
  for (const a of actions) {
    if (a.action_type === type) return parseInt(a.value, 10) || 0;
  }
  return 0;
}

function normalizeRow(row) {
  const spend = parseFloat(row.spend) || 0;
  const impressions = parseInt(row.impressions, 10) || 0;
  const clicks = parseInt(row.clicks, 10) || 0;
  const ctr = parseFloat(row.ctr) || 0;
  const cpc = parseFloat(row.cpc) || 0;

  // Lead 優先順序：lead > onsite_conversion.lead_grouped > offsite_conversion.fb_pixel_lead
  const actions = row.actions || [];
  const leads =
    pickAction(actions, 'lead') ||
    pickAction(actions, 'onsite_conversion.lead_grouped') ||
    pickAction(actions, 'offsite_conversion.fb_pixel_lead') ||
    0;
  const lpViews = pickAction(actions, 'landing_page_view');

  const cpl = leads > 0 ? Math.round(spend / leads) : null;

  return {
    adset_id: row.adset_id || null,
    adset_name: row.adset_name || '(unknown)',
    campaign_name: row.campaign_name || '',
    spend: Math.round(spend * 100) / 100,
    impressions,
    clicks,
    ctr: Math.round(ctr * 100) / 100,
    cpc: Math.round(cpc * 100) / 100,
    leads,
    lp_views: lpViews,
    cpl,
  };
}

async function fetchAdsInsights({ datePreset = 'last_14d', level = 'adset' } = {}) {
  const { token, accountId } = getEnv();
  if (!token) {
    return {
      ok: false,
      reason: 'missing_token',
      message: '未設定 META_ACCESS_TOKEN 環境變數',
      data: null,
    };
  }
  if (!VALID_PRESETS.has(datePreset)) {
    return {
      ok: false,
      reason: 'invalid_preset',
      message: `不支援的 datePreset：${datePreset}`,
      data: null,
    };
  }

  const url = buildUrl({ accountId, token, datePreset, level });
  let raw;
  try {
    const resp = await fetch(url);
    raw = await resp.json();
  } catch (e) {
    return { ok: false, reason: 'network_error', message: e.message, data: null };
  }

  if (raw.error) {
    return {
      ok: false,
      reason: 'api_error',
      message: raw.error.message || 'Meta API error',
      code: raw.error.code,
      data: null,
    };
  }

  const rows = (raw.data || []).map(normalizeRow);

  // Aggregate
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const avgCPL = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : null;
  const avgCTR = totalImpressions > 0
    ? Math.round((totalClicks / totalImpressions) * 10000) / 100
    : 0;

  // Sort by spend desc by default
  rows.sort((a, b) => b.spend - a.spend);

  return {
    ok: true,
    accountId,
    datePreset,
    level,
    fetchedAt: new Date().toISOString(),
    summary: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalLeads,
      totalClicks,
      totalImpressions,
      avgCPL,
      avgCTR,
      adsetCount: rows.length,
    },
    rows,
  };
}

module.exports = { fetchAdsInsights };
