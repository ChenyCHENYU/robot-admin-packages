import C_SideLayoutComponent from "../components/layouts/SideLayout/index.vue";
import C_TopLayoutComponent from "../components/layouts/TopLayout/index.vue";
import C_MixLayoutComponent from "../components/layouts/MixLayout/index.vue";
import C_MixTopLayoutComponent from "../components/layouts/MixTopLayout/index.vue";
import C_ReverseHorizontalMixLayoutComponent from "../components/layouts/ReverseHorizontalMixLayout/index.vue";
import C_CardLayoutComponent from "../components/layouts/CardLayout/index.vue";

/** Naive UI 完整适配入口：聚合 Vue Headless 能力与 Naive 视图。 */
export * from "../vue";

export { default as C_LayoutContainer } from "../components/C_LayoutContainer/index.vue";
export { default as SettingsDrawer } from "../components/SettingsDrawer/index.vue";

export { default as BrandLogo } from "../components/BrandLogo/index.vue";
export { default as IconMenu } from "../components/IconMenu/index.vue";
export { default as FloatingMenu } from "../components/FloatingMenu/index.vue";
export { default as SideMenu } from "../components/SideMenu/index.vue";
export { default as DrawerMenu } from "../components/DrawerMenu/index.vue";
export { default as MenuTrigger } from "../components/MenuTrigger/index.vue";
export { default as ResponsiveMenu } from "../components/ResponsiveMenu/index.vue";

export const C_SideLayout = C_SideLayoutComponent;
export const C_TopLayout = C_TopLayoutComponent;
export const C_MixLayout = C_MixLayoutComponent;
export const C_MixTopLayout = C_MixTopLayoutComponent;
export const C_ReverseHorizontalMixLayout =
  C_ReverseHorizontalMixLayoutComponent;
export const C_CardLayout = C_CardLayoutComponent;

/** @deprecated 请使用 C_SideLayout；计划在 4.0 移除。 */
export const SideLayout = C_SideLayout;
/** @deprecated 请使用 C_TopLayout；计划在 4.0 移除。 */
export const TopLayout = C_TopLayout;
/** @deprecated 请使用 C_MixLayout；计划在 4.0 移除。 */
export const MixLayout = C_MixLayout;
/** @deprecated 请使用 C_MixTopLayout；计划在 4.0 移除。 */
export const MixTopLayout = C_MixTopLayout;
/** @deprecated 请使用 C_ReverseHorizontalMixLayout；计划在 4.0 移除。 */
export const ReverseHorizontalMixLayout = C_ReverseHorizontalMixLayout;
/** @deprecated 请使用 C_CardLayout；计划在 4.0 移除。 */
export const CardLayout = C_CardLayout;
