/**
 * Ultralight i18n. No dependencies, no runtime cost beyond a Map lookup.
 * Dictionaries live in this file; add keys as you translate more surfaces.
 * Missing keys fall back to the key string itself so a partial translation
 * pass doesn't break the app.
 */

export type Lang = 'tr' | 'en';

export const AVAILABLE_LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

type Dict = Record<string, string>;

const TR: Dict = {
  // Nav
  'nav.home': 'Founder Home',
  'nav.inbox': 'Gelen kutusu',
  'nav.dashboard': 'Dashboard',
  'nav.issues': 'Issue\'lar',
  'nav.views': 'Görünümler',
  'nav.cycles': 'Cycle\'lar',
  'nav.roadmap': 'Roadmap',
  'nav.projects': 'Projeler',
  'nav.portfolios': 'Portföyler',
  'nav.myTasks': 'Görevlerim',
  'nav.workload': 'Yük',
  'nav.insights': 'Insights',
  'nav.bugs': 'Bug\'lar',
  'nav.product': 'Ürün',
  'nav.timesheet': 'Zaman çizelgesi',
  'nav.teams': 'Ekipler',
  'nav.leaderboard': 'Skor tablosu',
  'nav.assets': 'Varlıklar',
  'nav.employees': 'Çalışanlar',
  'nav.company': 'Şirket',
  'nav.portals': 'Portallar',
  'nav.audit': 'Audit log',
  'nav.admin': 'Admin',
  'nav.chief': 'Chief of Staff',
  'nav.agent': 'Agent runs',
  'nav.meetings': 'Toplantı notları',
  'nav.chat': 'Chat',
  'nav.docs': 'Docs',
  'nav.automations': 'Otomasyonlar',
  'nav.forms': 'Formlar',
  'nav.whiteboards': 'Panolar',
  'nav.desk': 'Service Desk',
  'nav.templates': 'Templates',
  'nav.integrations': 'Entegrasyonlar',
  'nav.apiTokens': 'API tokenlar',
  'nav.settings': 'Ayarlar',
  'nav.notificationSettings': 'Bildirim ayarları',

  // Common
  'common.save': 'Kaydet',
  'common.cancel': 'İptal',
  'common.delete': 'Sil',
  'common.new': 'Yeni',
  'common.edit': 'Düzenle',
  'common.search': 'Ara',
  'common.loading': 'Yükleniyor…',
  'common.empty': 'Kayıt yok.',
  'common.language': 'Dil',

  // Cluster captions
  'cluster.home': 'Ana',
  'cluster.work': 'İş',
  'cluster.revenue': 'Gelir',
  'cluster.strategy': 'Strateji',
  'cluster.ops': 'Ops',
  'cluster.ai': 'AI',
};

const EN: Dict = {
  'nav.home': 'Founder Home',
  'nav.inbox': 'Inbox',
  'nav.dashboard': 'Dashboard',
  'nav.issues': 'Issues',
  'nav.views': 'Views',
  'nav.cycles': 'Cycles',
  'nav.roadmap': 'Roadmap',
  'nav.projects': 'Projects',
  'nav.portfolios': 'Portfolios',
  'nav.myTasks': 'My tasks',
  'nav.workload': 'Workload',
  'nav.insights': 'Insights',
  'nav.bugs': 'Bugs',
  'nav.product': 'Product',
  'nav.timesheet': 'Timesheet',
  'nav.teams': 'Teams',
  'nav.leaderboard': 'Leaderboard',
  'nav.assets': 'Assets',
  'nav.employees': 'Employees',
  'nav.company': 'Company',
  'nav.portals': 'Portals',
  'nav.audit': 'Audit log',
  'nav.admin': 'Admin',
  'nav.chief': 'Chief of Staff',
  'nav.agent': 'Agent runs',
  'nav.meetings': 'Meeting notes',
  'nav.chat': 'Chat',
  'nav.docs': 'Docs',
  'nav.automations': 'Automations',
  'nav.forms': 'Forms',
  'nav.whiteboards': 'Whiteboards',
  'nav.desk': 'Service Desk',
  'nav.templates': 'Templates',
  'nav.integrations': 'Integrations',
  'nav.apiTokens': 'API tokens',
  'nav.settings': 'Settings',
  'nav.notificationSettings': 'Notification settings',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.new': 'New',
  'common.edit': 'Edit',
  'common.search': 'Search',
  'common.loading': 'Loading…',
  'common.empty': 'Nothing here.',
  'common.language': 'Language',

  'cluster.home': 'Home',
  'cluster.work': 'Work',
  'cluster.revenue': 'Revenue',
  'cluster.strategy': 'Strategy',
  'cluster.ops': 'Ops',
  'cluster.ai': 'AI',
};

const DICTS: Record<Lang, Dict> = { tr: TR, en: EN };

const STORAGE_KEY = 'wh:lang';

export function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'tr' || stored === 'en') return stored;
  } catch { /* noop */ }
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) return 'en';
  return 'tr';
}

export function saveLang(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* noop */ }
}

/** Translate `key` into `lang`. Falls back to `key` if the key is missing. */
export function translate(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] ?? key;
}
