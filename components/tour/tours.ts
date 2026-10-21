// What each first-visit tour says and points at.
//
// Targets are found at runtime, either by a data-tour anchor (`sel`) or by the
// visible text of a button/heading (`text`), so pages don't need special markup
// and a renamed button only drops that one step instead of breaking the tour.
// A step whose target isn't on screen (an empty page, an admin-only button…)
// is skipped automatically unless it sets `optional: false`.
//
// Bump a tour's `version` when its content changes meaningfully — everyone
// will see the new version once.

export interface TourTarget {
  sel?: string;
  text?: RegExp;
  // Match a page heading only (so a tab with the same text isn't picked).
  heading?: RegExp;
  // Where to search: the page content (default), the sidebar, the header, or anywhere.
  in?: 'main' | 'sidebar' | 'header' | 'document';
}

export interface TourStep {
  title: string;
  body: string;
  tip?: string;
  icon?: string;
  target?: TourTarget;
  placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  padding?: number;
  radius?: number;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
  adminOnly?: boolean;
  // Shown once ever (across every tour that includes it).
  onceKey?: string;
  optional?: boolean;
  nextLabel?: string;
  doneLabel?: string;
}

export interface Tour {
  id: string;
  version: number;
  label: string;
  steps: TourStep[];
}

export interface TourCtx {
  firstName: string;
  businessName: string;
  isAdmin: boolean;
}

export const WELCOME_TOUR_ID = 'welcome';

const main = (text: RegExp): TourTarget => ({ text });
const heading = (h: RegExp): TourTarget => ({ heading: h });
const sel = (s: string, where: TourTarget['in'] = 'main'): TourTarget => ({ sel: s, in: where });

// The tab row shared by every page in Sell, Finance and More — explained the
// first time any of them is opened.
const sectionTabs = (section: string, what: string): TourStep => ({
  title: `${section}, all in one place`,
  body: `These tabs switch between ${what}. Tapping “${section}” in the menu brings you back to the tab you used last.`,
  icon: 'fa-table-columns',
  target: sel('[data-tour="section-tabs"]'),
  onceKey: `section-tabs-${section}`,
  padding: 4,
});

const SELL = 'orders, your catalog, your public storefront, proposals and profit';
const FINANCE = 'reports, budgets, payroll and tax';
const MORE = 'projects, assets, automation, scanned documents, your team and the activity log';

