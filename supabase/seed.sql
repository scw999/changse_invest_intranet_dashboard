begin;

-- Replace this UUID with your own if you want seeded rows to attach to a real signed-in user.
-- The schema keeps owner_id as a plain UUID so early MVP seeding stays simple.

delete from public.user_theme_interests;
delete from public.user_preferences;
delete from public.portfolio_items;
delete from public.follow_up_records;
delete from public.news_item_tickers;
delete from public.news_item_themes;
delete from public.news_items;
delete from public.tickers;
delete from public.themes;

insert into public.themes (id, owner_id, slug, name, description, category, priority, color)
values
  ('00000000-0000-0000-0000-000000000101', '11111111-1111-1111-1111-111111111111', 'korea-policy-reset', 'Korea Policy Reset', 'Fiscal support, supplementary budget talk, and domestic policy shifts affecting Korea risk assets.', 'Policy', 'High', '#9f6b2c'),
  ('00000000-0000-0000-0000-000000000102', '11111111-1111-1111-1111-111111111111', 'rates-path', 'Rates Path', 'Central bank communication, inflation prints, and duration positioning across KR and US curves.', 'Macro', 'Critical', '#264b6d'),
  ('00000000-0000-0000-0000-000000000103', '11111111-1111-1111-1111-111111111111', 'ai-supply-chain', 'AI Supply Chain', 'Capex, compute bottlenecks, and demand read-through across semiconductors and hyperscalers.', 'Sector', 'Critical', '#2e6a64'),
  ('00000000-0000-0000-0000-000000000104', '11111111-1111-1111-1111-111111111111', 'semiconductor-cycle', 'Semiconductor Cycle', 'Memory pricing, export momentum, and semiconductor inventory turns.', 'Sector', 'Critical', '#355c7d'),
  ('00000000-0000-0000-0000-000000000105', '11111111-1111-1111-1111-111111111111', 'fx-defense', 'FX Defense', 'KRW stabilization measures, dollar funding pressure, and intervention-sensitive trades.', 'Risk', 'High', '#4e5f95'),
  ('00000000-0000-0000-0000-000000000106', '11111111-1111-1111-1111-111111111111', 'safe-haven-flow', 'Safe Haven Flow', 'Treasuries, gold, and defensive positioning when macro conviction softens.', 'Cross-Asset', 'High', '#657a54'),
  ('00000000-0000-0000-0000-000000000107', '11111111-1111-1111-1111-111111111111', 'defense-capex', 'Defense Capex', 'Defense spending cycles and export upside for Korean aerospace and systems suppliers.', 'Sector', 'Medium', '#4f4c78'),
  ('00000000-0000-0000-0000-000000000108', '11111111-1111-1111-1111-111111111111', 'risk-appetite', 'Risk Appetite', 'Cross-asset positioning, leverage conditions, and tactical sentiment swings.', 'Risk', 'Medium', '#6c5b43');

insert into public.tickers (id, owner_id, symbol, name, exchange, region, asset_class, note)
values
  ('00000000-0000-0000-0000-000000000201', '11111111-1111-1111-1111-111111111111', '005930.KS', 'Samsung Electronics', 'KRX', 'KR', 'Equities', 'Core Korea semiconductor bellwether and export sensitivity proxy.'),
  ('00000000-0000-0000-0000-000000000202', '11111111-1111-1111-1111-111111111111', '000660.KS', 'SK Hynix', 'KRX', 'KR', 'Equities', 'High-beta memory and HBM exposure for AI and cyclical turns.'),
  ('00000000-0000-0000-0000-000000000203', '11111111-1111-1111-1111-111111111111', 'NVDA', 'NVIDIA', 'NASDAQ', 'US', 'Equities', 'Lead AI compute beneficiary and sentiment anchor for growth risk.'),
  ('00000000-0000-0000-0000-000000000204', '11111111-1111-1111-1111-111111111111', 'QQQ', 'Invesco QQQ Trust', 'NASDAQ', 'US', 'ETF', 'Growth and duration-sensitive positioning vehicle.'),
  ('00000000-0000-0000-0000-000000000205', '11111111-1111-1111-1111-111111111111', 'TLT', 'iShares 20+ Year Treasury Bond ETF', 'NASDAQ', 'US', 'ETF', 'Clean duration expression for rates-path calls.'),
  ('00000000-0000-0000-0000-000000000206', '11111111-1111-1111-1111-111111111111', 'GLD', 'SPDR Gold Shares', 'NYSE Arca', 'GLOBAL', 'ETF', 'Liquid safe-haven and real-yield hedge expression.'),
  ('00000000-0000-0000-0000-000000000207', '11111111-1111-1111-1111-111111111111', '105560.KS', 'KB Financial', 'KRX', 'KR', 'Equities', 'Korean bank proxy for curve steepening and domestic policy support.'),
  ('00000000-0000-0000-0000-000000000208', '11111111-1111-1111-1111-111111111111', '012450.KS', 'Hanwha Aerospace', 'KRX', 'KR', 'Equities', 'Defense export beneficiary tied to multi-year procurement pipelines.');

