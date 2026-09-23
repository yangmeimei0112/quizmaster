"use client";

import React from "react";
import { getAnimalAvatar } from "@/lib/avatars";

interface AnimalAvatarProps {
  id: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showBadge?: boolean;
  isGlowing?: boolean;
  animate?: boolean;
}

const sizeClasses = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-20 h-20 text-2xl",
  "2xl": "w-28 h-28 text-4xl",
};

export default function AnimalAvatar({
  id,
  size = "md",
  className = "",
  showBadge = false,
  isGlowing = false,
  animate = false,
}: AnimalAvatarProps) {
  const avatar = getAnimalAvatar(id);
  const uid = React.useId().replace(/[:]/g, "_");

  // Render high-fidelity Japanese Kawaii / Chibi SVG illustration for each animal
  const renderAnimalFace = (avatarId: string) => {
    switch (avatarId) {
      case "shiba":
        // 🐕 元氣柴柴：麻糬鼓腮包子臉、水汪汪雙高光大眼、白麻糬眉豆、吐舌微笑
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-shiba-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FB7185" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Ears with rounded tips */}
            <path d="M 22,34 C 18,16 30,8 38,20 C 42,26 44,32 42,36 Z" fill="#D97706" />
            <path d="M 25,32 C 22,20 30,14 36,22 C 39,26 40,30 38,33 Z" fill="#FDE68A" />
            <path d="M 78,34 C 82,16 70,8 62,20 C 58,26 56,32 58,36 Z" fill="#D97706" />
            <path d="M 75,32 C 78,20 70,14 64,22 C 61,26 60,30 62,33 Z" fill="#FDE68A" />

            {/* Chubby Round Head */}
            <ellipse cx="50" cy="54" rx="36" ry="32" fill="#F59E0B" />

            {/* White Mochi Cheeks & Muzzle */}
            <path
              d="M 22,56 C 20,74 36,84 50,84 C 64,84 80,74 78,56 C 76,46 64,52 50,55 C 36,52 24,46 22,56 Z"
              fill="#FFFBEB"
            />

            {/* Soft Peach Blushes */}
            <ellipse cx="26" cy="63" rx="6.5" ry="4.5" fill={`url(#${uid}-shiba-blush)`} />
            <ellipse cx="74" cy="63" rx="6.5" ry="4.5" fill={`url(#${uid}-shiba-blush)`} />

            {/* Cute Mochi Eyebrow Dots */}
            <ellipse cx="35" cy="38" rx="3.5" ry="2.5" fill="#FFFBEB" />
            <ellipse cx="65" cy="38" rx="3.5" ry="2.5" fill="#FFFBEB" />

            {/* Big Shiny Anime Eyes with Double Catchlights */}
            <g id="shiba-left-eye">
              <ellipse cx="36" cy="48" rx="5" ry="5.5" fill="#1E293B" />
              <circle cx="34.5" cy="46" r="2" fill="#FFFFFF" />
              <circle cx="38" cy="51" r="1" fill="#FFFFFF" opacity="0.85" />
            </g>
            <g id="shiba-right-eye">
              <ellipse cx="64" cy="48" rx="5" ry="5.5" fill="#1E293B" />
              <circle cx="62.5" cy="46" r="2" fill="#FFFFFF" />
              <circle cx="66" cy="51" r="1" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* Tiny Button Nose */}
            <path d="M 46,57 Q 50,55 54,57 Q 50,62 46,57 Z" fill="#1E293B" />

            {/* Happy Open Smile with Pink Tongue */}
            <path d="M 45,63 Q 50,66 55,63" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 47,64 Q 50,73 53,64 Z" fill="#FDA4AF" />
          </g>
        );

      case "panda":
        // 🐼 呆萌胖達：圓滾大福臉、八字萌萌黑眼圈、水潤大眼、嘴咬鮮脆小竹葉
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-panda-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F472B6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Big Round Bobble Ears */}
            <circle cx="22" cy="25" r="13" fill="#0F172A" />
            <circle cx="22" cy="25" r="6" fill="#1E293B" />
            <circle cx="78" cy="25" r="13" fill="#0F172A" />
            <circle cx="78" cy="25" r="6" fill="#1E293B" />

            {/* Pure White Snowball Head */}
            <ellipse cx="50" cy="56" rx="37" ry="33" fill="#FFFFFF" />

            {/* Soft Downward-Slanted Eye Patches (八字眼圈) */}
            <ellipse cx="33" cy="52" rx="10" ry="12" fill="#0F172A" transform="rotate(-15 33 52)" />
            <ellipse cx="67" cy="52" rx="10" ry="12" fill="#0F172A" transform="rotate(15 67 52)" />

            {/* Super Kawaii Big Eyes inside patches */}
            <circle cx="34" cy="50" r="4.5" fill="#1E293B" />
            <circle cx="33" cy="48.5" r="2" fill="#FFFFFF" />
            <circle cx="36" cy="52" r="1" fill="#FFFFFF" opacity="0.8" />

            <circle cx="66" cy="50" r="4.5" fill="#1E293B" />
            <circle cx="65" cy="48.5" r="2" fill="#FFFFFF" />
            <circle cx="68" cy="52" r="1" fill="#FFFFFF" opacity="0.8" />

            {/* Rosy Baby Pink Blushes */}
            <ellipse cx="23" cy="65" rx="7" ry="4.5" fill={`url(#${uid}-panda-blush)`} />
            <ellipse cx="77" cy="65" rx="7" ry="4.5" fill={`url(#${uid}-panda-blush)`} />

            {/* Cute Black Button Nose & Innocent Smile */}
            <ellipse cx="50" cy="62" rx="4.5" ry="3" fill="#0F172A" />
            <path d="M 45,67 Q 50,71 55,67" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" fill="none" />

            {/* Tiny Fresh Green Bamboo Sprout in Mouth */}
            <path d="M 54,67 Q 64,62 70,60 Q 64,66 54,67 Z" fill="#10B981" />
            <circle cx="64" cy="62" r="1.5" fill="#34D399" />
          </g>
        );

      case "fox":
        // 🦊 機靈赤狐：蓬鬆雪白雙頰、靈動雙高光大眼、俏皮 :3 微笑、暖橘絨耳
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-fox-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F87171" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#F87171" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Big Cute Ears with Fluffy White Tuft */}
            <path d="M 18,36 C 14,14 26,4 38,18 C 44,25 46,32 44,38 Z" fill="#EA580C" />
            <path d="M 23,34 C 20,18 28,10 36,20 C 40,26 40,30 38,34 Z" fill="#FFF7ED" />
            <path d="M 82,36 C 86,14 74,4 62,18 C 56,25 54,32 56,38 Z" fill="#EA580C" />
            <path d="M 77,34 C 80,18 72,10 64,20 C 60,26 60,30 62,34 Z" fill="#FFF7ED" />

            {/* Rounded Fox Head */}
            <ellipse cx="50" cy="54" rx="35" ry="30" fill="#F97316" />

            {/* Fluffy Snow White Cheek Tufts */}
            <path
              d="M 16,54 C 18,74 38,82 50,82 C 62,82 82,74 84,54 C 80,48 70,54 50,56 C 30,54 20,48 16,54 Z"
              fill="#FFF7ED"
            />

            {/* Forehead White Diamond Flame Mark */}
            <path d="M 50,38 Q 47,44 50,49 Q 53,44 50,38 Z" fill="#FFF7ED" />

            {/* Blushes */}
            <ellipse cx="26" cy="62" rx="6" ry="4" fill={`url(#${uid}-fox-blush)`} />
            <ellipse cx="74" cy="62" rx="6" ry="4" fill={`url(#${uid}-fox-blush)`} />

            {/* Sparkly Almond Anime Eyes */}
            <g id="fox-left-eye">
              <ellipse cx="36" cy="48" rx="4.8" ry="5.2" fill="#1E293B" transform="rotate(-6 36 48)" />
              <circle cx="34.5" cy="46" r="2" fill="#FFFFFF" />
              <circle cx="37.5" cy="50.5" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>
            <g id="fox-right-eye">
              <ellipse cx="64" cy="48" rx="4.8" ry="5.2" fill="#1E293B" transform="rotate(6 64 48)" />
              <circle cx="62.5" cy="46" r="2" fill="#FFFFFF" />
              <circle cx="65.5" cy="50.5" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Cute Black Button Nose Tip */}
            <ellipse cx="50" cy="61" rx="3.5" ry="2.5" fill="#1E293B" />
            {/* Cute :3 Kitty Mouth */}
            <path d="M 45,66 Q 48,69 50,67 Q 52,69 55,66" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "lion":
        // 🦁 王者小獅：向日葵波浪雲朵鬃毛、歪戴微光小金冠、陽光純真大眼、活力大笑
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-lion-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FB923C" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#FB923C" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Puffy Sunflower Cloud Mane */}
            <circle cx="50" cy="53" r="41" fill="#CA8A04" />
            <circle cx="28" cy="28" r="11" fill="#EAB308" />
            <circle cx="72" cy="28" r="11" fill="#EAB308" />
            <circle cx="16" cy="53" r="11" fill="#EAB308" />
            <circle cx="84" cy="53" r="11" fill="#EAB308" />
            <circle cx="28" cy="78" r="11" fill="#EAB308" />
            <circle cx="72" cy="78" r="11" fill="#EAB308" />
            <circle cx="50" cy="85" r="11" fill="#EAB308" />
            <circle cx="50" cy="18" r="10" fill="#EAB308" />

            {/* Cute Little Round Ears */}
            <circle cx="26" cy="32" r="8" fill="#FACC15" />
            <circle cx="26" cy="32" r="4.5" fill="#FEF08A" />
            <circle cx="74" cy="32" r="8" fill="#FACC15" />
            <circle cx="74" cy="32" r="4.5" fill="#FEF08A" />

            {/* Rounded Chubby Face */}
            <ellipse cx="50" cy="56" rx="29" ry="26" fill="#FACC15" />

            {/* Tilted Tiny Cute Gold Crown on head */}
            <g transform="translate(42, 14) rotate(-12)">
              <polygon points="0,12 3,2 8,8 13,2 16,12" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.2" />
              <circle cx="8" cy="8" r="1.5" fill="#EF4444" />
            </g>

            {/* Soft Cream Muzzle */}
            <ellipse cx="50" cy="66" rx="14" ry="10" fill="#FEF08A" />

            {/* Warm Sunset Blushes */}
            <ellipse cx="28" cy="62" rx="5.5" ry="3.5" fill={`url(#${uid}-lion-blush)`} />
            <ellipse cx="72" cy="62" rx="5.5" ry="3.5" fill={`url(#${uid}-lion-blush)`} />

            {/* Radiant Big Eyes */}
            <g id="lion-left-eye">
              <ellipse cx="38" cy="49" rx="4.5" ry="5.5" fill="#1E293B" />
              <circle cx="36.5" cy="47" r="2" fill="#FFFFFF" />
              <circle cx="39.5" cy="52" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>
            <g id="lion-right-eye">
              <ellipse cx="62" cy="49" rx="4.5" ry="5.5" fill="#1E293B" />
              <circle cx="60.5" cy="47" r="2" fill="#FFFFFF" />
              <circle cx="63.5" cy="52" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Brown Heart Nose & Big Happy Smile */}
            <path d="M 46,62 Q 50,60 54,62 Q 50,67 46,62 Z" fill="#78350F" />
            <path d="M 46,68 Q 50,73 54,68" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "tiger":
        // 🐯 閃電小虎：圓圓小虎耳、額前迷你萌萌王字斑、蜜桃腮紅、微露尖萌乳牙
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-tiger-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FB7185" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Thick Round Ears */}
            <circle cx="23" cy="27" r="12" fill="#C2410C" />
            <circle cx="23" cy="27" r="7" fill="#FED7AA" />
            <circle cx="77" cy="27" r="12" fill="#C2410C" />
            <circle cx="77" cy="27" r="7" fill="#FED7AA" />

            {/* Plump Orange Head */}
            <ellipse cx="50" cy="55" rx="36" ry="31" fill="#FB923C" />

            {/* Mini Cute '王' Mark on Forehead */}
            <path d="M 43,26 L 57,26 M 46,31 L 54,31 M 42,36 L 58,36 M 50,26 L 50,36" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" />

            {/* Cute Soft Stripes on Cheeks */}
            <path d="M 18,52 Q 26,50 24,54" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 18,58 Q 26,56 24,60" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 82,52 Q 74,50 76,54" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 82,58 Q 74,56 76,60" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" />

            {/* Soft Cream Muzzle */}
            <ellipse cx="50" cy="67" rx="16" ry="11" fill="#FFF7ED" />

            {/* Blushes */}
            <ellipse cx="27" cy="63" rx="6" ry="4" fill={`url(#${uid}-tiger-blush)`} />
            <ellipse cx="73" cy="63" rx="6" ry="4" fill={`url(#${uid}-tiger-blush)`} />

            {/* Energetic Anime Eyes */}
            <g id="tiger-left-eye">
              <ellipse cx="37" cy="48" rx="4.8" ry="5.5" fill="#1E293B" />
              <circle cx="35.5" cy="46" r="2" fill="#FFFFFF" />
              <circle cx="38.5" cy="51" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>
            <g id="tiger-right-eye">
              <ellipse cx="63" cy="48" rx="4.8" ry="5.5" fill="#1E293B" />
              <circle cx="61.5" cy="46" r="2" fill="#FFFFFF" />
              <circle cx="64.5" cy="51" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Pink Button Nose */}
            <ellipse cx="50" cy="62" rx="4" ry="2.8" fill="#C2410C" />
            {/* Smile with tiny cute tooth */}
            <path d="M 45,67 Q 50,71 55,67" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <polygon points="52,68 54,72 56,68" fill="#FFFFFF" />
          </g>
        );

      case "koala":
        // 🐨 悠哉無尾熊：棉花糖超大圓耳、軟萌大黑橡膠鼻、睡眼萌感、尤加利小萌葉
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-koala-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F472B6" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Giant Fluffy Marshmallow Ears */}
            <circle cx="16" cy="38" r="16" fill="#94A3B8" />
            <circle cx="16" cy="38" r="10" fill="#F1F5F9" />
            <circle cx="84" cy="38" r="16" fill="#94A3B8" />
            <circle cx="84" cy="38" r="10" fill="#F1F5F9" />

            {/* Soft Gray Head */}
            <ellipse cx="50" cy="56" rx="35" ry="30" fill="#64748B" />

            {/* Innocent Wide-Set Eyes */}
            <g id="koala-left-eye">
              <ellipse cx="32" cy="49" rx="4.2" ry="5" fill="#0F172A" />
              <circle cx="31" cy="47.5" r="1.8" fill="#FFFFFF" />
              <circle cx="33" cy="51.5" r="0.9" fill="#FFFFFF" opacity="0.8" />
            </g>
            <g id="koala-right-eye">
              <ellipse cx="68" cy="49" rx="4.2" ry="5" fill="#0F172A" />
              <circle cx="67" cy="47.5" r="1.8" fill="#FFFFFF" />
              <circle cx="69" cy="51.5" r="0.9" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Big Shiny Rubber Nose (Heart of Koala) */}
            <ellipse cx="50" cy="56" rx="9" ry="13" fill="#1E293B" />
            <ellipse cx="48" cy="51" rx="3" ry="4.5" fill="#475569" opacity="0.7" />
            <circle cx="47" cy="49" r="1.5" fill="#FFFFFF" opacity="0.8" />

            {/* Soft Rosy Blushes */}
            <ellipse cx="25" cy="64" rx="6" ry="4" fill={`url(#${uid}-koala-blush)`} />
            <ellipse cx="75" cy="64" rx="6" ry="4" fill={`url(#${uid}-koala-blush)`} />

            {/* Peaceful Baby Smile */}
            <path d="M 46,72 Q 50,75 54,72" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Tiny Eucalyptus Leaf on Ear */}
            <path d="M 78,24 Q 86,18 90,24 Q 86,30 78,24 Z" fill="#10B981" />
            <path d="M 78,24 L 88,24" stroke="#059669" strokeWidth="1" />
          </g>
        );

      case "penguin":
        // 🐧 滑雪企鵝：飯糰蛋蛋球體、頭戴粉萌毛線帽、心形天使面盤、扁圓亮橘小嘴
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-penguin-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FB7185" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Round Deep Navy Body */}
            <ellipse cx="50" cy="54" rx="36" ry="34" fill="#0F172A" />

            {/* Cute Knitted Winter Beanie on Top */}
            <path d="M 22,34 C 22,14 78,14 78,34 Z" fill="#06B6D4" />
            <rect x="20" y="32" width="60" height="7" rx="3.5" fill="#38BDF8" />
            <circle cx="50" cy="12" r="6" fill="#FDF2F8" />

            {/* Heart-Shaped Pure White Face Mask */}
            <path
              d="M 50,44 C 36,32 24,44 26,62 C 28,75 42,82 50,82 C 58,82 72,75 74,62 C 76,44 64,32 50,44 Z"
              fill="#F8FAFC"
            />

            {/* Rosy Peach Cheeks */}
            <ellipse cx="29" cy="62" rx="6" ry="4" fill={`url(#${uid}-penguin-blush)`} />
            <ellipse cx="71" cy="62" rx="6" ry="4" fill={`url(#${uid}-penguin-blush)`} />

            {/* Big Expressive Anime Eyes */}
            <g id="penguin-left-eye">
              <ellipse cx="38" cy="50" rx="4.8" ry="5.5" fill="#0F172A" />
              <circle cx="36.5" cy="48" r="2" fill="#FFFFFF" />
              <circle cx="39.5" cy="53" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>
            <g id="penguin-right-eye">
              <ellipse cx="62" cy="50" rx="4.8" ry="5.5" fill="#0F172A" />
              <circle cx="60.5" cy="48" r="2" fill="#FFFFFF" />
              <circle cx="63.5" cy="53" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Cute Rounded Tangerine Beak */}
            <path d="M 44,60 C 44,57 56,57 56,60 C 56,66 44,66 44,60 Z" fill="#F97316" />
          </g>
        );

      case "rabbit":
        // 🐰 活力兔兔：軟萌粉白包子臉、一垂一立俏皮折耳、紅寶石星光大眼、小白花飾品
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-rabbit-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F472B6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Left Standing Bunny Ear */}
            <ellipse cx="32" cy="18" rx="8" ry="18" fill="#FDF2F8" />
            <ellipse cx="32" cy="18" rx="4.5" ry="13" fill="#F472B6" />

            {/* Right Cutely Flopped/Folded Ear (折耳萌感) */}
            <path d="M 64,30 C 64,12 80,10 82,24 C 84,32 72,36 64,30 Z" fill="#FDF2F8" />
            <path d="M 67,28 C 67,16 77,14 78,23 C 80,28 72,31 67,28 Z" fill="#F472B6" />

            {/* Little White Flower Accessory */}
            <circle cx="60" cy="30" r="3.5" fill="#FFFFFF" />
            <circle cx="60" cy="30" r="1.5" fill="#FDE047" />

            {/* Chubby White Bunny Head */}
            <ellipse cx="50" cy="58" rx="35" ry="30" fill="#FDF2F8" />

            {/* Big Strawberry Blushes */}
            <ellipse cx="26" cy="65" rx="7" ry="4.5" fill={`url(#${uid}-rabbit-blush)`} />
            <ellipse cx="74" cy="65" rx="7" ry="4.5" fill={`url(#${uid}-rabbit-blush)`} />

            {/* Sparkling Ruby Eyes with Dual Highlights */}
            <g id="rabbit-left-eye">
              <ellipse cx="36" cy="52" rx="4.8" ry="5.8" fill="#831843" />
              <circle cx="34.5" cy="50" r="2" fill="#FFFFFF" />
              <circle cx="38" cy="55" r="1" fill="#FFFFFF" opacity="0.85" />
            </g>
            <g id="rabbit-right-eye">
              <ellipse cx="64" cy="52" rx="4.8" ry="5.8" fill="#831843" />
              <circle cx="62.5" cy="50" r="2" fill="#FFFFFF" />
              <circle cx="66" cy="55" r="1" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* Tiny Pink Button Nose & Y-Shaped Mouth */}
            <ellipse cx="50" cy="63" rx="3" ry="2" fill="#DB2777" />
            <path d="M 46,67 Q 50,70 54,67" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "cat":
        // 🐱 喵星守衛：微尖紫羅蘭貓耳、琉璃金星光大眼、下垂軟萌小鬍鬚、:3 波浪波波嘴
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-cat-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#EC4899" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Cute Cat Ears */}
            <path d="M 22,34 C 18,14 30,8 44,24 Z" fill="#8B5CF6" />
            <path d="M 26,30 C 22,16 30,12 40,24 Z" fill="#EDE9FE" />
            <path d="M 78,34 C 82,14 70,8 56,24 Z" fill="#8B5CF6" />
            <path d="M 74,30 C 78,16 70,12 60,24 Z" fill="#EDE9FE" />

            {/* Plump Kitten Head */}
            <ellipse cx="50" cy="56" rx="36" ry="30" fill="#7C3AED" />

            {/* White Soft Face Mask */}
            <path
              d="M 24,56 C 22,74 38,82 50,82 C 62,82 78,74 76,56 C 74,48 64,54 50,56 C 36,54 26,48 24,56 Z"
              fill="#EDE9FE"
            />

            {/* Rosy Cheeks */}
            <ellipse cx="27" cy="63" rx="6.5" ry="4" fill={`url(#${uid}-cat-blush)`} />
            <ellipse cx="73" cy="63" rx="6.5" ry="4" fill={`url(#${uid}-cat-blush)`} />

            {/* Sparkling Golden Galaxy Cat Eyes */}
            <g id="cat-left-eye">
              <ellipse cx="36" cy="48" rx="5.2" ry="6" fill="#FDE047" />
              <ellipse cx="36" cy="48" rx="2.5" ry="5.5" fill="#1E1B4B" />
              <circle cx="34.5" cy="45.5" r="2" fill="#FFFFFF" />
              <circle cx="37.5" cy="51" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>
            <g id="cat-right-eye">
              <ellipse cx="64" cy="48" rx="5.2" ry="6" fill="#FDE047" />
              <ellipse cx="64" cy="48" rx="2.5" ry="5.5" fill="#1E1B4B" />
              <circle cx="62.5" cy="45.5" r="2" fill="#FFFFFF" />
              <circle cx="65.5" cy="51" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Drooping Soft Whiskers */}
            <path d="M 12,58 Q 24,60 28,61" stroke="#DDD6FE" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 12,65 Q 24,65 28,64" stroke="#DDD6FE" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 88,58 Q 76,60 72,61" stroke="#DDD6FE" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 88,65 Q 76,65 72,64" stroke="#DDD6FE" strokeWidth="1.8" strokeLinecap="round" />

            {/* Pink Button Nose & :3 Mouth */}
            <ellipse cx="50" cy="61" rx="3.5" ry="2.2" fill="#F472B6" />
            <path d="M 45,66 Q 48,69 50,67 Q 52,69 55,66" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "owl":
        // 🦉 智者貓頭鷹：木木梟球形呆萌感、大圓黑框學者眼鏡、水汪汪雙瞳、胸口愛心羽毛
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-owl-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FB7185" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Cute Ear Feather Tufts */}
            <path d="M 28,26 C 24,14 36,8 42,26 Z" fill="#0D9488" />
            <path d="M 72,26 C 76,14 64,8 58,26 Z" fill="#0D9488" />

            {/* Round Turquoise Ball Head */}
            <ellipse cx="50" cy="55" rx="36" ry="33" fill="#14B8A6" />

            {/* Giant Circular Spectacles (大圓黑框眼鏡，學者萌感) */}
            <circle cx="36" cy="49" r="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.8" />
            <circle cx="64" cy="49" r="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.8" />
            <line x1="49" y1="49" x2="51" y2="49" stroke="#0F172A" strokeWidth="2.8" />

            {/* Huge Sparkling Wise Eyes behind spectacles */}
            <circle cx="36" cy="49" r="7" fill="#0F172A" />
            <circle cx="34" cy="47" r="2.5" fill="#FFFFFF" />
            <circle cx="38" cy="52" r="1.2" fill="#FFFFFF" opacity="0.8" />

            <circle cx="64" cy="49" r="7" fill="#0F172A" />
            <circle cx="62" cy="47" r="2.5" fill="#FFFFFF" />
            <circle cx="66" cy="52" r="1.2" fill="#FFFFFF" opacity="0.8" />

            {/* Pink Blushes Outside Spectacles */}
            <ellipse cx="18" cy="62" rx="5" ry="3.5" fill={`url(#${uid}-owl-blush)`} />
            <ellipse cx="82" cy="62" rx="5" ry="3.5" fill={`url(#${uid}-owl-blush)`} />

            {/* Cute Amber Drop Beak */}
            <path d="M 46,55 Q 50,53 54,55 Q 50,66 46,55 Z" fill="#F59E0B" />

            {/* Chest Feather Scallops */}
            <path d="M 42,75 Q 50,79 58,75" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "deer":
        // 🦌 森之小鹿：小芽小鹿角、下垂無辜鹿眼、額頭白斑點、粉嫩仙氣小仙子
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-deer-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Cute Sprout Antlers with green baby leaf */}
            <path d="M 34,26 C 26,16 22,8 20,4 M 23,12 C 16,13 14,16 12,18" stroke="#78350F" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 66,26 C 74,16 78,8 80,4 M 77,12 C 84,13 86,16 88,18" stroke="#78350F" strokeWidth="2.8" strokeLinecap="round" />
            {/* Tiny sprout leaf on right horn */}
            <circle cx="82" cy="6" r="2.5" fill="#84CC16" />

            {/* Graceful Leaf-Shaped Ears */}
            <ellipse cx="20" cy="36" rx="11" ry="5.5" fill="#FB7185" transform="rotate(-30 20 36)" />
            <ellipse cx="20" cy="36" rx="7" ry="3" fill="#FFF1F2" transform="rotate(-30 20 36)" />
            <ellipse cx="80" cy="36" rx="11" ry="5.5" fill="#FB7185" transform="rotate(30 80 36)" />
            <ellipse cx="80" cy="36" rx="7" ry="3" fill="#FFF1F2" transform="rotate(30 80 36)" />

            {/* Sweet Fawn Head */}
            <ellipse cx="50" cy="58" rx="31" ry="27" fill="#F43F5E" />

            {/* Cute Dappled White Dots on Forehead */}
            <circle cx="50" cy="42" r="2.2" fill="#FFF1F2" />
            <circle cx="43" cy="46" r="1.8" fill="#FFF1F2" />
            <circle cx="57" cy="46" r="1.8" fill="#FFF1F2" />

            {/* Soft White Muzzle */}
            <ellipse cx="50" cy="68" rx="12" ry="8" fill="#FFF1F2" />

            {/* Innocent Big Doe Eyes */}
            <g id="deer-left-eye">
              <ellipse cx="37" cy="53" rx="4.8" ry="5.8" fill="#1E293B" />
              <circle cx="35.5" cy="51" r="2" fill="#FFFFFF" />
              <circle cx="39" cy="56" r="1" fill="#FFFFFF" opacity="0.85" />
            </g>
            <g id="deer-right-eye">
              <ellipse cx="63" cy="53" rx="4.8" ry="5.8" fill="#1E293B" />
              <circle cx="61.5" cy="51" r="2" fill="#FFFFFF" />
              <circle cx="65" cy="56" r="1" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* Strawberry Rose Blushes */}
            <ellipse cx="27" cy="64" rx="6" ry="4" fill={`url(#${uid}-deer-blush)`} />
            <ellipse cx="73" cy="64" rx="6" ry="4" fill={`url(#${uid}-deer-blush)`} />

            {/* Tiny Berry Nose */}
            <ellipse cx="50" cy="65" rx="3.5" ry="2.2" fill="#881337" />
          </g>
        );

      case "monkey":
        // 🐵 敏捷小猴：超大圓圓招風耳、愛心桃子面盤、調皮單眼眨眼 Wink 😉、可愛酒窩
        return (
          <g>
            <defs>
              <radialGradient id={`${uid}-monkey-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FB7185" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Big Teacup Round Ears */}
            <circle cx="15" cy="47" r="13" fill="#B45309" />
            <circle cx="15" cy="47" r="8" fill="#FED7AA" />
            <circle cx="85" cy="47" r="13" fill="#B45309" />
            <circle cx="85" cy="47" r="8" fill="#FED7AA" />

            {/* Chestnut Brown Head with Sprout Hair */}
            <circle cx="50" cy="53" r="33" fill="#D97706" />
            {/* Cute sprout hair tuft on head */}
            <path d="M 50,20 Q 52,14 56,16 Q 52,22 50,20 Z" fill="#D97706" />

            {/* Peach Heart-Shaped Face Mask */}
            <path
              d="M 50,44 C 36,26 22,46 32,68 C 38,78 46,80 50,80 C 54,80 62,78 68,68 C 78,46 64,26 50,44 Z"
              fill="#FED7AA"
            />

            {/* Warm Peach Blushes */}
            <ellipse cx="28" cy="64" rx="5.5" ry="3.5" fill={`url(#${uid}-monkey-blush)`} />
            <ellipse cx="72" cy="64" rx="5.5" ry="3.5" fill={`url(#${uid}-monkey-blush)`} />

            {/* Playful Winking Eyes: Left open sparkling, Right winking cute arc! */}
            <g id="monkey-left-eye">
              <ellipse cx="38" cy="48" rx="4.5" ry="5.5" fill="#1E293B" />
              <circle cx="36.5" cy="46" r="2" fill="#FFFFFF" />
              <circle cx="39.5" cy="51" r="1" fill="#FFFFFF" opacity="0.8" />
            </g>
            {/* Right eye: Playful Wink 😉 */}
            <path d="M 58,49 Q 63,43 68,49" stroke="#1E293B" strokeWidth="2.8" strokeLinecap="round" fill="none" />

            {/* Tiny Nostrils & Big Grin with Dimples */}
            <circle cx="47" cy="57" r="1.2" fill="#78350F" />
            <circle cx="53" cy="57" r="1.2" fill="#78350F" />
            <path d="M 43,64 Q 50,71 57,64" stroke="#78350F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            {/* Cute Dimples */}
            <circle cx="41" cy="63" r="1" fill="#B45309" />
            <circle cx="59" cy="63" r="1" fill="#B45309" />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl transition-all duration-300 ${
        sizeClasses[size]
      } ${className} ${
        isGlowing ? avatar.borderGlow : "border border-white/10"
      } ${animate ? "hover:scale-105 active:scale-95 animate-bounce-subtle" : ""}`}
      style={{
        background: `radial-gradient(circle at 50% 30%, ${avatar.primaryColor}25, rgba(15, 23, 42, 0.95))`,
      }}
      title={`${avatar.name} (${avatar.title})`}
    >
      {/* SVG Container */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] select-none pointer-events-none"
      >
        {renderAnimalFace(avatar.id)}
      </svg>

      {/* Mini badge icon if enabled */}
      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 text-xs sm:text-sm px-1 rounded-full border border-black/40 shadow-sm"
          style={{ backgroundColor: avatar.primaryColor }}
        >
          {avatar.emoji}
        </span>
      )}
    </div>
  );
}
