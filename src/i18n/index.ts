// src/i18n/index.ts

import { zhLabels } from './locales/zh';
import { enLabels } from './locales/en';

export type LocaleKey = keyof typeof zhLabels;
export type Language = 'zh' | 'en';

const locales: Record<Language, Record<string, string>> = {
  zh: zhLabels,
  en: enLabels,
};

export function getLabel(lang: Language, key: LocaleKey): string {
  return locales[lang]?.[key] ?? locales.zh[key] ?? key;
}

export function getLabels(lang: Language): Record<string, string> {
  return locales[lang] ?? locales.zh;
}

export function getAllLanguages(): Language[] {
  return Object.keys(locales) as Language[];
}

export function isValidLanguage(lang: string): lang is Language {
  return lang in locales;
}

export function formatIconLabel(lang: Language, key: LocaleKey): string {
  const label = getLabel(lang, key);
  return `[${label}]`;
}