insert into public.news_items (
  id,
  owner_id,
  title,
  summary,
  source_name,
  source_url,
  published_at,
  scan_slot,
  region,
  affected_asset_classes,
  market_interpretation,
  directional_view,
  action_idea,
  follow_up_status,
  follow_up_note,
  importance
)
values
  (
    '00000000-0000-0000-0000-000000000301',
    '11111111-1111-1111-1111-111111111111',
    'Korea fiscal support talk revives domestic beta into the morning scan',
    'Local brokers flagged renewed supplementary budget discussion as enough to rotate flows back into domestic cyclicals and broad Korea beta.',
    'Yonhap',
    'https://en.yna.co.kr/',
    '2026-03-11T08:42:00+09:00',
    '09',
    'KR',
    array['Equities', 'ETF']::public.asset_class[],
    'Policy chatter is not a hard catalyst yet, but it improves the floor for domestic beta while foreign flow stays selective.',
    'Bullish',
    'Lean into Korea beta on weakness rather than chase. Prefer liquid vehicles and banks over smaller cyclicals.',
    'Pending',
    'Need confirmation from budget headlines and foreign flow before upgrading conviction.',
    'High'
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    '11111111-1111-1111-1111-111111111111',
    'US core CPI cooldown eases duration pressure ahead of the New York open',
    'A softer-than-feared inflation read triggered a relief move in long duration while keeping growth leadership intact for now.',
    'Reuters',
    'https://www.reuters.com/markets/us/',
    '2026-03-11T09:06:00+09:00',
    '09',
    'US',
    array['Rates', 'ETF', 'Equities']::public.asset_class[],
    'The print extends tactical room for duration, but one cool release alone does not secure a full easing cycle.',
    'Bullish',
    'Maintain tactical TLT watchlist bias and keep QQQ positions, but avoid assuming a straight-line rally.',
    'Pending',
    'Watch whether Fed speakers validate the market move within 24 hours.',
    'Critical'
  ),
  (
    '00000000-0000-0000-0000-000000000305',
    '11111111-1111-1111-1111-111111111111',
    'Hyperscaler capex checks keep AI supply chain leadership intact',
    'Channel checks suggested no meaningful pause in AI infrastructure spend, reinforcing leadership for high-end chips and memory suppliers.',
    'The Information',
    'https://www.theinformation.com/',
    '2026-03-11T12:57:00+09:00',
    '13',
    'US',
    array['Equities']::public.asset_class[],
    'Leadership is still earnings-backed, but the market is increasingly paying up for visibility rather than acceleration.',
    'Bullish',
    'Stay long core AI winners, but rotate adds into supply-chain names where revisions can still surprise positively.',
    'Pending',
    'Need next round of supplier guidance to judge whether pricing power is still broadening.',
    'Critical'
  ),
  (
    '00000000-0000-0000-0000-000000000307',
    '11111111-1111-1111-1111-111111111111',
    'Korea early export data surprises on semiconductors and memory pricing',
    'Preliminary shipment data pointed to stronger semiconductor exports, with memory pricing commentary helping high-beta chip names into the close.',
    'Maeil Business',
    'https://www.mk.co.kr/en/',
    '2026-03-11T17:51:00+09:00',
    '18',
    'KR',
    array['Equities']::public.asset_class[],
    'This reinforces the current earnings revision path for Korea semis and makes pullbacks easier to buy.',
    'Bullish',
    'Favor SK Hynix on momentum and Samsung on catch-up quality. Use export data as confirmation rather than the first signal.',
    'Pending',
    'Need confirmation from spot memory pricing in the weekly check.',
    'Critical'
  ),
  (
    '00000000-0000-0000-0000-000000000310',
    '11111111-1111-1111-1111-111111111111',
    'Europe defense orders broaden supplier read-through for Korea names',
    'Incremental order commentary in Europe strengthened the case for a longer defense upcycle reaching Korean aerospace suppliers.',
    'Financial Times',
    'https://www.ft.com/world',
    '2026-03-11T21:27:00+09:00',
    '22',
    'GLOBAL',
    array['Equities']::public.asset_class[],
    'The theme is maturing from tactical order headlines into a multi-quarter backlog story.',
    'Bullish',
    'Keep Hanwha Aerospace on the watchlist as a pullback buyer. Favor backlog visibility over valuation complaints.',
    'Pending',
    'Need contract timing clarity and margin assumptions to move from watchlist to active buy.',
    'High'
  ),
  (
    '00000000-0000-0000-0000-000000000311',
    '11111111-1111-1111-1111-111111111111',
    'Gold holds firm as real yields retreat from recent highs',
    'Bullion stayed resilient even as the dollar remained firm, with real-yield easing offsetting the FX headwind.',
    'MarketWatch',
    'https://www.marketwatch.com/investing/',
    '2026-03-11T21:48:00+09:00',
    '22',
    'GLOBAL',
    array['Commodities', 'ETF', 'Rates']::public.asset_class[],
    'Gold is behaving like a useful hedge again, especially if growth leadership starts to narrow.',
    'Bullish',
    'Keep GLD in the watchlist hedge bucket, particularly if real yields continue to soften without a growth scare.',
    'Pending',
    'Confirm with a second session of follow-through before sizing defensively.',
    'Medium'
  ),
  (
    '00000000-0000-0000-0000-000000000312',
    '11111111-1111-1111-1111-111111111111',
    'Renewed Treasury auction demand sparks a tactical rebound in duration',
    'Stronger-than-feared auction demand helped long-end Treasuries stabilize after a bruising selloff, reviving a tactical bounce setup.',
    'Reuters',
    'https://www.reuters.com/markets/rates-bonds/',
    '2026-03-10T18:25:00+09:00',
    '18',
    'US',
    array['Rates', 'ETF']::public.asset_class[],
    'Positioning was washed enough for a rebound, though the call was framed as tactical rather than the start of a trend.',
    'Bullish',
    'Use TLT for a short-horizon mean-reversion trade and keep expectations modest unless inflation cools too.',
    'Correct',
    'The next session held gains and validated the tactical bounce, but the move stalled once Fed speakers turned firmer.',
    'High'
  ),
  (
    '00000000-0000-0000-0000-000000000316',
    '11111111-1111-1111-1111-111111111111',
    'Korea banks outperform on steeper-curve expectations into the weekly close',
    'Domestic banks outperformed after dealers started pricing a stickier nominal backdrop and better NIM support.',
    'Seoul Economic Daily',
    'https://www.sedaily.com/',
    '2026-03-09T13:31:00+09:00',
    '13',
    'KR',
    array['Equities']::public.asset_class[],
    'The move improved the case for banks as a portfolio stabilizer within a risk-on Korea book.',
    'Bullish',
    'Use banks as quality domestic beta rather than a pure rates trade. KB remains the cleanest liquid expression.',
    'Correct',
    'Banks kept relative strength while cyclicals rotated, supporting the idea of them as stabilizing domestic exposure.',
    'Medium'
  );