const TOURS: Record<string, (c: TourCtx) => Omit<Tour, 'id'>> = {
  [WELCOME_TOUR_ID]: (c) => ({
    version: 1,
    label: 'Welcome',
    steps: [
      {
        title: `Welcome to Morniy, ${c.firstName}!`,
        body: `This is where you’ll run ${c.businessName}: invoices, receipts, orders, stock, profit and more. Here’s a 30-second look around.`,
        tip: 'You can skip this — and replay any page’s tour later with the ? button at the top.',
        icon: 'fa-hand-sparkles',
        nextLabel: 'Show me',
      },
      {
        title: 'Your business, your brand',
        body: 'Your logo and business name live here. Tap it to open Settings, where you add a logo, a brand colour and your bank details.',
        icon: 'fa-building',
        target: sel('[data-tour="brand"]', 'sidebar'),
        placement: 'right',
        desktopOnly: true,
      },
      {
        title: 'The everyday pages',
        body: 'Dashboard, Invoices, Receipts, Transactions and Clients — the things you’ll open most, always one tap away.',
        icon: 'fa-layer-group',
        target: sel('[data-tour="nav-primary"]', 'sidebar'),
        placement: 'right',
        desktopOnly: true,
      },
      {
        title: 'Everything else, grouped',
        body: 'Sell, Finance and More each open a page with tabs across the top — orders and your shop under Sell, reports and payroll under Finance.',
        icon: 'fa-table-columns',
        target: sel('[data-tour="nav-sections"]', 'sidebar'),
        placement: 'right',
        desktopOnly: true,
      },
      {
        title: 'Your menu',
        body: 'On your phone, everything lives behind this menu button: your everyday pages, plus Sell, Finance and More.',
        icon: 'fa-bars',
        target: sel('[data-tour="menu"]', 'header'),
        mobileOnly: true,
      },
      {
        title: 'Find anything fast',
        body: 'Search across clients, invoices, receipts and transactions from any page.',
        tip: 'On a keyboard, just press S.',
        icon: 'fa-magnifying-glass',
        target: sel('[data-tour="search"]', 'header'),
      },
      {
        title: 'Never miss a thing',
        body: 'New orders, payments that arrive, invoices that are paid — they all show up here as they happen.',
        icon: 'fa-bell',
        target: sel('[data-tour="notifications"]', 'header'),
      },
      {
        title: 'Help is always here',
        body: 'Each page gets a short tour the first time you open it. Tap this ? any time to see it again.',
        icon: 'fa-circle-question',
        target: sel('[data-tour="help"]', 'header'),
        doneLabel: 'Let’s go',
      },
    ],
  }),

  '/dashboard': () => ({
    version: 1,
    label: 'Dashboard',
    steps: [
      {
        title: 'Your daily overview',
        body: 'The dashboard sums up how the business is doing right now — money in, money out, and what needs attention.',
        icon: 'fa-gauge-high',
        target: heading(/^(Good (morning|afternoon|evening|day)|Welcome back)/i),
      },
      {
        title: 'Business health',
        body: 'A score and a few key numbers — spend, profit and what customers still owe — worked out from your transactions.',
        tip: 'It gets more accurate as you record more transactions.',
        icon: 'fa-brain',
        target: main(/^Intelligence$/i),
      },
      {
        title: 'What to do today',
        body: 'Overdue invoices, follow-ups and other things worth your attention, so nothing slips.',
        icon: 'fa-list-check',
        target: main(/^Today'?s Focus$/i),
      },
      {
        title: 'Shortcuts',
        body: 'Jump straight to the things you do most — create an invoice, record a transaction, issue a receipt.',
        icon: 'fa-bolt',
        target: main(/^Quick Actions$/i),
        doneLabel: 'Done',
      },
    ],
  }),

  '/invoices': () => ({
    version: 1,
    label: 'Invoices',
    steps: [
      {
        title: 'Bill your customers',
        body: 'Every invoice you send lives here, with its status — sent, part-paid, paid or overdue.',
        icon: 'fa-file-invoice',
        target: heading(/^Billing & Invoices$/i),
      },
      {
        title: 'Create an invoice',
        body: 'Pick a client, add items straight from your catalog, and send it by email or WhatsApp. Clients can pay online from the link.',
        tip: 'Picking items from your catalog keeps your stock and profit numbers right.',
        icon: 'fa-plus',
        target: main(/^Create Invoice$/i),
      },
      {
        title: 'Got a paper invoice?',
        body: 'Snap a photo and Morniy reads the details for you — no retyping.',
        icon: 'fa-camera',
        target: main(/^Snap$/i),
      },
      {
        title: 'Record payments as they come',
        body: 'Open any invoice to record a full or part payment. The balance, the receipt and your income all update together.',
        icon: 'fa-money-bill-wave',
        doneLabel: 'Got it',
      },
    ],
  }),

  '/receipts': () => ({
    version: 1,
    label: 'Receipts',
    steps: [
      {
        title: 'Proof of payment, done properly',
        body: 'Every receipt you issue is kept here — with your logo, ready to share as an image, a link or a printout.',
        icon: 'fa-receipt',
        target: heading(/^Receipts$/i),
      },
      {
        title: 'Issue a receipt',
        body: 'Add items from your catalog (stock goes down automatically) or from transactions you’ve recorded, then share it in one tap.',
        icon: 'fa-plus',
        target: main(/^New Receipt$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/transactions': () => ({
    version: 1,
    label: 'Transactions',
    steps: [
      {
        title: 'Every naira in and out',
        body: 'Income and expenses together — the numbers behind your reports, tax and dashboard.',
        icon: 'fa-receipt',
      },
      {
        title: 'Record a transaction',
        body: 'Log a sale, an expense or a transfer in a few seconds.',
        icon: 'fa-plus',
        target: main(/^New Entry$/i),
      },
      {
        title: 'Bring in your bank statement',
        body: 'Import a CSV from your bank instead of typing transactions one by one.',
        icon: 'fa-file-import',
        target: main(/^Import( CSV)?$/i),
      },
      {
        title: 'Scan receipts and documents',
        body: 'Photograph a receipt or bill and Morniy turns it into a transaction for you to review.',
        icon: 'fa-camera',
        target: main(/^Scans?$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/clients': () => ({
    version: 1,
    label: 'Clients',
    steps: [
      {
        title: 'Everyone you do business with',
        body: 'Your customers’ details, what they owe you and their history, all in one place.',
        icon: 'fa-address-book',
        target: heading(/^Contact Database$/i),
      },
      {
        title: 'Add a client',
        body: 'Save someone once and pick them in a second when you invoice or issue a receipt.',
        icon: 'fa-user-plus',
        target: main(/^New Contact$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/orders': () => ({
    version: 1,
    label: 'Orders',
    steps: [
      sectionTabs('Sell', SELL),
      {
        title: 'Orders from your public page',
        body: 'When customers order from your page, the order lands here instantly — and they pay by transfer straight into your bank account.',
        icon: 'fa-bag-shopping',
        target: heading(/^Orders$/i),
      },
      {
        title: 'See what needs you',
        body: 'Filter by stage: awaiting payment, paid, fulfilled or cancelled. Open an order to confirm payment, update the customer and mark it done.',
        icon: 'fa-filter',
        target: main(/^Awaiting payment/i),
      },
      {
        title: 'Turn it on here',
        body: 'Switch on ordering and choose how payments are confirmed — forward your bank alerts or link your bank, and Morniy matches payments to orders for you.',
        tip: 'You can always confirm a payment by hand too.',
        icon: 'fa-gear',
        target: main(/^Payment setup$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/products': () => ({
    version: 1,
    label: 'Catalog',
    steps: [
      sectionTabs('Sell', SELL),
      {
        title: 'Everything you sell',
        body: 'Products and services with prices, photos and stock. Add them once and pick them on invoices, receipts and your public page.',
        icon: 'fa-box-open',
        target: heading(/^Products & Services$/i),
      },
      {
        title: 'Add an item',
        body: 'Set the selling price and — privately — what it costs you, so Morniy can show your profit on every sale.',
        tip: 'Give it a category and sub-category so customers can browse your shop.',
        icon: 'fa-plus',
        target: main(/^Add (Item|First Item)$/i),
      },
      {
        title: 'Organise with categories',
        body: 'Browse by category here. “Manage” renames or merges categories across every item at once.',
        icon: 'fa-folder-tree',
        target: main(/^Manage$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/storefront': () => ({
    version: 1,
    label: 'Storefront',
    steps: [
      sectionTabs('Sell', SELL),
      {
        title: 'Your public business page',
        body: 'A free page you can share anywhere — your logo, what you sell and how to reach you. Customers can order and pay from it.',
        icon: 'fa-store',
      },
      {
        title: 'Add your bank details',
        body: 'They appear on your invoices and on customer orders, so people know exactly where to pay.',
        icon: 'fa-building-columns',
        target: main(/bank/i),
      },
      {
        title: 'Save and publish',
        body: 'Save your changes, switch the page on, then share the link or QR code with customers.',
        icon: 'fa-globe',
        target: main(/^Save Profile$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/proposals': () => ({
    version: 1,
    label: 'Proposals',
    steps: [
      sectionTabs('Sell', SELL),
      {
        title: 'Win the job first',
        body: 'Send a priced proposal or quote. When the client accepts, turn it into an invoice in one tap.',
        icon: 'fa-file-signature',
        target: main(/^New Proposal$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/profit': () => ({
    version: 1,
    label: 'Profit',
    steps: [
      sectionTabs('Sell', SELL),
      {
        title: 'What each product really earns',
        body: 'Selling price minus cost, for every catalog item on your invoices and receipts.',
        icon: 'fa-sack-dollar',
        target: heading(/^Product Profit$/i),
      },
      {
        title: 'Booked, collected and owed',
        body: 'Booked profit assumes everyone pays; collected is what’s already in your account; outstanding is still owed by customers.',
        icon: 'fa-scale-balanced',
        target: main(/^Booked profit$/i),
      },
      {
        title: 'How part-payments count',
        body: '“Proportional” counts profit as money comes in. “Cost first” only counts profit once your cost is covered — the cautious view.',
        icon: 'fa-sliders',
        target: main(/^Cost first$/i),
      },
      {
        title: 'Need a refresher?',
        body: 'This explains exactly how every number on the page is worked out.',
        icon: 'fa-circle-question',
        target: main(/^How it works$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/reports': () => ({
    version: 1,
    label: 'Reports',
    steps: [
      sectionTabs('Finance', FINANCE),
      {
        title: 'See the full picture',
        body: 'Summaries, a profit & loss statement, monthly trends and a breakdown by category.',
        icon: 'fa-chart-pie',
        target: main(/^P&L Statement$/i),
      },
      {
        title: 'Pick a period and generate',
        body: 'Choose dates, group by category or client, and generate the report. Export it to CSV for your accountant.',
        icon: 'fa-wand-magic-sparkles',
        target: main(/^Generate Report$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/budgets': () => ({
    version: 1,
    label: 'Budgets',
    steps: [
      sectionTabs('Finance', FINANCE),
      {
        title: 'Spend with a plan',
        body: 'Set a monthly limit for each kind of expense and watch how close you are as you spend.',
        icon: 'fa-wallet',
        target: main(/^(New|Add|Create) Budget$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/payroll': () => ({
    version: 1,
    label: 'Payroll',
    steps: [
      sectionTabs('Finance', FINANCE),
      {
        title: 'Pay your team properly',
        body: 'Record salaries by period and share a payslip link with each staff member.',
        icon: 'fa-user-tie',
        target: main(/^Manual Entry$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/tax': () => ({
    version: 1,
    label: 'Tax',
    steps: [
      sectionTabs('Finance', FINANCE),
      {
        title: 'Your tax, worked out',
        body: 'Morniy estimates your personal income tax from the year’s transactions, using Nigerian rules.',
        icon: 'fa-landmark',
        target: heading(/Tax · PIT|PIT/i),
      },
      {
        title: 'Share it with your accountant',
        body: 'Pick the tax year and export a ready-made report.',
        icon: 'fa-file-export',
        target: main(/^(Export Report|Exporting…)$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/projects': () => ({
    version: 1,
    label: 'Projects',
    steps: [
      sectionTabs('More', MORE),
      {
        title: 'Track jobs from start to finish',
        body: 'Group the money in and out for each job, so you can see which projects actually pay.',
        icon: 'fa-diagram-project',
        target: main(/^New Project$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/capital-assets': () => ({
    version: 1,
    label: 'Assets',
    steps: [
      sectionTabs('More', MORE),
      {
        title: 'What the business owns',
        body: 'Equipment, vehicles, machines — record them once and Morniy keeps track of their value over time.',
        icon: 'fa-box-archive',
        target: main(/^Add (Asset|your first asset)$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/automation': () => ({
    version: 1,
    label: 'Automation',
    steps: [
      sectionTabs('More', MORE),
      {
        title: 'Let Morniy do the sorting',
        body: 'Create rules that categorise transactions automatically — for example, anything from “MTN” is “Airtime & Data”.',
        icon: 'fa-robot',
        target: main(/^Add Rule$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/scanned-transactions': () => ({
    version: 1,
    label: 'Scanned Docs',
    steps: [
      sectionTabs('More', MORE),
      {
        title: 'Everything you’ve scanned',
        body: 'Receipts and documents you photographed are kept here to review, correct and turn into transactions.',
        icon: 'fa-file-image',
        target: heading(/^Review Library$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/users': () => ({
    version: 1,
    label: 'Team',
    steps: [
      sectionTabs('More', MORE),
      {
        title: 'Bring in your team',
        body: 'Give staff their own login. Admins see everything; staff can do day-to-day work without touching settings.',
        icon: 'fa-user-plus',
        target: main(/^Add (New )?User$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/activity': () => ({
    version: 1,
    label: 'Activity Log',
    steps: [
      sectionTabs('More', MORE),
      {
        title: 'Who did what, and when',
        body: 'Every create, edit, delete, payment and sign-in across the business is recorded here.',
        icon: 'fa-clock-rotate-left',
        target: heading(/^Activity Log$/i),
      },
      {
        title: 'Narrow it down',
        body: 'Search, or filter by person, type of action or date — handy when something changed and you want to know why.',
        icon: 'fa-filter',
        target: sel('input[placeholder^="Search by name"]'),
      },
      {
        title: 'Watch it live',
        body: 'Turn this on to see new activity appear as it happens.',
        icon: 'fa-signal',
        target: main(/^(Go live|Live)$/i),
        doneLabel: 'Got it',
      },
    ],
  }),

  '/business': () => ({
    version: 1,
    label: 'Settings',
    steps: [
      {
        title: 'Make it yours',
        body: 'Upload your logo and pick a brand colour. They appear on your invoices, receipts, emails and in the app.',
        icon: 'fa-palette',
        target: main(/^Branding$/i),
      },
      {
        title: 'Business details',
        body: 'Your business name and currency. Bank details are added in Storefront so they show on invoices.',
        icon: 'fa-building',
        target: main(/^Business Details$/i),
        doneLabel: 'Got it',
      },
    ],
  }),
};

export const getTour = (id: string, ctx: TourCtx): Tour | null => {
  const build = TOURS[id];
  if (!build) return null;
  return { id, ...build(ctx) };
};
