// src/config/fieldSalesConfig.js
// Configuration constants for STARK STEEL SalesDoor Enterprise Field Sales

export const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)', native: 'English' },
  { code: 'ml-IN', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' }
];

export const DEFAULT_VOICE_LANGUAGE = 'en-IN';

export const LOST_ORDER_REASONS = [
  'Price',
  'Stock',
  'Delivery time',
  'Competitor',
  'Dealer postponed',
  'Other'
];

export const ORDER_PROMISED_WATCH_DAYS = 7;
export const QUOTATION_STAGNANT_DAYS = 3;
export const DEALER_INACTIVE_DAYS = 7;
export const GPS_ACCURACY_THRESHOLD_METERS = 100;
export const GPS_DATA_RETENTION_DAYS = 90;

export const DEALER_HEALTH_THRESHOLDS = {
  HEALTHY: {
    maxDaysSinceVisit: 7,
    maxOpenIssues: 0,
    minMonthlyOrders: 1
  },
  WATCH: {
    maxDaysSinceVisit: 14,
    maxOpenIssues: 2,
    minMonthlyOrders: 0
  }
};

export function calculateDealerHealth(dealer, visits = [], orders = [], issues = []) {
  const now = new Date();
  
  // Find latest visit
  let lastVisitDate = null;
  if (visits && visits.length > 0) {
    const sorted = [...visits].sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));
    lastVisitDate = new Date(sorted[0].completedAt || sorted[0].createdAt);
  } else if (dealer.lastVisitDate) {
    lastVisitDate = new Date(dealer.lastVisitDate);
  }

  const daysSinceVisit = lastVisitDate ? Math.floor((now - lastVisitDate) / (1000 * 60 * 60 * 24)) : 999;
  const openIssuesCount = issues.filter(i => i.status === 'Open' || i.status === 'Pending').length;
  const monthlyOrdersCount = orders.filter(o => {
    const d = new Date(o.completedAt || o.createdAt || 0);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (daysSinceVisit <= DEALER_HEALTH_THRESHOLDS.HEALTHY.maxDaysSinceVisit && openIssuesCount === 0 && monthlyOrdersCount >= 1) {
    return { status: 'Healthy', color: 'emerald', daysSinceVisit, monthlyOrdersCount, openIssuesCount };
  }
  if (daysSinceVisit <= DEALER_HEALTH_THRESHOLDS.WATCH.maxDaysSinceVisit && openIssuesCount <= DEALER_HEALTH_THRESHOLDS.WATCH.maxOpenIssues) {
    return { status: 'Watch', color: 'amber', daysSinceVisit, monthlyOrdersCount, openIssuesCount };
  }
  return { status: 'At risk', color: 'rose', daysSinceVisit, monthlyOrdersCount, openIssuesCount };
}

