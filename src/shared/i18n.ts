export interface Dictionary {
  "home.title": string;
  "home.tripTitleLabel": string;
  "home.tripTitlePlaceholder": string;
  "home.destination": string;
  "home.destinationPlaceholder": string;
  "home.start": string;
  "home.end": string;
  "home.tripType": string;
  "home.tripTypeFriends": string;
  "home.tripTypeFamily": string;
  "home.createButton": string;
  "home.creating": string;
  "home.generating": string;

  "join.yourName": string;
  "join.namePlaceholder": string;
  "join.ageGroup": string;
  "join.ageGroupAdult": string;
  "join.ageGroupTeen": string;
  "join.ageGroupChild": string;
  "join.ageGroupInfant": string;
  "join.medicalNotes": string;
  "join.medicalNotesPlaceholder": string;
  "join.joinButton": string;

  "trip.notFound": string;
  "trip.loading": string;

  "header.itinerary": string;
  "header.packing": string;
  "header.export": string;
  "header.votingOn": string;
  "header.votingOff": string;

  "day.label": string; // "Day {n}"

  "dayof.today": string;
  "dayof.next": string;
  "dayof.noStops": string;
  "dayof.imHere": string;
  "dayof.imHereChecked": string;
  "dayof.hereNow": string;

  "totals.dayTotal": string;
  "totals.tripTotal": string;

  "timeline.noPlaces": string;
  "timeline.upForVote": string;
  "timeline.promote": string;
  "timeline.markPlanned": string;
  "timeline.findHotels": string;
  "timeline.checkPrice": string;
  "timeline.checking": string;
  "timeline.noPriceFound": string;
  "timeline.source": string;
  "timeline.usePrice": string;
  "timeline.cached": string;
  "timeline.hereNow": string;

  "addPlace.searchPlaceholder": string;
  "addPlace.upForVoteLabel": string;
  "addPlace.searching": string;

  "packing.groupGear": string;
  "packing.yourChecklist": string;
  "packing.noGear": string;
  "packing.addPlaceholder": string;
  "packing.addButton": string;
  "packing.claim": string;

  "hotels.title": string;
  "hotels.empty": string;
  "hotels.search": string;

  "export.noPlacesPlanned": string;
  "export.noSharedItems": string;
  "export.checklistOf": string; // "{emoji} {name}'s checklist"
  "export.memberNotes": string; // "Notes: {notes}"
  "export.footer": string;
}

export const en: Dictionary = {
  "home.title": "Plan a trip",
  "home.tripTitleLabel": "Trip title",
  "home.tripTitlePlaceholder": "Tokyo with friends",
  "home.destination": "Destination",
  "home.destinationPlaceholder": "Osaka, Japan",
  "home.start": "Start",
  "home.end": "End",
  "home.tripType": "Trip type",
  "home.tripTypeFriends": "Friends",
  "home.tripTypeFamily": "Family",
  "home.createButton": "Create trip",
  "home.creating": "Creating…",
  "home.generating": "Finding great spots for your trip… (~30-45s)",

  "join.yourName": "Your name",
  "join.namePlaceholder": "Kevin",
  "join.ageGroup": "Age group",
  "join.ageGroupAdult": "Adult",
  "join.ageGroupTeen": "Teen",
  "join.ageGroupChild": "Child",
  "join.ageGroupInfant": "Infant",
  "join.medicalNotes": "Medical / allergy notes (optional)",
  "join.medicalNotesPlaceholder": "e.g. peanut allergy, asthma inhaler",
  "join.joinButton": "Join trip",

  "trip.notFound": "Couldn't open this trip — the link may be wrong or expired.",
  "trip.loading": "Loading…",

  "header.itinerary": "Itinerary",
  "header.packing": "Packing",
  "header.export": "Export",
  "header.votingOn": "Voting: on",
  "header.votingOff": "Voting: off",

  "day.label": "Day {n}",

  "dayof.today": "TODAY",
  "dayof.next": "Next",
  "dayof.noStops": "No planned stops for today yet.",
  "dayof.imHere": "I'm here",
  "dayof.imHereChecked": "✓ I'm here",
  "dayof.hereNow": "here now",

  "totals.dayTotal": "Day total",
  "totals.tripTotal": "Trip total",

  "timeline.noPlaces": "No places yet — add your first stop below.",
  "timeline.upForVote": "up for vote",
  "timeline.promote": "promote to plan",
  "timeline.markPlanned": "mark as planned",
  "timeline.findHotels": "find hotels",
  "timeline.checkPrice": "check ticket price",
  "timeline.checking": "checking…",
  "timeline.noPriceFound": "no price found",
  "timeline.source": "source",
  "timeline.usePrice": "use this price",
  "timeline.cached": "cached",
  "timeline.hereNow": "here",

  "addPlace.searchPlaceholder": "Search a place to add…",
  "addPlace.upForVoteLabel": "🗳️ Add as \"up for vote\" instead of planned",
  "addPlace.searching": "Searching…",

  "packing.groupGear": "Group gear",
  "packing.yourChecklist": "Your checklist",
  "packing.noGear": "No shared gear yet — add the first-aid kit, speaker…",
  "packing.addPlaceholder": "Add group item…",
  "packing.addButton": "Add",
  "packing.claim": "claim",

  "hotels.title": "Suggested hotels",
  "hotels.empty": "No hotel suggestions yet.",
  "hotels.search": "search",

  "export.noPlacesPlanned": "No places planned.",
  "export.noSharedItems": "No shared items.",
  "export.checklistOf": "{emoji} {name}'s checklist",
  "export.memberNotes": "Notes: {notes}",
  "export.footer": "Exported from Friend Trip · works fully offline · nav links open your phone's map app when you have signal",
};