insert into public.news_item_themes (owner_id, news_item_id, theme_id)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000108'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000106'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000103'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000104'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000103'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000104'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000107'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000108'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000106'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000102'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000102'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000106'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000316', '00000000-0000-0000-0000-000000000102'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000316', '00000000-0000-0000-0000-000000000101');

insert into public.news_item_tickers (owner_id, news_item_id, ticker_id)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000207'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000205'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000204'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000203'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000202'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000201'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000202'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000201'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000208'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000206'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000205'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000205'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000316', '00000000-0000-0000-0000-000000000207');

insert into public.follow_up_records (
  id,
  owner_id,
  news_item_id,
  status,
  resolved_at,
  outcome_summary,
  result_note,
  market_impact
)
values
  (
    '00000000-0000-0000-0000-000000000401',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000312',
    'Correct',
    '2026-03-11T17:58:00+09:00',
    'Duration bounced as expected immediately after the auction, then gave back some gains once Fed commentary hardened.',
    'Good tactical call. The trade worked, but the note correctly framed it as a short-horizon rebound rather than a durable shift.',
    'TLT held its first-day rebound and closed above the prior session low.'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000305',
    'Pending',
    null,
    'Need the next supplier guide and order backlog commentary to judge whether the capex thesis is broadening.',
    'Monitor memory names and hyperscalers over the next two weekly updates.',
    'Awaiting outcome.'
  ),
  (
    '00000000-0000-0000-0000-000000000403',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000310',
    'Pending',
    null,
    'The backlog story looks promising, but the next step is checking order timing and margin conversion.',
    'Keep on watchlist and revisit after the next management commentary.',
    'Awaiting outcome.'
  ),
  (
    '00000000-0000-0000-0000-000000000404',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000311',
    'Pending',
    null,
    'Need a second session of follow-through to validate gold as a live hedge rather than a one-day relief move.',
    'Compare gold strength against the next real-yield move and equity breadth.',
    'Awaiting outcome.'
  ),
  (
    '00000000-0000-0000-0000-000000000405',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000316',
    'Correct',
    '2026-03-10T09:10:00+09:00',
    'Korea banks kept relative strength and cushioned the portfolio while higher-beta names rotated.',
    'This worked as a balance call inside the Korea book rather than an outright sector chase.',
    'KB Financial outperformed the KOSPI in the next session.'
  );

