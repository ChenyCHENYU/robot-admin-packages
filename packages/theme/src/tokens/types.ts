/** Robot Admin 品牌基础色板。基础色只描述视觉刻度，不表达业务用途。 */
export interface ThemeBrandTokens {
  readonly 50: string;
  readonly 100: string;
  readonly 200: string;
  readonly 300: string;
  readonly 400: string;
  readonly 500: string;
  readonly 600: string;
  readonly 700: string;
  readonly 800: string;
  readonly 900: string;
  readonly 950: string;
}

/** 页面和组件应优先消费的语义颜色。 */
export interface ThemeColorTokens {
  readonly canvas: string;
  readonly surface: string;
  readonly surfaceMuted: string;
  readonly elevated: string;
  readonly overlay: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly textDisabled: string;
  readonly placeholder: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly divider: string;
  readonly fillHover: string;
  readonly fillActive: string;
  readonly primary: string;
  readonly primaryHover: string;
  readonly primaryPressed: string;
  readonly primarySubtle: string;
  readonly onPrimary: string;
  readonly focusRing: string;
  readonly success: string;
  readonly successHover: string;
  readonly successSubtle: string;
  readonly warning: string;
  readonly warningHover: string;
  readonly warningSubtle: string;
  readonly danger: string;
  readonly dangerHover: string;
  readonly dangerSubtle: string;
  readonly info: string;
  readonly infoHover: string;
  readonly infoSubtle: string;
}

/** 少数组件确实需要的语义别名；不在这里复制普通组件私有变量。 */
export interface ThemeComponentTokens {
  readonly tableHeaderBg: string;
  readonly tableHeaderText: string;
  readonly tableRowHover: string;
  readonly tableRowSelected: string;
  readonly tabText: string;
  readonly tabTextActive: string;
  readonly tabBgHover: string;
  readonly tabIndicator: string;
}

export interface ThemeShadowTokens {
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly overlay: string;
}

export interface ThemeSchemeTokens {
  readonly color: ThemeColorTokens;
  readonly component: ThemeComponentTokens;
  readonly shadow: ThemeShadowTokens;
}

export interface ThemeRadiusTokens {
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly pill: string;
}

export interface ThemeSpacingTokens {
  readonly 1: string;
  readonly 2: string;
  readonly 3: string;
  readonly 4: string;
  readonly 5: string;
  readonly 6: string;
  readonly 8: string;
  readonly 10: string;
}

export interface ThemeControlTokens {
  readonly heightMini: string;
  readonly heightSmall: string;
  readonly heightMedium: string;
  readonly heightLarge: string;
  readonly iconSmall: string;
  readonly iconMedium: string;
  readonly iconLarge: string;
}

export interface ThemeTypographyTokens {
  readonly fontSizeXs: string;
  readonly fontSizeSm: string;
  readonly fontSizeMd: string;
  readonly fontSizeLg: string;
  readonly fontSizeXl: string;
  readonly lineHeightTight: string;
  readonly lineHeightNormal: string;
  readonly fontWeightMedium: string;
  readonly fontWeightSemibold: string;
}

export interface ThemeMotionTokens {
  readonly durationFast: string;
  readonly durationBase: string;
  readonly durationSlow: string;
  readonly easingStandard: string;
  readonly easingEmphasized: string;
}

/** 完整主题 Token；结构尺寸跨明暗模式共享，颜色和阴影按模式隔离。 */
export interface ThemeTokenSet {
  readonly brand: ThemeBrandTokens;
  readonly light: ThemeSchemeTokens;
  readonly dark: ThemeSchemeTokens;
  readonly radius: ThemeRadiusTokens;
  readonly spacing: ThemeSpacingTokens;
  readonly control: ThemeControlTokens;
  readonly typography: ThemeTypographyTokens;
  readonly motion: ThemeMotionTokens;
}

export interface ThemeSchemeTokenOverrides {
  color?: Partial<ThemeColorTokens>;
  component?: Partial<ThemeComponentTokens>;
  shadow?: Partial<ThemeShadowTokens>;
}

/** 项目级增量配置；只覆盖需要改变的值，不复制整套默认主题。 */
export interface ThemeTokenOverrides {
  brand?: Partial<ThemeBrandTokens>;
  light?: ThemeSchemeTokenOverrides;
  dark?: ThemeSchemeTokenOverrides;
  radius?: Partial<ThemeRadiusTokens>;
  spacing?: Partial<ThemeSpacingTokens>;
  control?: Partial<ThemeControlTokens>;
  typography?: Partial<ThemeTypographyTokens>;
  motion?: Partial<ThemeMotionTokens>;
}

export type ThemeTokenMode = "light" | "dark";
export type ThemeCssVariable = `--ra-${string}`;

/** 与 CSSStyleDeclaration 兼容的最小协议，方便浏览器、测试和微应用接入。 */
export interface ThemeStyleTarget {
  getPropertyPriority(name: string): string;
  getPropertyValue(name: string): string;
  removeProperty(name: string): string;
  setProperty(name: string, value: string, priority?: string): void;
}
