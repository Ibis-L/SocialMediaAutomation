// Mock data — swap these with WebSocket / Django API calls later

// ─── News Management ─────────────────────────────────────────────────────────

export const newsTabsData = [
  { key: "all",       label: "All",       count: 10 },
  { key: "rewritten", label: "Rewritten", count: 11 },
  { key: "draft",     label: "Draft",     count: 10 },
  { key: "pending",   label: "Pending",   count: 10 },
  { key: "approved",  label: "Approved",  count: 10 },
  { key: "schedule",  label: "Schedule",  count: 10 },
  { key: "rejected",  label: "Rejected",  count: 16 },
  { key: "published", label: "Published", count: 10 },
];

export const newsArticlesData = [
  {
    id: "NWS-B841",
    headline: "State Cabinet Clears ₹2,400 Cr Infrastructure...",
    wordCount: 642,
    source: "AI",
    type: "Politics",
    author: "AI + Priya M.",
    authorType: "ai",
    status: "Pending Approval",
    updatedAt: "2m Ago",
  },
  {
    id: "NWS-B840",
    headline: "India Clinch Series With Clinical Chase In Mohali Decider...",
    wordCount: 518,
    source: "AI",
    type: "Sports",
    author: "AI + Rahul S.",
    authorType: "ai",
    status: "Pending Approval",
    updatedAt: "2m Ago",
  },
  {
    id: "NWS-B839",
    headline: "Sensex Tops 84,000 As IT And Banking Stocks Rally...",
    wordCount: 430,
    source: "AI",
    type: "Business",
    author: "AI Engine",
    authorType: "ai",
    status: "Rewritten",
    updatedAt: "2m Ago",
  },
  {
    id: "NWS-B838",
    headline: "New EV Policy To Add 400 Charging Hubs Across Delhi NCR...",
    wordCount: 712,
    source: "AI",
    type: "Technology",
    author: "AI + Neha K.",
    authorType: "ai",
    status: "Approved",
    updatedAt: "2m Ago",
  },
  {
    id: "NWS-B841-2",
    headline: "Local Civic Body Announces New Waste Management Drive...",
    wordCount: 642,
    source: "AI",
    type: "Regional",
    author: "Manish T.",
    authorType: "human",
    status: "Draft",
    updatedAt: "2m Ago",
  },
  {
    id: "NWS-B841-3",
    headline: "State Cabinet Clears ₹2,400 Cr Infrastructure...",
    wordCount: 642,
    source: "AI",
    type: "Politics",
    author: "AI + Priya M.",
    authorType: "ai",
    status: "Pending Approval",
    updatedAt: "2m Ago",
  },
];

export const importPreviewData = [
  { title: "Ludhiana metro corridor gets state nod", category: "Politics",   validation: "Valid",          status: "valid" },
  { title: "Kabaddi league final draws record crowd", category: "Sports",     validation: "Valid",          status: "valid" },
  { title: "Missing (title)...",                      category: "Business",   validation: "Title Required", status: "error" },
  { title: "Rooftop solar subsidy extended to March", category: "Technology", validation: "Valid",          status: "valid" },
  { title: "Duplicate: Monsoon alert north India",    category: "National",   validation: "Duplicate URL",  status: "duplicate" },
];

// ─── Home / Ingestion ─────────────────────────────────────────────────────────

export const statsData = [
  {
    id: "active-sources",
    label: "ACTIVE SOURCES",
    value: "24",
    suffix: "of 31",
    valueColor: "text-brand-black",
  },
  {
    id: "scraped-24h",
    label: "SCRAPED – 24H",
    value: "892",
    suffix: "articles",
    valueColor: "text-brand-blue",
  },
  {
    id: "duplicates-caught",
    label: "DUPLICATES CAUGHT",
    value: "168",
    suffix: "filtered",
    valueColor: "text-brand-gold",
  },
  {
    id: "failed-fetches",
    label: "FAILED FETCHES",
    value: "12",
    suffix: "retrying",
    valueColor: "text-brand-red",
  },
];

