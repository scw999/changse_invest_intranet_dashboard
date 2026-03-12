import type {
  FollowUpRecord,
  NewsItem,
  PortfolioItem,
  Theme,
  Ticker,
} from "@/types/research";

const themeOverrides: Record<string, Partial<Theme>> = {
  "theme-kr-policy": {
    name: "한국 정책 전환",
    description: "추경, 재정 지원, 국내 정책 변화가 한국 자산시장에 미치는 영향을 추적합니다.",
  },
  "theme-rates-path": {
    name: "금리 경로",
    description: "물가, 중앙은행 발언, 장단기 금리 포지셔닝 변화에 초점을 둡니다.",
  },
  "theme-ai-supply": {
    name: "AI 공급망",
    description: "AI 투자, 컴퓨트 병목, 반도체와 하이퍼스케일러 수요 연결고리를 추적합니다.",
  },
  "theme-energy-tightness": {
    name: "에너지 타이트닝",
    description: "원유 공급 규율, 해상 운송 차질, 2차 인플레이션 효과를 다룹니다.",
  },
  "theme-fx-defense": {
    name: "환율 방어",
    description: "원화 안정화 조치와 달러 강세 국면에서의 방어 신호를 추적합니다.",
  },
  "theme-semi-cycle": {
    name: "반도체 사이클",
    description: "메모리 가격, 수출 모멘텀, 재고 턴 구간을 중심으로 봅니다.",
  },
  "theme-china-demand": {
    name: "중국 수요 재가동",
    description: "중국 정책 완화가 한국 수출주와 소재주에 주는 파급효과를 정리합니다.",
  },
  "theme-safe-havens": {
    name: "안전자산 흐름",
    description: "국채, 금, 방어 포지션으로 자금이 이동하는 흐름을 기록합니다.",
  },
  "theme-defense-capex": {
    name: "방산 CAPEX",
    description: "방산 지출 확대와 한국 방산 공급망의 수혜 가능성을 추적합니다.",
  },
  "theme-risk-appetite": {
    name: "위험선호",
    description: "레버리지, 크로스에셋 수급, 단기 심리 변화를 한데 묶어 봅니다.",
  },
};

const tickerOverrides: Record<string, Partial<Ticker>> = {
  "ticker-005930-ks": {
    note: "한국 반도체 대표주이자 수출 민감도 확인에 유용한 핵심 종목입니다.",
  },
  "ticker-000660-ks": {
    note: "AI 메모리와 HBM 모멘텀을 가장 강하게 반영하는 고베타 종목입니다.",
  },
  "ticker-nvda": {
    note: "AI 컴퓨트 수요를 대표하는 핵심 종목으로 성장 심리의 기준점 역할을 합니다.",
  },
  "ticker-msft": {
    note: "하이퍼스케일러 CAPEX와 AI 상용화 흐름을 읽을 수 있는 대표 종목입니다.",
  },
  "ticker-qqq": {
    note: "성장주와 장기금리 민감도를 한 번에 반영하는 대표 ETF입니다.",
  },
  "ticker-tlt": {
    note: "금리 경로 해석을 가장 직관적으로 반영하는 장기채 ETF입니다.",
  },
  "ticker-gld": {
    note: "실질금리와 안전자산 선호를 반영하는 대표 금 ETF입니다.",
  },
  "ticker-xle": {
    note: "원유 공급 이슈를 섹터 단위로 반영하기 좋은 에너지 ETF입니다.",
  },
  "ticker-kb": {
    note: "국내 금리와 정책 기대를 반영하는 대표 은행주입니다.",
  },
  "ticker-hanwha": {
    note: "글로벌 방산 수주 확대를 한국 공급망으로 연결해서 볼 수 있는 핵심 종목입니다.",
  },
  "ticker-btc": {
    note: "유동성과 위험선호의 온도를 빠르게 보여주는 대표 가상자산입니다.",
  },
  "ticker-kodex200": {
    note: "국내 정책 기대와 수출 모멘텀을 광범위하게 담는 한국 대표 ETF입니다.",
  },
  "ticker-posco": {
    note: "중국 수요 회복과 산업재 반등 기대를 점검하기 좋은 소재 대표주입니다.",
  },
};

