export interface AnimalAvatarInfo {
  id: string;
  name: string;
  emoji: string;
  title: string;
  primaryColor: string;
  secondaryColor: string;
  accentBg: string;
  borderGlow: string;
  description: string;
}

export const ANIMAL_AVATARS: AnimalAvatarInfo[] = [
  {
    id: "shiba",
    name: "元氣柴柴",
    emoji: "🐕",
    title: "元氣衝鋒者",
    primaryColor: "#F59E0B",
    secondaryColor: "#D97706",
    accentBg: "from-amber-500/20 via-amber-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(245,158,11,0.45)] border-amber-500/50",
    description: "活力滿點，答題快狠準的忠心柴犬！",
  },
  {
    id: "panda",
    name: "呆萌胖達",
    emoji: "🐼",
    title: "竹林智多星",
    primaryColor: "#10B981",
    secondaryColor: "#059669",
    accentBg: "from-emerald-500/20 via-emerald-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(16,185,129,0.45)] border-emerald-500/50",
    description: "看似慢條斯理，實則胸有成竹的國寶熊貓！",
  },
  {
    id: "fox",
    name: "機靈赤狐",
    emoji: "🦊",
    title: "極限解題官",
    primaryColor: "#F97316",
    secondaryColor: "#EA580C",
    accentBg: "from-orange-500/20 via-orange-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(249,115,22,0.45)] border-orange-500/50",
    description: "敏銳狡黠，洞悉一切題目陷阱的赤色靈狐！",
  },
  {
    id: "lion",
    name: "王者小獅",
    emoji: "🦁",
    title: "榮耀之王",
    primaryColor: "#EAB308",
    secondaryColor: "#CA8A04",
    accentBg: "from-yellow-500/20 via-yellow-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(234,179,8,0.45)] border-yellow-500/50",
    description: "霸氣領先，擁有絕對自信與統御力的草原之王！",
  },
  {
    id: "tiger",
    name: "閃電小虎",
    emoji: "🐯",
    title: "疾風猛虎",
    primaryColor: "#FB923C",
    secondaryColor: "#C2410C",
    accentBg: "from-orange-600/20 via-red-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(251,146,60,0.45)] border-orange-400/50",
    description: "虎嘯生風，以閃電般速度連擊破題！",
  },
  {
    id: "koala",
    name: "悠哉無尾熊",
    emoji: "🐨",
    title: "冷靜大師",
    primaryColor: "#64748B",
    secondaryColor: "#475569",
    accentBg: "from-slate-500/20 via-slate-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(100,116,139,0.45)] border-slate-400/50",
    description: "泰山崩於前而色不變，極致冷靜的沉著考霸！",
  },
  {
    id: "penguin",
    name: "滑雪企鵝",
    emoji: "🐧",
    title: "極地滑翔客",
    primaryColor: "#06B6D4",
    secondaryColor: "#0891B2",
    accentBg: "from-cyan-500/20 via-cyan-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(6,182,212,0.45)] border-cyan-400/50",
    description: "在考卷的冰天雪地中優雅滑行，從不失誤！",
  },
  {
    id: "rabbit",
    name: "活力兔兔",
    emoji: "🐰",
    title: "月影躍動者",
    primaryColor: "#EC4899",
    secondaryColor: "#DB2777",
    accentBg: "from-pink-500/20 via-pink-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(236,72,153,0.45)] border-pink-400/50",
    description: "蹦跳敏捷，靈感如泉湧般的幸運之兔！",
  },
  {
    id: "cat",
    name: "喵星守衛",
    emoji: "🐱",
    title: "優雅暗影",
    primaryColor: "#8B5CF6",
    secondaryColor: "#7C3AED",
    accentBg: "from-purple-500/20 via-purple-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(139,92,246,0.45)] border-purple-400/50",
    description: "優雅傲嬌，精準捕捉每一道正確選項！",
  },
  {
    id: "owl",
    name: "智者貓頭鷹",
    emoji: "🦉",
    title: "全知博學者",
    primaryColor: "#14B8A6",
    secondaryColor: "#0D9488",
    accentBg: "from-teal-500/20 via-teal-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(20,184,166,0.45)] border-teal-400/50",
    description: "通曉萬物，黑夜中依然目光如炬的智慧導師！",
  },
  {
    id: "deer",
    name: "森之小鹿",
    emoji: "🦌",
    title: "靈性守護神",
    primaryColor: "#FB7185",
    secondaryColor: "#E11D48",
    accentBg: "from-rose-500/20 via-rose-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(251,113,133,0.45)] border-rose-400/50",
    description: "靈氣逼人，自帶平和光環的森林祥瑞之鹿！",
  },
  {
    id: "monkey",
    name: "敏捷小猴",
    emoji: "🐵",
    title: "神通靈猴",
    primaryColor: "#D97706",
    secondaryColor: "#B45309",
    accentBg: "from-amber-600/20 via-amber-700/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(217,119,6,0.45)] border-amber-600/50",
    description: "七十二變應對百般考題，機動靈活的神通小將！",
  },
];

export function getAnimalAvatar(id: string): AnimalAvatarInfo {
  const found = ANIMAL_AVATARS.find((a) => a.id === id);
  return found || ANIMAL_AVATARS[0];
}