export const sourcesData = [
  {
    id: 1,
    name: "Dainik Bhaskar",
    tags: ["Politics", "National", "Punjab"],
    type: "RSS",
    lastScrape: "2m Ago",
    count24h: 214,
    status: "Active",
  },
  {
    id: 2,
    name: "AajTak",
    tags: ["National", "Sports", "Entertainment"],
    type: "RSS",
    lastScrape: "4m Ago",
    count24h: 184,
    status: "Active",
  },
  {
    id: 3,
    name: "Hindustan Times",
    tags: ["Business", "Tech", "National"],
    type: "Scraper",
    lastScrape: "6m Ago",
    count24h: 142,
    status: "Active",
  },
  {
    id: 4,
    name: "TechDesk News API",
    tags: ["Technology", "Science"],
    type: "API",
    lastScrape: "6m Ago",
    count24h: 142,
    status: "Active",
  },
  {
    id: 5,
    name: "Punjab Kesari",
    tags: ["Punjab", "Regional"],
    type: "API",
    lastScrape: "12m Ago",
    count24h: 98,
    status: "Error",
  },
  {
    id: 6,
    name: "The Tribune",
    tags: ["Haryana", "Punjab", "UP"],
    type: "Scraper",
    lastScrape: "12m Ago",
    count24h: 98,
    status: "Pause",
  },
];

export const duplicateDetectionData = {
  total: 168,
  description: "168 Duplicates Filtered In The Last 24 Hours Across Three Methods.",
  methods: [
    { name: "URL Comparison", hits: 92, variant: "blue", maxHits: 92 },
    { name: "Content Similarity", hits: 52, variant: "gold", maxHits: 92 },
    { name: "AI Similarity Score", hits: 22, variant: "red", maxHits: 92 },
  ],
};

export const rawFeedData = [
  {
    id: 1,
    title: "Cabinet Approves New Metro Corridor For Ludhiana",
    source: "Dainik Bhaskar",
    time: "Just Now",
    tag: "NEW",
    tagVariant: "new",
  },
  {
    id: 2,
    title: "Monsoon Update: Heavy Rain Alert Across North India",
    source: "Dainik Bhaskar",
    time: "Just Now",
    tag: "DUPE",
    tagVariant: "dupe",
  },
  {
    id: 3,
    title: "Same Story From 2 Sources — Auto-Merged",
    source: "Dainik Bhaskar",
    time: "Just Now",
    tag: "ERROR",
    tagVariant: "error",
  },
  {
    id: 4,
    title: "Markets Open Higher On Global Cues",
    source: "Dainik Bhaskar",
    time: "Just Now",
    tag: "NEW",
    tagVariant: "new",
  },
];
// ─── Editorial Approval ───────────────────────────────────────────────────────

export const approvalPipelineSteps = [
  { id: 1, label: "Scraped",       done: true  },
  { id: 2, label: "AI Rewrite",    done: true  },
  { id: 3, label: "Writer Review", done: true  },
  { id: 4, label: "Editor Verify", done: false, active: true, count: 4 },
  { id: 5, label: "Approved",      done: false },
  { id: 6, label: "Published",     done: false },
];

export const approvalQueueData = [
  {
    id: "NWS-BB41",
    category: "POLITICS",
    categoryDot: "bg-brand-red",
    headline: "State cabinet clears ₹2,400 cr infrastructure Package for...",
    author: "Dainik Bhaskar",
    time: "4m Ago",
  },
  {
    id: "NWS-BB42",
    category: "SPORTS",
    categoryDot: "bg-brand-red",
    headline: "India clinch series with clinical chase in Mohali...",
    author: "Dainik Bhaskar",
    time: "4m Ago",
  },
  {
    id: "NWS-BB43",
    category: "SPORTS",
    categoryDot: "bg-brand-red",
    headline: "India clinch series with clinical chase in Mohali...",
    author: "Dainik Bhaskar",
    time: "4m Ago",
  },
];

