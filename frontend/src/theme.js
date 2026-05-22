import { alpha, createTheme } from "@mui/material/styles";

/** Design tokens — light HR dashboard (Crextio-style references) */
export const wh = {
  canvas: "#ffffff",
  canvasAlt: "#ffffff",
  ink: "#1a1d24",
  inkMuted: "#5c6370",
  accent: "#e8b923",
  accentHover: "#d4a61e",
  accentSoft: "#fff8e4",
  card: "#ffffff",
  border: "rgba(26, 29, 36, 0.08)",
  shadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
  shadowLift: "0 20px 50px rgba(15, 23, 42, 0.08)",
  radiusLg: 24,
  radiusMd: 16,
};

export const workhubTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: wh.ink, light: "#3d424d", dark: "#0f1115", contrastText: "#fafafa" },
    secondary: { main: wh.accent, light: "#f5d563", dark: wh.accentHover, contrastText: wh.ink },
    background: { default: wh.canvas, paper: wh.card },
    divider: wh.border,
    text: { primary: wh.ink, secondary: wh.inkMuted },
    success: { main: "#0d9488" },
    info: { main: "#0ea5e9" },
    warning: { main: wh.accent },
  },
  shape: { borderRadius: wh.radiusMd },
  typography: {
    fontFamily: `"Inter", "Segoe UI", system-ui, sans-serif`,
    h3: { fontWeight: 800, letterSpacing: -0.03 },
    h4: { fontWeight: 800, letterSpacing: -0.03 },
    h5: { fontWeight: 700, letterSpacing: -0.02 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0.01 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#ffffff",
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: wh.radiusMd },
        containedPrimary: {
          backgroundColor: wh.accent,
          color: wh.ink,
          boxShadow: "0 8px 24px rgba(232, 185, 35, 0.35)",
          "&:hover": {
            backgroundColor: wh.accentHover,
            boxShadow: "0 10px 28px rgba(232, 185, 35, 0.45)",
          },
        },
        outlined: {
          borderColor: alpha(wh.ink, 0.12),
          "&:hover": { borderColor: alpha(wh.ink, 0.2), backgroundColor: alpha(wh.ink, 0.03) },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", boxShadow: "none" },
        outlined: {
          borderColor: wh.border,
          boxShadow: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: wh.radiusLg,
          border: `1px solid ${wh.border}`,
          boxShadow: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${wh.border}`,
          background: wh.card,
          borderRadius: 0,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          backdropFilter: "none",
          borderBottom: `1px solid ${wh.border}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: wh.radiusMd },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 999,
          mx: 0.35,
          fontWeight: 700,
          textTransform: "none",
          color: wh.inkMuted,
          "&.Mui-selected": {
            backgroundColor: wh.ink,
            color: "#fff",
          },
        },
      },
    },
  },
});
