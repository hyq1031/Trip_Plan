import type { Lang } from "./i18n";
import type { AgeGroup } from "./types";

/** Seeded onto a member's personal checklist when they join, by language and age group. */
export const PACKING_TEMPLATES: Record<Lang, Record<AgeGroup, string[]>> = {
  en: {
    adult: [
      "Passport / ID",
      "Phone charger",
      "Toothbrush",
      "Medication",
      "Sunscreen",
      "Change of clothes",
      "Power adapter",
    ],
    teen: ["Phone charger", "Headphones", "Toothbrush", "Change of clothes", "Power adapter", "Snacks"],
    child: ["Favorite toy", "Snacks", "Change of clothes", "Sunscreen", "Wet wipes", "Comfort blanket"],
    infant: [
      "Diapers",
      "Formula / milk",
      "Wipes",
      "Stroller",
      "Baby monitor",
      "Change of clothes",
      "Pacifier",
    ],
  },
  zh: {
    adult: ["护照/身份证", "手机充电器", "牙刷", "常用药品", "防晒霜", "换洗衣物", "转换插头"],
    teen: ["手机充电器", "耳机", "牙刷", "换洗衣物", "转换插头", "零食"],
    child: ["最爱的玩具", "零食", "换洗衣物", "防晒霜", "湿纸巾", "安抚毯"],
    infant: ["尿布", "奶粉/奶", "湿纸巾", "婴儿推车", "婴儿监视器", "换洗衣物", "安抚奶嘴"],
  },
};

/** Small badge shown next to a member's checklist heading; blank for the common "adult" case. */
export const AGE_GROUP_EMOJI: Record<AgeGroup, string> = {
  adult: "",
  teen: "🧑",
  child: "🧒",
  infant: "👶",
};