export const approvalArticleData = {
  id: "NWS-BB41",
  source: "Dainik Bhaskar",
  time: "4m Ago",
  category: "POLITICS",
  headline: "State Cabinet Clears ₹2,400 Cr Infrastructure Package For Punjab",
  original: `Punjab Cabinet Today Cleared Infrastructure Package Worth Rs 2400 Crore. The Decision Was Taken In Meeting Chaired By CM. Officials Said The Package Include Roads, Bridges And Water Supply Projects Across The State.

The Fund Will Be Allocated To Various Districts. Work Will Start Soon, Officials Added. This Is Big Step For Development Of State Infrastructure Sector.`,
  rewritten: `In A Major Boost For Regional Development, The Punjab Cabinet On Tuesday Approved An Ambitious ₹2,400 Crore Infrastructure Package Aimed At Modernising The State's Road, Bridge And Water-Supply Networks.

The Funds Will Be Distributed Across Districts, With Implementation Expected To Begin Within Weeks — A Move Officials Describe As A Decisive Step Toward Strengthening Punjab's Development Corridor.`,
  coverImage: null,
  seoTitle: "Punjab Cabinet Approves ₹2,400 Cr Infrastructure Package — Roads, Bridges & Water",
  metaDesc: "Punjab Approves ₹2,400 Crore Infrastructure Package To Modernise Roads, Bridges And Water Supply Across Districts. Work Begins Within Weeks.",
  keywords: "Punjab Infrastructure, ₹2400 Crore Package, Cabinet Approval, Roads Bridges Water Supply",
  aiAnalysis: {
    sentiment: "Neutral",
    readability: -38,
    seoScore: 86,
    seoMax: 100,
  },
  rewriteMode: "Humanized",
  creativity: 60,
  reviewNotes: [
    {
      id: 1,
      author: "Priya M.",
      initials: "PM",
      color: "bg-brand-red",
      time: "4m Ago",
      text: "Headline Reads Well. Verify The ₹2,400 Cr Figure Against The Official Press Release Before Approving.",
    },
    {
      id: 2,
      author: "AI Engine",
      initials: "AI",
      color: "bg-gray-500",
      time: "4m Ago",
      text: "Rewrite Complete · Readability +38% · 3 SEO Keywords Added · Sentiment: Neutral.",
    },
  ],
};

// ─── WhatsApp Distribution ────────────────────────────────────────────────────

export const whatsappStatsData = [
  { id: "wa-connected",     label: "CONNECTED",       value: "24",    suffix: "of 4 accounts", valueColor: "text-brand-black" },
  { id: "wa-messages-24h",  label: "MESSAGES · 24H",  value: "18.2K", suffix: "sent",           valueColor: "text-brand-blue"  },
  { id: "wa-delivery-rate", label: "DELIVERY RATE",    value: "98.4%", suffix: "success",        valueColor: "text-brand-black" },
  { id: "wa-failed",        label: "FAILED",           value: "291",   suffix: "retrying",       valueColor: "text-brand-red"   },
];

export const whatsappAccountsData = [
  { id: 1, name: "SS Local · Main",     phone: "+91 98100 00001", status: "connected" },
  { id: 2, name: "SS Local · Punjab",   phone: "+91 98140 77892", status: "connected" },
  { id: 3, name: "SS Local · Sports",   phone: "+91 98140 77834", status: "connected" },
  { id: 4, name: "SS Local · Backups",  phone: "+91 98140 77854", status: "disconnected" },
];

export const whatsappAudienceData = {
  communities: 48,
  groups: 214,
  contacts: 21988,
};

export const whatsappSelectedNews = {
  id: "NWS-B841",
  headline: "Punjab Cabinet Clears ₹2,400 Cr Infrastructure Package",
  status: "Approved",
  category: "Politics",
};

export const whatsappTargetsData = [
  { id: 1, name: "Breaking News Community", members: 8480, checked: true  },
  { id: 2, name: "Punjab Updates · Community", members: 8480, checked: false },
  { id: 3, name: "Sports Desk · Group",       members: 8480, checked: true  },
  { id: 4, name: "VIP Reporters · Contacts",  members: 8480, checked: false },
];