const newsOverrides: Record<string, Partial<NewsItem>> = {
  "news-001": {
    title: "추경 기대가 오전장 한국 베타를 다시 끌어올림",
    summary:
      "국내 증권가에서는 추경 논의 재부각만으로도 내수 경기민감주와 한국 전체 베타에 자금이 다시 붙을 수 있다고 해석했습니다.",
    marketInterpretation:
      "아직 확정 정책은 아니지만 정책 기대만으로도 국내 베타의 하단을 받쳐주는 흐름이 보입니다.",
    actionIdea:
      "한국 베타는 급등 추격보다 눌림목 대응이 유리합니다. 소형주보다 은행과 대형 ETF 쪽이 깔끔합니다.",
    followUpNote: "추경 헤드라인과 외국인 수급이 실제로 붙는지 추가 확인이 필요합니다.",
  },
  "news-002": {
    title: "미국 핵심 CPI 둔화로 장기채 부담이 완화",
    summary:
      "예상보다 무난한 물가 수치가 나오면서 장기채 반등 여지가 생겼고, 성장주 강세도 일단 유지됐습니다.",
    marketInterpretation:
      "단기적으로는 듀레이션에 숨통이 트였지만, 한 번의 물가 둔화만으로 완전한 금리 인하 사이클을 확신하기는 이릅니다.",
    actionIdea:
      "TLT는 전술적 관찰 구간으로 유지하고, QQQ는 보유를 이어가되 직선형 랠리를 전제하진 않는 편이 좋습니다.",
    followUpNote: "이후 Fed 발언이 채권 반등을 얼마나 인정해주는지 확인해야 합니다.",
  },
  "news-003": {
    title: "OPEC 공급 규율이 중국 수요 우려를 일부 상쇄하며 유가 안정",
    summary:
      "중국 수요 둔화 우려에도 불구하고 OPEC의 공급 관리 신호가 이어지며 유가는 비교적 안정적으로 버텼습니다.",
    marketInterpretation:
      "에너지는 경기 낙관보다 공급 관리에 의해 지지받는 구간이라 구조적 강세보다는 전술적 접근이 적절합니다.",
    actionIdea:
      "에너지 비중은 인플레이션 헤지 관점에서 유지하되, 광범위한 원자재 랠리를 전제한 공격적 확대는 유보합니다.",
    followUpNote: "실물 스프레드 개선이 뒤따르는지 추가 확인이 필요합니다.",
  },
  "news-004": {
    title: "한국은행이 일방적 원화 약세에는 대응 가능성을 시사",
    summary:
      "당국은 특정 환율 레벨 방어보다는 변동성 완화에 초점을 둔다고 했지만, 발언만으로도 달러 강세가 일부 진정됐습니다.",
    marketInterpretation:
      "원화 급변 리스크를 낮춰주는 신호이지만, 추세 자체를 뒤집는 강한 전환 신호로 보긴 어렵습니다.",
    actionIdea:
      "환율만 보고 수출주를 쫓기보다, 원화 안정이 이어질 경우 내수 민감주나 국내 베타를 함께 보겠습니다.",
    followUpNote: "종가 기준으로 개입 민감 구간 아래로 내려오는지 체크가 필요합니다.",
  },
  "news-005": {
    title: "하이퍼스케일러 CAPEX 점검 결과 AI 공급망 리더십 유지",
    summary:
      "채널 체크상 AI 인프라 투자가 크게 꺾이지 않았고, 고사양 반도체와 메모리 공급망 선호가 이어졌습니다.",
    marketInterpretation:
      "실적 기반 리더십은 유지되지만 시장은 이제 가속보다 가시성에 더 높은 밸류에이션을 주고 있습니다.",
    actionIdea:
      "핵심 AI 승자는 유지하되, 추가 매수는 아직 실적 상향 여지가 남은 공급망 종목 쪽이 더 효율적입니다.",
    followUpNote: "다음 공급사 가이던스에서 가격결정력 확산 여부를 확인해야 합니다.",
  },
  "news-006": {
    title: "중국 부동산 완화 기대가 오후에 한국 소재주를 자극",
    summary:
      "중국 지방정부의 부양 신호가 나오자 중국 수요 노출이 있는 철강과 소재주가 반등했습니다.",
    marketInterpretation:
      "단기 리플레이션 트레이드로는 유효하지만, 중국 내수의 중기 추세 전환으로 바로 연결하긴 이릅니다.",
    actionIdea:
      "소재주는 전술적 접근이 적합하며, 정책 강도가 더 커지기 전까지는 중장기 낙관으로 확장하지 않습니다.",
    followUpNote: "부동산 판매와 신용 데이터가 실제로 개선되는지 봐야 합니다.",
  },
  "news-007": {
    title: "한국 조기 수출지표가 반도체와 메모리 가격 강세를 재확인",
    summary:
      "예비 수출 수치에서 반도체가 예상보다 강했고 메모리 가격 코멘트도 더해지며 고베타 반도체가 강했습니다.",
    marketInterpretation:
      "한국 반도체의 이익 상향 경로가 다시 확인된 셈이라 눌림목 매수 근거가 더 뚜렷해졌습니다.",
    actionIdea:
      "모멘텀은 SK Hynix, 안정감과 후행 추격은 Samsung Electronics 쪽이 유리합니다.",
    followUpNote: "주간 메모리 현물 가격이 실제로 따라오는지 확인할 필요가 있습니다.",
  },
  "news-008": {
    title: "Fed 인사들이 조기 인하 기대를 누르며 채권 랠리 속도 조절",
    summary:
      "CPI 이후의 완화 기대가 채 살아나기도 전에 Fed 발언이 나오면서 국채 반등 속도가 일부 제어됐습니다.",
    marketInterpretation:
      "시장은 아직 데이터에 더 민감하지만, 정책 발언이 듀레이션 추격 매수를 막는 상단 역할을 합니다.",
    actionIdea:
      "채권은 관심 유지하되 첫 반등에서 과하게 추가하기보다 더 나은 진입 구간을 기다리는 편이 좋습니다.",
    followUpNote: "야간장 종가 기준으로 채권이 조정 후에도 버티는지 확인이 필요합니다.",
  },
  "news-009": {
    title: "비트코인 ETF 유입은 둔화됐지만 레버리지는 아직 안정적",
    summary:
      "최근 강했던 자금 유입은 다소 둔화됐지만 파생 포지셔닝은 급한 청산을 부를 정도로 과열되지는 않았습니다.",
    marketInterpretation:
      "즉시 붕괴보다 박스권 정리 가능성이 높지만, 추가 상방은 현물 자금 재유입이 있어야 열릴 수 있습니다.",
    actionIdea:
      "기존 모멘텀만 보고 신규 위험 노출을 키우기보다 자금 유입 재가속이나 펀딩 정상화를 기다리는 편이 좋습니다.",
    followUpNote: "향후 이틀간 ETF 순유입 추이를 확인해야 합니다.",
  },
  "news-010": {
    title: "유럽 방산 발주가 한국 방산주 수혜 해석을 넓힘",
    summary:
      "유럽 발주 관련 코멘트가 추가되면서 한국 항공·방산 업체가 더 긴 업사이클에 들어갈 수 있다는 해석이 강화됐습니다.",
    marketInterpretation:
      "전술적 수주 뉴스가 아니라 중기 백로그 스토리로 해석 범위가 넓어지고 있습니다.",
    actionIdea:
      "Hanwha Aerospace는 눌림목 매수 후보로 유지하고, 단기 밸류에이션 부담보다 수주 가시성에 더 무게를 둡니다.",
    followUpNote: "계약 시점과 마진 전환 시나리오를 더 확인해야 실제 매수 판단이 가능합니다.",
  },
  "news-011": {
    title: "실질금리 완화 속에서 금 가격이 높은 수준 유지",
    summary:
      "달러가 강한데도 실질금리가 내려오면서 금은 헤지 자산 역할을 다시 보여줬습니다.",
    marketInterpretation:
      "성장주 주도력이 약해질 경우 금이 다시 유효한 방어 수단으로 기능할 가능성이 높습니다.",
    actionIdea:
      "GLD는 방어 버킷 관심종목으로 유지하고, 실질금리 추가 하락이 확인되면 비중 확대를 검토합니다.",
    followUpNote: "하루 더 추세가 이어지는지 보고 방어 비중 확대 여부를 판단합니다.",
  },
  "news-012": {
    title: "미 국채 입찰 수요 개선으로 듀레이션 전술 반등 신호",
    summary:
      "예상보다 견조한 입찰 수요가 나오면서 과매도였던 장기채에 단기 반등 논리가 생겼습니다.",
    marketInterpretation:
      "추세 반전이 아니라 과매도 해소 성격의 전술 반등으로 보는 것이 맞는 구간이었습니다.",
    actionIdea:
      "TLT는 짧은 시계열의 평균회귀 성격으로 접근하고, 물가 둔화 확인 전까지는 기대치를 낮게 둡니다.",
    followUpNote: "다음 세션에서 반등이 유지됐지만 Fed 발언이 강해지며 상승폭은 일부 제한됐습니다.",
  },
  "news-013": {
    title: "원화 안정화 발언에도 수출주는 잠시 흔들린 뒤 다시 회복",
    summary:
      "환율 안정화 헤드라인에 수출주가 잠시 약해졌지만 현물 환율 압력이 완화되자 다시 매수세가 돌아왔습니다.",
    marketInterpretation:
      "환율 뉴스만으로 수출주 추세가 꺾일 정도는 아니었고, 시장은 여전히 실적 방향에 더 무게를 두고 있습니다.",
    actionIdea:
      "원화 안정화 기사만 보고 반도체 리더십을 역추세로 베팅하는 건 아직 이릅니다.",
    followUpNote: "반도체가 장중 회복 후 강하게 마감하며 환율 노이즈보다 실적 논리가 우세함을 보여줬습니다.",
  },
  "news-014": {
    title: "해상 운송 차질 뉴스에 에너지주가 단기 강세",
    summary:
      "공급 차질 헤드라인이 나오자 원유 민감 에너지주에 매수세가 유입됐지만 원자재 전반의 동행 확인은 약했습니다.",
    marketInterpretation:
      "첫날 반응은 강했지만 이후 확인 데이터가 약해 지속 추세로 보기엔 신뢰도가 낮았습니다.",
    actionIdea:
      "에너지 상승은 전술적으로 대응하되, 원유가 추세 확인을 주지 못하면 빠르게 방어적으로 전환합니다.",
    followUpNote: "에너지주는 일부 상승을 지켰지만 공급 이슈가 확대되지 않아 전체 흐름은 둔해졌습니다.",
  },
  "news-015": {
    title: "AI 공급망 밸류에이션이 단기 과열권에 진입",
    summary:
      "AI 대표주가 이틀 연속 급등한 뒤 밸류에이션 부담이 커져 추가 매수는 더 좋은 가격을 기다리는 편이 유리해졌습니다.",
    marketInterpretation:
      "장기 추세는 건강하지만 연속 멀티플 확장 구간에서 추격 매수의 보상비율은 낮아졌습니다.",
    actionIdea:
      "포지션은 유지하되 추가 매수는 조정 이후로 미루고, 상대적으로 덜 붐빈 2차 공급망을 우선 검토합니다.",
    followUpNote: "이후 하루 쉬어가며 더 나은 재진입 가격을 제공했고, 큰 추세 훼손 없이 정리됐습니다.",
  },
  "news-016": {
    title: "국내 은행주가 장단기 금리차 기대 속 상대강세",
    summary:
      "명목금리 상단이 높아질 수 있다는 기대가 형성되며 국내 은행주가 안정적인 대안으로 부각됐습니다.",
    marketInterpretation:
      "위험자산 선호 국면에서도 은행이 포트폴리오 안정판 역할을 해줄 수 있다는 점이 다시 확인됐습니다.",
    actionIdea:
      "은행은 단순 금리 트레이드보다 국내 베타 내 방어 축으로 접근하는 편이 좋습니다.",
    followUpNote: "순환매 속에서도 은행 상대강세가 유지되며 포트폴리오 방어축 역할을 해냈습니다.",
  },
};

