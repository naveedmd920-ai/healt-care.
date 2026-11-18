import type { TFunction } from 'i18next';

export function translateEnum(
  t: TFunction,
  group:
    | 'specialization'
    | 'day'
    | 'dayShort'
    | 'language'
    | 'status'
    | 'mode'
    | 'role'
    | 'hospitalCategory'
    | 'articleCategory',
  value?: string | null
): string {
  if (!value) return '';
  const key = `enums.${group}.${value}`;
  return t(key, { defaultValue: value });
}

export function translateLanguagesList(t: TFunction, raw?: string | null): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      return translateEnum(t, 'language', trimmed.toLowerCase());
    })
    .filter(Boolean)
    .join(', ');
}