export const deliveryLogData = [
  { id: 1, campaign: "Punjab ₹2,400 cr package", time: "18:00", sent: 8400, delivered: 8280, read: 1120, failed: 340, status: "Delivered", retryFailed: "0 Retry failed" },
  { id: 2, campaign: "Mohali series win",          time: "18:00", sent: 8400, delivered: 8280, read: 1129, failed: 340, status: "Delivered", retryFailed: "0 Retry failed" },
  { id: 3, campaign: "Daily Digest · Morning",     time: "18:00", sent: 8400, delivered: 8280, read: 1120, failed: 340, status: "Partial",   retryFailed: "0 Retry failed" },
  { id: 4, campaign: "Sensex 84,000 alert",        time: "18:00", sent: 8400, delivered: 8280, read: 1120, failed: 340, status: "Failed",    retryFailed: "0 Retry failed" },
];

export const deliveryStatsOverview = [
  { label: "Sent",      value: 18472, color: "bg-gray-500",       max: 18472 },
  { label: "Delivered", value: 12887, color: "bg-brand-blue",     max: 18472 },
  { label: "Read",      value: 4506,  color: "bg-status-active",  max: 18472 },
  { label: "Failed",    value: 300,   color: "bg-brand-red",      max: 18472 },
];

export const contactsListData = [
  { id: 1, name: "Breaking News",   type: "COMMUNITY", members: 8480, growth: "+124" },
  { id: 2, name: "Punjab Updates",  type: "COMMUNITY", members: 6200, growth: "+124" },
  { id: 3, name: "Sports Desk",     type: "GROUP",     members: 6200, growth: "+124" },
  { id: 4, name: "VIP Reports",     type: "CONTACTS",  members: 6200, growth: "+124" },
];

export const optOutsData = [
  { id: 1, phone: "+91 87***4412", reason: "STOP Reply",      time: "2h ago"  },
  { id: 2, phone: "+91 87***4412", reason: "Reported Spam",   time: "5h ago"  },
  { id: 3, phone: "+91 87***4412", reason: "STOP Reply",      time: "2h ago"  },
  { id: 4, phone: "+91 87***4412", reason: "STOP Reply",      time: "2h ago"  },
];

// ─── Social Media ─────────────────────────────────────────────────────────────

export const socialPlatformsData = [
  { id: "facebook",  name: "Facebook",    accounts: "8 accounts",  color: "#1877F2", status: "inactive",  icon: "FB"  },
  { id: "instagram", name: "Instagram",   accounts: "12 accounts", color: "#E4405F", status: "active",    icon: "IG"  },
  { id: "twitter",   name: "X (Twitter)", accounts: "24 accounts", color: "#000000", status: "active",    icon: "X"   },
  { id: "linkedin",  name: "LinkedIn",    accounts: "14 accounts", color: "#0A66C2", status: "active",    icon: "IN"  },
  { id: "telegram",  name: "Telegram",    accounts: "8 Channels",  color: "#26A5E4", status: "active",    icon: "TG"  },
  { id: "youtube",   name: "YouTube",     accounts: "1 Channel",   color: "#FF0000", status: "inactive",  icon: "YT"  },
];

export const socialHashtags = ["#INDvsAUS", "#Cricket", "#Mohali", "#SeriesWin"];

export const socialSelectedNews = {
  id: "NWS-B841",
  headline: "Punjab Cabinet Clears ₹2,400 Cr Infrastructure Package",
  status: "Approved",
  category: "Politics",
};

export const socialCaptionDefault = "Clinical, calm, clinical again — India wrap up the series in Mohali under the lights. Report + highlights 🏏 #INDvAUS";

export const scheduledPostsData = [
  { id: 1, when: "Today 18:00",      post: "EV policy adds 400 charging hubs across Delhi NCR",  platforms: "FB · IG · X · IN", action: "SCHEDULE" },
  { id: 2, when: "Today 20:30",      post: "Sensex tops 84,000 as IT & banking rally",           platforms: "FB · IG · X · IN", action: "SCHEDULE" },
  { id: 3, when: "Tomorrow 09:00",   post: "EV policy adds 400 charging hubs across Delhi NCR",  platforms: "FB · IG · X · IN", action: "SCHEDULE" },
  { id: 4, when: "Today 18:00",      post: "EV policy adds 400 charging hubs across Delhi NCR",  platforms: "FB · IG · X · IN", action: "SCHEDULE" },
];
