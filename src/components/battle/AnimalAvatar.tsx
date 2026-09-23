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

  // Render SVG illustration for each animal
  const renderAnimalFace = (avatarId: string) => {
    switch (avatarId) {
      case "shiba":
        return (
          <g>
            {/* Ears */}
            <polygon points="20,28 32,8 44,24" fill="#D97706" />
            <polygon points="23,26 32,12 41,23" fill="#FDE68A" />
            <polygon points="80,28 68,8 56,24" fill="#D97706" />
            <polygon points="77,26 68,12 59,23" fill="#FDE68A" />
            {/* Head */}
            <ellipse cx="50" cy="55" rx="36" ry="32" fill="#F59E0B" />
            {/* Cheeks / White Muzzle */}
            <path d="M 22,60 Q 20,80 50,82 Q 80,80 78,60 Q 66,48 50,56 Q 34,48 22,60 Z" fill="#FFFBEB" />
            {/* Blushes */}
            <circle cx="28" cy="62" r="5" fill="#F87171" opacity="0.6" />
            <circle cx="72" cy="62" r="5" fill="#F87171" opacity="0.6" />
            {/* Eyes */}
            <ellipse cx="36" cy="46" rx="4" ry="4.5" fill="#1E293B" />
            <circle cx="37.5" cy="44.5" r="1.5" fill="#FFFFFF" />
            <ellipse cx="64" cy="46" rx="4" ry="4.5" fill="#1E293B" />
            <circle cx="65.5" cy="44.5" r="1.5" fill="#FFFFFF" />
            {/* Nose & Mouth */}
            <polygon points="50,60 46,55 54,55" fill="#1E293B" />
            <path d="M 46,65 Q 50,68 54,65" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Eyebrows */}
            <ellipse cx="36" cy="38" rx="2.5" ry="1.5" fill="#FFFBEB" />
            <ellipse cx="64" cy="38" rx="2.5" ry="1.5" fill="#FFFBEB" />
          </g>
        );

      case "panda":
        return (
          <g>
            {/* Ears */}
            <circle cx="24" cy="24" r="12" fill="#0F172A" />
            <circle cx="76" cy="24" r="12" fill="#0F172A" />
            {/* Head */}
            <ellipse cx="50" cy="56" rx="36" ry="32" fill="#FFFFFF" />
            {/* Eye Patches */}
            <ellipse cx="34" cy="50" rx="9" ry="11" fill="#0F172A" transform="rotate(-15 34 50)" />
            <ellipse cx="66" cy="50" rx="9" ry="11" fill="#0F172A" transform="rotate(15 66 50)" />
            {/* Eyes */}
            <circle cx="35" cy="49" r="3.5" fill="#FFFFFF" />
            <circle cx="36" cy="48" r="1.5" fill="#0F172A" />
            <circle cx="65" cy="49" r="3.5" fill="#FFFFFF" />
            <circle cx="64" cy="48" r="1.5" fill="#0F172A" />
            {/* Blushes */}
            <circle cx="25" cy="62" r="5" fill="#F472B6" opacity="0.5" />
            <circle cx="75" cy="62" r="5" fill="#F472B6" opacity="0.5" />
            {/* Nose & Mouth */}
            <ellipse cx="50" cy="62" rx="4.5" ry="3" fill="#0F172A" />
            <path d="M 46,67 Q 50,71 54,67" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "fox":
        return (
          <g>
            {/* Big Fox Ears */}
            <polygon points="16,36 28,6 46,30" fill="#EA580C" />
            <polygon points="22,32 30,12 42,28" fill="#FFF7ED" />
            <polygon points="84,36 72,6 54,30" fill="#EA580C" />
            <polygon points="78,32 70,12 58,28" fill="#FFF7ED" />
            {/* Head */}
            <polygon points="18,48 50,86 82,48 50,34" fill="#F97316" />
            {/* White Cheeks */}
            <polygon points="18,48 50,86 36,54" fill="#FFF7ED" />
            <polygon points="82,48 50,86 64,54" fill="#FFF7ED" />
            {/* Eyes */}
            <ellipse cx="36" cy="46" rx="4" ry="3" fill="#1E293B" transform="rotate(-10 36 46)" />
            <circle cx="37" cy="45" r="1" fill="#FFFFFF" />
            <ellipse cx="64" cy="46" rx="4" ry="3" fill="#1E293B" transform="rotate(10 64 46)" />
            <circle cx="63" cy="45" r="1" fill="#FFFFFF" />
            {/* Dark cute nose tip */}
            <polygon points="50,86 46,80 54,80" fill="#1E293B" />
          </g>
        );

      case "lion":
        return (
          <g>
            {/* Fluffy Mane */}
            <circle cx="50" cy="52" r="42" fill="#CA8A04" />
            <circle cx="30" cy="30" r="10" fill="#B45309" opacity="0.7" />
            <circle cx="70" cy="30" r="10" fill="#B45309" opacity="0.7" />
            <circle cx="16" cy="52" r="10" fill="#B45309" opacity="0.7" />
            <circle cx="84" cy="52" r="10" fill="#B45309" opacity="0.7" />
            {/* Ears */}
            <circle cx="28" cy="28" r="8" fill="#EAB308" />
            <circle cx="72" cy="28" r="8" fill="#EAB308" />
            {/* Head */}
            <ellipse cx="50" cy="56" rx="30" ry="26" fill="#FACC15" />
            {/* Muzzle */}
            <ellipse cx="50" cy="66" rx="14" ry="10" fill="#FEF08A" />
            {/* Eyes */}
            <ellipse cx="38" cy="48" rx="4" ry="5" fill="#1E293B" />
            <circle cx="39" cy="46.5" r="1.5" fill="#FFFFFF" />
            <ellipse cx="62" cy="48" rx="4" ry="5" fill="#1E293B" />
            <circle cx="63" cy="46.5" r="1.5" fill="#FFFFFF" />
            {/* Nose & Smile */}
            <polygon points="50,62 45,58 55,58" fill="#B45309" />
            <path d="M 46,68 Q 50,72 54,68" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "tiger":
        return (
          <g>
            {/* Round Ears */}
            <circle cx="24" cy="26" r="10" fill="#C2410C" />
            <circle cx="24" cy="26" r="6" fill="#FED7AA" />
            <circle cx="76" cy="26" r="10" fill="#C2410C" />
            <circle cx="76" cy="26" r="6" fill="#FED7AA" />
            {/* Head */}
            <ellipse cx="50" cy="55" rx="35" ry="30" fill="#FB923C" />
            {/* Stripes */}
            <polygon points="50,28 47,38 53,38" fill="#7C2D12" />
            <polygon points="38,32 44,38 41,40" fill="#7C2D12" />
            <polygon points="62,32 56,38 59,40" fill="#7C2D12" />
            <polygon points="18,52 28,52 26,56" fill="#7C2D12" />
            <polygon points="82,52 72,52 74,56" fill="#7C2D12" />
            {/* White Muzzle */}
            <path d="M 30,62 Q 50,82 70,62 Q 50,56 30,62 Z" fill="#FFF7ED" />
            {/* Eyes */}
            <ellipse cx="36" cy="48" rx="4" ry="5" fill="#1E293B" />
            <circle cx="37" cy="46.5" r="1.5" fill="#FFFFFF" />
            <ellipse cx="64" cy="48" rx="4" ry="5" fill="#1E293B" />
            <circle cx="65" cy="46.5" r="1.5" fill="#FFFFFF" />
            {/* Nose & Mouth */}
            <polygon points="50,62 46,58 54,58" fill="#C2410C" />
            <path d="M 46,67 Q 50,71 54,67" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "koala":
        return (
          <g>
            {/* Big Fuzzy Round Ears */}
            <circle cx="18" cy="38" r="15" fill="#94A3B8" />
            <circle cx="18" cy="38" r="9" fill="#F1F5F9" />
            <circle cx="82" cy="38" r="15" fill="#94A3B8" />
            <circle cx="82" cy="38" r="9" fill="#F1F5F9" />
            {/* Head */}
            <ellipse cx="50" cy="56" rx="34" ry="28" fill="#64748B" />
            {/* Big Dark Nose */}
            <ellipse cx="50" cy="56" rx="8" ry="12" fill="#1E293B" />
            <ellipse cx="48" cy="52" rx="2.5" ry="4" fill="#475569" opacity="0.6" />
            {/* Small Cute Eyes */}
            <circle cx="32" cy="48" r="3.5" fill="#0F172A" />
            <circle cx="33" cy="47" r="1.2" fill="#FFFFFF" />
            <circle cx="68" cy="48" r="3.5" fill="#0F172A" />
            <circle cx="69" cy="47" r="1.2" fill="#FFFFFF" />
            {/* Blushes */}
            <circle cx="26" cy="62" r="4.5" fill="#F472B6" opacity="0.4" />
            <circle cx="74" cy="62" r="4.5" fill="#F472B6" opacity="0.4" />
          </g>
        );

      case "penguin":
        return (
          <g>
            {/* Round Head (Black) */}
            <ellipse cx="50" cy="52" rx="35" ry="34" fill="#0F172A" />
            {/* White Heart Belly/Face */}
            <path d="M 50,44 C 36,30 20,44 26,64 C 30,76 46,84 50,84 C 54,84 70,76 74,64 C 80,44 64,30 50,44 Z" fill="#F8FAFC" />
            {/* Big Expressive Eyes */}
            <circle cx="38" cy="48" r="4" fill="#0F172A" />
            <circle cx="39.5" cy="46.5" r="1.8" fill="#FFFFFF" />
            <circle cx="62" cy="48" r="4" fill="#0F172A" />
            <circle cx="63.5" cy="46.5" r="1.8" fill="#FFFFFF" />
            {/* Blushes */}
            <circle cx="28" cy="58" r="4.5" fill="#FB7185" opacity="0.6" />
            <circle cx="72" cy="58" r="4.5" fill="#FB7185" opacity="0.6" />
            {/* Bright Orange Beak */}
            <polygon points="50,64 42,54 58,54" fill="#F97316" />
          </g>
        );

      case "rabbit":
        return (
          <g>
            {/* Long Bunny Ears */}
            <ellipse cx="34" cy="18" rx="8" ry="18" fill="#F472B6" />
            <ellipse cx="34" cy="18" rx="4.5" ry="13" fill="#FDF2F8" />
            <ellipse cx="66" cy="18" rx="8" ry="18" fill="#F472B6" />
            <ellipse cx="66" cy="18" rx="4.5" ry="13" fill="#FDF2F8" />
            {/* Head */}
            <ellipse cx="50" cy="58" rx="33" ry="28" fill="#FDF2F8" />
            {/* Eyes */}
            <ellipse cx="36" cy="52" rx="4" ry="5" fill="#831843" />
            <circle cx="37.5" cy="50" r="1.5" fill="#FFFFFF" />
            <ellipse cx="64" cy="52" rx="4" ry="5" fill="#831843" />
            <circle cx="65.5" cy="50" r="1.5" fill="#FFFFFF" />
            {/* Cheeks */}
            <circle cx="26" cy="62" r="5.5" fill="#F472B6" opacity="0.6" />
            <circle cx="74" cy="62" r="5.5" fill="#F472B6" opacity="0.6" />
            {/* Nose & Mouth */}
            <polygon points="50,62 47,58 53,58" fill="#DB2777" />
            <path d="M 46,67 Q 50,70 54,67" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "cat":
        return (
          <g>
            {/* Cat Ears */}
            <polygon points="22,34 26,8 46,26" fill="#8B5CF6" />
            <polygon points="26,30 28,14 42,26" fill="#EDE9FE" />
            <polygon points="78,34 74,8 54,26" fill="#8B5CF6" />
            <polygon points="74,30 72,14 58,26" fill="#EDE9FE" />
            {/* Head */}
            <ellipse cx="50" cy="56" rx="35" ry="30" fill="#7C3AED" />
            {/* Big Playful Eyes */}
            <ellipse cx="36" cy="48" rx="5" ry="6" fill="#FDE047" />
            <ellipse cx="36" cy="48" rx="2" ry="5" fill="#1E1B4B" />
            <circle cx="38" cy="46" r="1.5" fill="#FFFFFF" />
            <ellipse cx="64" cy="48" rx="5" ry="6" fill="#FDE047" />
            <ellipse cx="64" cy="48" rx="2" ry="5" fill="#1E1B4B" />
            <circle cx="66" cy="46" r="1.5" fill="#FFFFFF" />
            {/* Whiskers */}
            <line x1="14" y1="58" x2="30" y2="60" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="14" y1="66" x2="30" y2="64" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="86" y1="58" x2="70" y2="60" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="86" y1="66" x2="70" y2="64" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
            {/* Nose & Mouth */}
            <polygon points="50,60 46,57 54,57" fill="#F472B6" />
            <path d="M 45,64 Q 50,67 55,64" stroke="#EDE9FE" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "owl":
        return (
          <g>
            {/* Ear Tuft Feathers */}
            <polygon points="28,26 34,10 42,28" fill="#0D9488" />
            <polygon points="72,26 66,10 58,28" fill="#0D9488" />
            {/* Head */}
            <ellipse cx="50" cy="54" rx="35" ry="32" fill="#14B8A6" />
            {/* Giant Wise Eyes */}
            <circle cx="36" cy="48" r="12" fill="#FFFFFF" stroke="#0F766E" strokeWidth="2.5" />
            <circle cx="36" cy="48" r="5" fill="#0F172A" />
            <circle cx="38" cy="46" r="2" fill="#FFFFFF" />
            <circle cx="64" cy="48" r="12" fill="#FFFFFF" stroke="#0F766E" strokeWidth="2.5" />
            <circle cx="64" cy="48" r="5" fill="#0F172A" />
            <circle cx="66" cy="46" r="2" fill="#FFFFFF" />
            {/* Small Beak */}
            <polygon points="50,66 45,54 55,54" fill="#F59E0B" />
            {/* Feather details */}
            <path d="M 42,74 Q 50,78 58,74" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "deer":
        return (
          <g>
            {/* Antlers */}
            <path d="M 32,24 L 24,10 M 24,10 L 16,14 M 24,10 L 22,4" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 68,24 L 76,10 M 76,10 L 84,14 M 76,10 L 78,4" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
            {/* Ears */}
            <ellipse cx="22" cy="34" rx="10" ry="5" fill="#FB7185" transform="rotate(-30 22 34)" />
            <ellipse cx="78" cy="34" rx="10" ry="5" fill="#FB7185" transform="rotate(30 78 34)" />
            {/* Head */}
            <ellipse cx="50" cy="58" rx="30" ry="26" fill="#F43F5E" />
            {/* White Dappled Spots */}
            <circle cx="50" cy="42" r="2" fill="#FFF1F2" />
            <circle cx="43" cy="46" r="1.5" fill="#FFF1F2" />
            <circle cx="57" cy="46" r="1.5" fill="#FFF1F2" />
            {/* Big Doe Eyes */}
            <ellipse cx="38" cy="54" rx="4" ry="5" fill="#1E293B" />
            <circle cx="39.5" cy="52.5" r="1.8" fill="#FFFFFF" />
            <ellipse cx="62" cy="54" rx="4" ry="5" fill="#1E293B" />
            <circle cx="63.5" cy="52.5" r="1.8" fill="#FFFFFF" />
            {/* White Muzzle */}
            <ellipse cx="50" cy="68" rx="10" ry="7" fill="#FFF1F2" />
            {/* Nose */}
            <ellipse cx="50" cy="64" rx="3" ry="2" fill="#881337" />
          </g>
        );

      case "monkey":
        return (
          <g>
            {/* Big Round Ears */}
            <circle cx="16" cy="46" r="12" fill="#B45309" />
            <circle cx="16" cy="46" r="7" fill="#FED7AA" />
            <circle cx="84" cy="46" r="12" fill="#B45309" />
            <circle cx="84" cy="46" r="7" fill="#FED7AA" />
            {/* Head */}
            <circle cx="50" cy="52" r="32" fill="#D97706" />
            {/* Peach Face Patch (Heart-shaped) */}
            <path d="M 50,44 C 34,26 22,46 32,66 C 38,76 46,78 50,78 C 54,78 62,76 68,66 C 78,46 66,26 50,44 Z" fill="#FED7AA" />
            {/* Mischievous Eyes */}
            <circle cx="40" cy="48" r="3.5" fill="#1E293B" />
            <circle cx="41.5" cy="46.5" r="1.2" fill="#FFFFFF" />
            <circle cx="60" cy="48" r="3.5" fill="#1E293B" />
            <circle cx="61.5" cy="46.5" r="1.2" fill="#FFFFFF" />
            {/* Cheerful Smile */}
            <circle cx="46" cy="58" r="1" fill="#78350F" />
            <circle cx="54" cy="58" r="1" fill="#78350F" />
            <path d="M 44,64 Q 50,70 56,64" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />
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
