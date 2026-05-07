'use client';

import type { Namespace } from 'i18next';
import type { LangCode } from './locales-config';

import dayjs from 'dayjs';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';

import { fallbackLng, getCurrentLang } from './locales-config';

// ----------------------------------------------------------------------

export function useTranslate(namespace?: Namespace) {
  const router = useRouter();

  const { t, i18n } = useTranslation(namespace);
  const { t: tMessages } = useTranslation('messages');

  const currentLang = getCurrentLang(i18n.resolvedLanguage);

  const updateDirection = useCallback(
    (lang: LangCode) => {
    },
    []
  );

  const updateDayjsLocale = useCallback((lang: LangCode) => {
    const updatedLang = getCurrentLang(lang);
    dayjs.locale(updatedLang.adapterLocale);
  }, []);

  const handleChangeLang = useCallback(
    async (lang: LangCode) => {
      try {
        const changeLangPromise = i18n.changeLanguage(lang);

        toast.promise(changeLangPromise, {
          loading: tMessages('languageSwitch.loading'),
          success: () => tMessages('languageSwitch.success'),
          error: () => tMessages('languageSwitch.error'),
        });

        await changeLangPromise;

        updateDirection(lang);
        updateDayjsLocale(lang);

        router.refresh(); // only nextjs
      } catch (error) {
        console.error(error);
      }
    },
    [i18n, router, tMessages, updateDayjsLocale, updateDirection]
  );

  const handleResetLang = useCallback(() => {
    handleChangeLang(fallbackLng);
  }, [handleChangeLang]);

  return {
    t,
    i18n,
    currentLang,
    onChangeLang: handleChangeLang,
    onResetLang: handleResetLang,
  };
}

// ----------------------------------------------------------------------

export function useLocaleDirectionSync() {
  return null;
}
