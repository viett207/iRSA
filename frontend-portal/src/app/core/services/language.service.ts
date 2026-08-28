import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NzI18nService, vi_VN, en_US } from 'ng-zorro-antd/i18n';

export type AppLanguage = 'vi' | 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly nzI18n = inject(NzI18nService);

  private readonly STORAGE_KEY = 'user_language';
  readonly currentLang = signal<AppLanguage>('vi');

  constructor() {
    this.initLanguage();
  }

  private initLanguage(): void {
    const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem(this.STORAGE_KEY) as AppLanguage | null) : null;
    const initialLang: AppLanguage = savedLang === 'en' ? 'en' : 'vi';
    
    this.translate.addLangs(['vi', 'en']);
    this.translate.setDefaultLang('vi');
    this.setLanguage(initialLang, false);
  }

  setLanguage(lang: AppLanguage, saveStorage: boolean = true): void {
    this.currentLang.set(lang);
    this.translate.use(lang);
    this.nzI18n.setLocale(lang === 'vi' ? vi_VN : en_US);
    
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }

    if (saveStorage && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
  }

  toggleLanguage(): void {
    const nextLang: AppLanguage = this.currentLang() === 'vi' ? 'en' : 'vi';
    this.setLanguage(nextLang);
  }

  get isVietnamese(): boolean {
    return this.currentLang() === 'vi';
  }

  get isEnglish(): boolean {
    return this.currentLang() === 'en';
  }
}
