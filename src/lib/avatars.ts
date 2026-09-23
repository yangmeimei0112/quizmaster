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
    title: "元氣麻糬包",
    primaryColor: "#F59E0B",
    secondaryColor: "#D97706",
    accentBg: "from-amber-500/20 via-amber-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(245,158,11,0.45)] border-amber-500/50",
    description: "圓滾麻糬鼓腮、水汪汪大眼吐著小粉舌，活力滿點的忠心柴犬！",
  },
  {
    id: "panda",
    name: "呆萌胖達",
    emoji: "🐼",
    title: "竹林小食神",
    primaryColor: "#10B981",
    secondaryColor: "#059669",
    accentBg: "from-emerald-500/20 via-emerald-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(16,185,129,0.45)] border-emerald-500/50",
    description: "八字萌萌黑眼圈、嘴咬鮮嫩小竹葉，天然呆萌的國寶小熊貓！",
  },
  {
    id: "fox",
    name: "機靈赤狐",
    emoji: "🦊",
    title: "靈動小仙狐",
    primaryColor: "#F97316",
    secondaryColor: "#EA580C",
    accentBg: "from-orange-500/20 via-orange-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(249,115,22,0.45)] border-orange-500/50",
    description: "蓬鬆雪白雙頰、靈動雙高光大眼與俏皮:3微笑，聰穎俏麗的赤狐！",
  },
  {
    id: "lion",
    name: "王者小獅",
    emoji: "🦁",
    title: "太陽花萌王",
    primaryColor: "#EAB308",
    secondaryColor: "#CA8A04",
    accentBg: "from-yellow-500/20 via-yellow-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(234,179,8,0.45)] border-yellow-500/50",
    description: "向日葵波浪雲朵鬃毛、頭頂歪戴迷你小金冠，陽光開朗的萌系小王！",
  },
  {
    id: "tiger",
    name: "閃電小虎",
    emoji: "🐯",
    title: "奶凶小萌虎",
    primaryColor: "#FB923C",
    secondaryColor: "#C2410C",
    accentBg: "from-orange-600/20 via-red-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(251,146,60,0.45)] border-orange-400/50",
    description: "圓耳小虎頭、額前萌萌王字印，微露一顆雪白小虎牙的元氣小虎！",
  },
  {
    id: "koala",
    name: "悠哉無尾熊",
    emoji: "🐨",
    title: "棉花糖考霸",
    primaryColor: "#64748B",
    secondaryColor: "#475569",
    accentBg: "from-slate-500/20 via-slate-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(100,116,139,0.45)] border-slate-400/50",
    description: "棉花糖大圓耳、反光黑軟大鼻子，耳朵別著尤加利葉的療癒系考霸！",
  },
  {
    id: "penguin",
    name: "滑雪企鵝",
    emoji: "🐧",
    title: "冰原小湯圓",
    primaryColor: "#06B6D4",
    secondaryColor: "#0891B2",
    accentBg: "from-cyan-500/20 via-cyan-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(6,182,212,0.45)] border-cyan-400/50",
    description: "心形白臉盤、頭戴粉青毛線帽、橘黃小萌嘴，搖擺滑雪的小可愛！",
  },
  {
    id: "rabbit",
    name: "活力兔兔",
    emoji: "🐰",
    title: "草莓折耳兔",
    primaryColor: "#EC4899",
    secondaryColor: "#DB2777",
    accentBg: "from-pink-500/20 via-pink-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(236,72,153,0.45)] border-pink-400/50",
    description: "一立一垂俏皮折耳、紅寶石星光雙眸、耳旁別著小白花，甜美幸運兔！",
  },
  {
    id: "cat",
    name: "喵星守衛",
    emoji: "🐱",
    title: "星光琉璃喵",
    primaryColor: "#8B5CF6",
    secondaryColor: "#7C3AED",
    accentBg: "from-purple-500/20 via-purple-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(139,92,246,0.45)] border-purple-400/50",
    description: "金色琉璃星空大眼、軟萌下垂鬍鬚與:3肉球小嘴，優雅傲嬌的魔法喵！",
  },
  {
    id: "owl",
    name: "智者貓頭鷹",
    emoji: "🦉",
    title: "圓鏡小博士",
    primaryColor: "#14B8A6",
    secondaryColor: "#0D9488",
    accentBg: "from-teal-500/20 via-teal-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(20,184,166,0.45)] border-teal-400/50",
    description: "圓滾小糰子、戴著大圓黑框學者眼鏡、胸前愛心羽毛，博學又呆萌！",
  },
  {
    id: "deer",
    name: "森之小鹿",
    emoji: "🦌",
    title: "嫩芽小仙鹿",
    primaryColor: "#FB7185",
    secondaryColor: "#E11D48",
    accentBg: "from-rose-500/20 via-rose-600/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(251,113,133,0.45)] border-rose-400/50",
    description: "楚楚動人的無辜大鹿眼、鹿角上長出翠綠小嫩芽，自帶仙氣的森林精靈！",
  },
  {
    id: "monkey",
    name: "敏捷小猴",
    emoji: "🐵",
    title: "眨眼小頑童",
    primaryColor: "#D97706",
    secondaryColor: "#B45309",
    accentBg: "from-amber-600/20 via-amber-700/10 to-transparent",
    borderGlow: "shadow-[0_0_20px_rgba(217,119,6,0.45)] border-amber-600/50",
    description: "超大圓圓招風耳、愛心桃子面盤、調皮眨單眼(Wink)與酒窩笑臉！",
  },
];

export function getAnimalAvatar(id: string): AnimalAvatarInfo {
  const found = ANIMAL_AVATARS.find((a) => a.id === id);
  return found || ANIMAL_AVATARS[0];
}