export const zh: Dictionary = {
  "home.title": "规划一次旅行",
  "home.tripTitleLabel": "行程名称",
  "home.tripTitlePlaceholder": "和朋友一起去东京",
  "home.destination": "目的地",
  "home.destinationPlaceholder": "大阪，日本",
  "home.start": "开始日期",
  "home.end": "结束日期",
  "home.tripType": "行程类型",
  "home.tripTypeFriends": "朋友",
  "home.tripTypeFamily": "家庭",
  "home.createButton": "创建行程",
  "home.creating": "创建中…",
  "home.generating": "正在为你寻找推荐地点…（约30-45秒）",

  "join.yourName": "你的名字",
  "join.namePlaceholder": "小凯",
  "join.ageGroup": "年龄组",
  "join.ageGroupAdult": "成人",
  "join.ageGroupTeen": "青少年",
  "join.ageGroupChild": "儿童",
  "join.ageGroupInfant": "婴儿",
  "join.medicalNotes": "医疗/过敏备注（选填）",
  "join.medicalNotesPlaceholder": "例如：花生过敏、哮喘吸入器",
  "join.joinButton": "加入行程",

  "trip.notFound": "无法打开此行程 —— 链接可能有误或已过期。",
  "trip.loading": "加载中…",

  "header.itinerary": "行程",
  "header.packing": "打包清单",
  "header.export": "导出",
  "header.votingOn": "投票：开启",
  "header.votingOff": "投票：关闭",

  "day.label": "第{n}天",

  "dayof.today": "今天",
  "dayof.next": "下一站",
  "dayof.noStops": "今天还没有计划的行程。",
  "dayof.imHere": "我在这里",
  "dayof.imHereChecked": "✓ 我在这里",
  "dayof.hereNow": "在这里",

  "totals.dayTotal": "当天花费",
  "totals.tripTotal": "行程总花费",

  "timeline.noPlaces": "还没有地点 —— 在下方添加第一站吧。",
  "timeline.upForVote": "待投票",
  "timeline.promote": "确定加入行程",
  "timeline.markPlanned": "标记为已计划",
  "timeline.findHotels": "查找酒店",
  "timeline.checkPrice": "查询门票价格",
  "timeline.checking": "查询中…",
  "timeline.noPriceFound": "未找到价格",
  "timeline.source": "来源",
  "timeline.usePrice": "使用此价格",
  "timeline.cached": "缓存结果",
  "timeline.hereNow": "在这里",

  "addPlace.searchPlaceholder": "搜索要添加的地点…",
  "addPlace.upForVoteLabel": "🗳️ 添加为「待投票」而非已计划",
  "addPlace.searching": "搜索中…",

  "packing.groupGear": "共用装备",
  "packing.yourChecklist": "我的清单",
  "packing.noGear": "还没有共用装备 —— 添加急救包、蓝牙音箱…",
  "packing.addPlaceholder": "添加共用物品…",
  "packing.addButton": "添加",
  "packing.claim": "认领",

  "hotels.title": "推荐酒店",
  "hotels.empty": "暂无酒店推荐。",
  "hotels.search": "搜索",

  "export.noPlacesPlanned": "还没有计划的地点。",
  "export.noSharedItems": "还没有共用物品。",
  "export.checklistOf": "{emoji} {name} 的清单",
  "export.memberNotes": "备注：{notes}",
  "export.footer": "由 Friend Trip 导出 · 完全离线可用 · 导航链接需要有网络信号时打开手机地图应用",
};

export type Lang = "en" | "zh";

export const dictionaries: Record<Lang, Dictionary> = { en, zh };