const followUpOverrides: Record<string, Partial<FollowUpRecord>> = {
  "follow-001": {
    outcomeSummary:
      "입찰 이후 예상대로 장기채가 반등했지만, 이후 Fed 발언이 강해지며 상승폭 일부를 반납했습니다.",
    resultNote:
      "전술적 반등이라는 framing이 적절했습니다. 추세 전환으로 과대해석하지 않았다는 점이 좋았습니다.",
    marketImpact: "TLT는 첫날 반등을 지키며 이전 저점 위에서 마감했습니다.",
  },
  "follow-002": {
    outcomeSummary:
      "환율 헤드라인이 약해지자 반도체 리더십이 빠르게 복구되며 다음 세션까지 강세가 이어졌습니다.",
    resultNote:
      "수출주를 성급히 역추세로 보지 않고 실적 논리를 우선한 판단이 유효했습니다.",
    marketImpact: "Samsung Electronics와 KODEX 200은 장중 눌림을 하루 안에 대부분 되돌렸습니다.",
  },
  "follow-003": {
    outcomeSummary:
      "에너지주는 일부 강세를 지켰지만 기대했던 광범위한 돌파 흐름까지는 이어지지 않았습니다.",
    resultNote:
      "헤드라인 자체는 의미가 있었지만 후속 확인이 약해 고확신 지속 시나리오로 보긴 어려웠습니다.",
    marketImpact: "XLE는 강세를 일부 유지했지만 원유 자체의 힘은 빠르게 둔화됐습니다.",
  },
  "follow-004": {
    outcomeSummary:
      "AI 리더들은 숨 고르기를 거치며 더 나은 재진입 가격을 제공했고 큰 추세 훼손은 없었습니다.",
    resultNote:
      "약세 전환이 아니라 과열 구간 경계로 접근한 판단이 entry quality를 높였습니다.",
    marketImpact: "NVDA와 QQQ는 급등 이후 횡보하며 밸류에이션 부담을 일부 소화했습니다.",
  },
  "follow-005": {
    outcomeSummary:
      "국내 은행주는 순환매 구간에서도 상대강세를 유지하며 포트폴리오 안정 역할을 했습니다.",
    resultNote:
      "공격적 업사이드보다 균형 축으로 해석한 접근이 실제 포트폴리오 운용과 잘 맞았습니다.",
    marketImpact: "KB Financial은 다음 세션에서도 KOSPI 대비 상대강세를 유지했습니다.",
  },
  "follow-006": {
    outcomeSummary:
      "공급망 전반으로 투자 확산이 이어지는지 보려면 다음 가이던스와 발주 잔고 확인이 필요합니다.",
    resultNote: "메모리와 하이퍼스케일러 지표를 다음 주간 점검에서 계속 추적합니다.",
    marketImpact: "결과 확인 대기 중입니다.",
  },
  "follow-007": {
    outcomeSummary:
      "방산 백로그 스토리는 유효해 보이지만 계약 시점과 수익성 전환을 더 봐야 합니다.",
    resultNote: "관심종목으로 유지하며 다음 경영진 코멘트 시점에 다시 점검합니다.",
    marketImpact: "결과 확인 대기 중입니다.",
  },
  "follow-008": {
    outcomeSummary:
      "금이 하루짜리 반등인지 실제 방어 헤지로 자리잡는지 보려면 추가 추세 확인이 필요합니다.",
    resultNote: "실질금리와 주식 시장 breadth 변화를 함께 비교해서 확인합니다.",
    marketImpact: "결과 확인 대기 중입니다.",
  },
};

