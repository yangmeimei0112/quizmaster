"use client";

import React from "react";
import { ANIMAL_AVATARS, AnimalAvatarInfo } from "@/lib/avatars";
import AnimalAvatar from "./AnimalAvatar";

interface AnimalAvatarPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export default function AnimalAvatarPicker({
  selectedId,
  onSelect,
  className = "",
}: AnimalAvatarPickerProps) {
  const currentAvatar = ANIMAL_AVATARS.find((a) => a.id === selectedId) || ANIMAL_AVATARS[0];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Selected Animal Highlight Card */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner flex items-center gap-4">
        <div
          className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-2xl opacity-40 pointer-events-none"
          style={{ backgroundColor: currentAvatar.primaryColor }}
        />
        <AnimalAvatar
          id={currentAvatar.id}
          size="xl"
          isGlowing
          className="border-2 ring-4 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-game text-foreground">
              {currentAvatar.name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold font-game text-white shadow-sm"
              style={{ backgroundColor: currentAvatar.secondaryColor }}
            >
              {currentAvatar.title}
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
            {currentAvatar.description}
          </p>
        </div>
      </div>

      {/* 12-Animal Grid Selection */}
      <div>
        <label className="block text-xs font-semibold text-foreground-muted mb-2">
          選擇出戰動物頭像 (共 12 款日系遊戲風格)
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {ANIMAL_AVATARS.map((avatar) => {
            const isSelected = avatar.id === selectedId;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => onSelect(avatar.id)}
                className={`relative flex flex-col items-center p-2 rounded-xl border transition-all duration-200 touch-tactile group ${
                  isSelected
                    ? "bg-white/[0.12] border-white/40 shadow-glow scale-105 ring-2 ring-white/30"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/20 active:scale-95"
                }`}
                title={avatar.name}
              >
                <AnimalAvatar
                  id={avatar.id}
                  size="md"
                  isGlowing={isSelected}
                  className="transition-transform group-hover:scale-110"
                />
                <span
                  className={`text-[11px] mt-1.5 font-bold font-game truncate max-w-full ${
                    isSelected ? "text-white" : "text-foreground-muted group-hover:text-foreground"
                  }`}
                >
                  {avatar.name.replace(/(元氣|呆萌|機靈|王者|閃電|悠哉|滑雪|活力|喵星|智者|森之|敏捷)/, "") || avatar.name}
                </span>

                {/* Selection indicator pill */}
                {isSelected && (
                  <span
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black"
                    style={{ backgroundColor: avatar.primaryColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