insert into public.portfolio_items (
  id,
  owner_id,
  symbol,
  asset_name,
  asset_type,
  region,
  is_holding,
  is_watchlist,
  weight,
  average_cost,
  memo,
  priority
)
values
  ('00000000-0000-0000-0000-000000000501', '11111111-1111-1111-1111-111111111111', '000660.KS', 'SK Hynix', 'Stock', 'KR', true, false, 16.2, 173000, 'Core AI memory winner. Prefer to add on export-data-confirmed pullbacks.', 'Critical'),
  ('00000000-0000-0000-0000-000000000502', '11111111-1111-1111-1111-111111111111', 'NVDA', 'NVIDIA', 'Stock', 'US', true, false, 11.5, 742, 'Long-term compounder, but avoid oversizing after vertical momentum bursts.', 'High'),
  ('00000000-0000-0000-0000-000000000503', '11111111-1111-1111-1111-111111111111', 'QQQ', 'Invesco QQQ Trust', 'ETF', 'US', true, false, 18, 503, 'Growth beta anchor. Watch rates sensitivity closely.', 'Medium'),
  ('00000000-0000-0000-0000-000000000504', '11111111-1111-1111-1111-111111111111', 'TLT', 'iShares 20+ Year Treasury Bond ETF', 'ETF', 'US', false, true, null, null, 'Waiting for a cleaner duration entry after Fed pushback.', 'High'),
  ('00000000-0000-0000-0000-000000000505', '11111111-1111-1111-1111-111111111111', 'GLD', 'SPDR Gold Shares', 'ETF', 'GLOBAL', false, true, null, null, 'Potential macro hedge if growth breadth narrows.', 'Medium'),
  ('00000000-0000-0000-0000-000000000506', '11111111-1111-1111-1111-111111111111', '012450.KS', 'Hanwha Aerospace', 'Stock', 'KR', false, true, null, null, 'High-conviction watchlist name for defense-capex theme.', 'High');

insert into public.user_preferences (
  owner_id,
  timezone,
  preferred_sort,
  favorite_slots,
  default_regions,
  compact_mode
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Asia/Seoul',
    'importance',
    array['09', '18']::public.scan_slot[],
    array['KR', 'US']::public.region_code[],
    false
  );

insert into public.user_theme_interests (owner_id, theme_id, priority)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000103', 'Critical'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000104', 'Critical'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000102', 'High'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000105', 'High');

commit;