const portfolioOverrides: Record<string, Partial<PortfolioItem>> = {
  "portfolio-001": {
    memo: "AI 메모리 핵심 보유주입니다. 수출과 가격 지표가 확인되는 눌림에서 추가 매수를 선호합니다.",
  },
  "portfolio-002": {
    memo: "장기 보유 핵심 성장주지만 단기 급등 구간에서는 비중 과확대를 피합니다.",
  },
  "portfolio-003": {
    memo: "성장 베타의 중심축입니다. 장기금리 민감도를 함께 점검해야 합니다.",
  },
  "portfolio-004": {
    memo: "Fed 발언 이후 더 좋은 듀레이션 진입 구간을 기다리는 관심 ETF입니다.",
  },
  "portfolio-005": {
    memo: "성장 폭이 좁아질 때 방어 헤지 역할을 기대하는 관심 자산입니다.",
  },
  "portfolio-006": {
    memo: "방산 CAPEX 테마에서 우선순위가 높은 관심 종목입니다.",
  },
};

export function getDisplayTheme(theme: Theme) {
  return { ...theme, ...themeOverrides[theme.id] };
}

export function getDisplayTicker(ticker: Ticker) {
  return { ...ticker, ...tickerOverrides[ticker.id] };
}

export function getDisplayNewsItem(item: NewsItem) {
  return { ...item, ...newsOverrides[item.id] };
}

export function getDisplayFollowUp(record: FollowUpRecord) {
  return { ...record, ...followUpOverrides[record.id] };
}

export function getDisplayPortfolioItem(item: PortfolioItem) {
  return { ...item, ...portfolioOverrides[item.id] };
}
