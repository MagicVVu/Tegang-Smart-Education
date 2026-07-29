export const colors = {
  brand: "#164E7A",
  brandStrong: "#0E3555",
  brandSoft: "#EAF3F9",
  agent: "#6252C7",
  agentSoft: "#F0EEFF",
  success: "#1F8A5B",
  successSoft: "#EAF7F1",
  warning: "#C77800",
  warningSoft: "#FFF5E6",
  risk: "#C43D4B",
  riskSoft: "#FFF0F1",
  info: "#2E6ECF",
  infoSoft: "#EDF4FF",
  text: "#172B3A",
  textSecondary: "#526675",
  textMuted: "#7B8D99",
  border: "#D9E2E8",
  background: "#F4F7F9",
  surface: "#FFFFFF",
  disabled: "#A8B4BD"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999
} as const;

export const typography = {
  display: 30,
  pageTitle: 24,
  sectionTitle: 18,
  body: 14,
  caption: 12
} as const;

export const shadows = {
  card: "0 8px 24px rgba(16, 47, 69, 0.08)",
  floating: "0 14px 40px rgba(16, 47, 69, 0.16)"
} as const;

export const webThemeToken = {
  colorPrimary: colors.brand,
  colorSuccess: colors.success,
  colorWarning: colors.warning,
  colorError: colors.risk,
  colorInfo: colors.info,
  colorText: colors.text,
  colorTextSecondary: colors.textSecondary,
  colorBgLayout: colors.background,
  colorBgContainer: colors.surface,
  colorBorderSecondary: colors.border,
  borderRadius: radii.md,
  fontFamily:
    "'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
} as const;
