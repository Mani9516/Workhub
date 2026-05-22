import { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Alert,
  Box,
  Button,
  ButtonBase,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { wh } from "../theme.js";
import api from "../api/client.js";

const demoEmailEnv = {
  employee: import.meta.env.VITE_DEMO_EMAIL_EMPLOYEE ?? "",
  manager: import.meta.env.VITE_DEMO_EMAIL_MANAGER ?? "",
  hr: import.meta.env.VITE_DEMO_EMAIL_HR ?? "",
};

export default function LoginPage() {
  const { login, loginWithOtp, token, loading } = useAuth();
  const navigate = useNavigate();
  const isMd = useMediaQuery("(min-width:900px)");
  const [signInTab, setSignInTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [otpDelivery, setOtpDelivery] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);

  const demoRoles = useMemo(
    () => [
      {
        key: "employee",
        label: "Employee",
        hint: "Individual contributor",
        icon: PersonOutlineOutlinedIcon,
        addr: String(demoEmailEnv.employee).trim(),
      },
      {
        key: "manager",
        label: "Manager",
        hint: "Team lead access",
        icon: GroupsOutlinedIcon,
        addr: String(demoEmailEnv.manager).trim(),
      },
      {
        key: "hr",
        label: "HR",
        hint: "People operations",
        icon: SupportAgentOutlinedIcon,
        addr: String(demoEmailEnv.hr).trim(),
      },
    ],
    []
  );

  useEffect(() => {
    if (!loading && token) navigate("/", { replace: true });
  }, [loading, token, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.displayMessage || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    setError("");
    setOtpInfo("");
    setOtpDelivery(null);
    setOtpBusy(true);
    try {
      const { data } = await api.post("/api/auth/login-otp/send", { email: otpEmail.trim() });
      const msg = typeof data?.message === "string" ? data.message : "";
      const isConsole = data?.delivery === "console";
      // Do not surface API "console mode" copy on the login UI; success for email-only is shown below.
      setOtpInfo(isConsole ? "" : msg);
      setOtpDelivery(isConsole ? "console" : "email");
      setCooldown(45);
    } catch (err) {
      setError(err.displayMessage || "Could not send code");
    } finally {
      setOtpBusy(false);
    }
  };

  const onOtpVerify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginWithOtp(otpEmail.trim(), otpCode.trim());
      navigate("/");
    } catch (err) {
      setError(err.displayMessage || "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: wh.canvas }}>
      {isMd && (
        <Box
          sx={{
            flex: "0 0 44%",
            maxWidth: 560,
            color: wh.ink,
            p: 6,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: `linear-gradient(155deg, ${alpha(wh.card, 0.98)} 0%, ${wh.accentSoft} 42%, ${alpha("#dbeafe", 0.55)} 100%)`,
            borderRight: `1px solid ${wh.border}`,
          }}
          aria-hidden={false}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: alpha(wh.card, 0.95),
                  border: `1px solid ${alpha(wh.accent, 0.45)}`,
                  boxShadow: wh.shadow,
                }}
              >
                <HubOutlinedIcon sx={{ color: wh.ink }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
                  WorkHub
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  One portal for people operations
                </Typography>
              </Box>
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1.2, lineHeight: 1.05, mb: 2 }}>
              A calmer workday starts with clarity.
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 520, lineHeight: 1.7, fontWeight: 600 }}>
              Attendance, leave, payroll visibility, learning, compliance acknowledgements, and helpful guidance — designed for employees, managers, and HR.
            </Typography>
          </Box>
          <Stack spacing={1.25} sx={{ mt: 6 }}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <ShieldOutlinedIcon sx={{ mt: 0.2, color: wh.ink }} />
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, lineHeight: 1.6 }}>
                Sign in with password or a one-time email code.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <AutoAwesomeOutlinedIcon sx={{ mt: 0.2, color: wh.ink }} />
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, lineHeight: 1.6 }}>
                Built-in guidance: learning recommendations and Echo assistant for common HR questions.
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      <Box sx={{ flex: 1, display: "grid", placeItems: "center", p: { xs: 2, sm: 3 } }}>
        <Container maxWidth="sm" sx={{ width: "100%" }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: wh.radiusLg,
              border: `1px solid ${wh.border}`,
              boxShadow: wh.shadowLift,
              bgcolor: alpha(wh.card, 0.95),
            }}
          >
            <Stack spacing={2}>
              {!isMd && (
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: wh.accentSoft,
                      color: "text.primary",
                      border: `1px solid ${alpha(wh.accent, 0.35)}`,
                    }}
                  >
                    <HubOutlinedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
                      WorkHub
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Sign in to continue
                    </Typography>
                  </Box>
                </Stack>
              )}
              {isMd && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
                    Welcome back
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
                    Password or email verification code.
                  </Typography>
                </Box>
              )}

              <Tabs value={signInTab} onChange={(_, v) => setSignInTab(v)} variant="fullWidth" sx={{ mb: 0.5 }}>
                <Tab label="Password" id="login-tab-0" aria-controls="login-panel-0" sx={{ fontWeight: 800 }} />
                <Tab label="Email code" id="login-tab-1" aria-controls="login-panel-1" sx={{ fontWeight: 800 }} />
              </Tabs>

              {error && <Alert severity="error">{error}</Alert>}

              {signInTab === 0 && (
                <Stack spacing={2.25} component="form" onSubmit={onPasswordSubmit} id="login-panel-0" role="tabpanel" aria-labelledby="login-tab-0">
                  <TextField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required autoComplete="username" />
                  <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth required autoComplete="current-password" />
                  <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.25 }}>
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                </Stack>
              )}

              {signInTab === 1 && (
                <Stack spacing={2.25} component="form" onSubmit={onOtpVerify} id="login-panel-1" role="tabpanel" aria-labelledby="login-tab-1">
                  <TextField
                    label="Work email"
                    type="email"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    fullWidth
                    required
                    autoComplete="username"
                  />
                  <Button type="button" variant="outlined" disabled={otpBusy || cooldown > 0 || !otpEmail.trim()} onClick={sendOtp} sx={{ fontWeight: 800 }}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : otpBusy ? "Sending…" : "Send verification code"}
                  </Button>
                  {otpInfo && otpDelivery === "email" && <Alert severity="success">{otpInfo}</Alert>}
                  <TextField
                    label="6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    fullWidth
                    required
                    inputProps={{ inputMode: "numeric", maxLength: 6, "aria-label": "One-time passcode" }}
                    placeholder="000000"
                  />
                  <Button type="submit" variant="contained" size="large" disabled={busy || otpCode.length !== 6} sx={{ py: 1.25 }}>
                    {busy ? "Verifying…" : "Verify and sign in"}
                  </Button>
                </Stack>
              )}

              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(wh.accentSoft, 0.65), borderStyle: "dashed", borderRadius: wh.radiusMd }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.2, mb: 0.5 }}>
                  Try a demo role
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  {demoRoles.map((role) => {
                    const Icon = role.icon;
                    const enabled = role.addr.length > 0;
                    return (
                      <ButtonBase
                        key={role.key}
                        disabled={!enabled}
                        onClick={() => {
                          if (!enabled) return;
                          setEmail(role.addr);
                          setOtpEmail(role.addr);
                          setPassword("");
                          setError("");
                        }}
                        sx={{
                          flex: 1,
                          textAlign: "left",
                          borderRadius: 2,
                          display: "block",
                        }}
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            height: "100%",
                            borderColor: (t) => alpha(t.palette.divider, enabled ? 1 : 0.35),
                            bgcolor: enabled ? alpha(wh.card, 0.9) : alpha(wh.ink, 0.02),
                            opacity: enabled ? 1 : 0.55,
                            transition: "border-color 0.15s, box-shadow 0.15s, background-color 0.15s",
                            "&:hover": enabled
                              ? {
                                  borderColor: alpha(wh.accent, 0.8),
                                  boxShadow: wh.shadow,
                                  bgcolor: alpha(wh.accentSoft, 0.9),
                                }
                              : {},
                          }}
                        >
                          <Stack direction="row" spacing={1.25} alignItems="flex-start">
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: wh.accentSoft,
                                color: "text.primary",
                                flexShrink: 0,
                              }}
                            >
                              <Icon fontSize="small" />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {role.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                                {role.hint}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mt: 0.75 }}>
                                {enabled ? "Fill work email" : "Quick-fill not configured"}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </ButtonBase>
                    );
                  })}
                </Stack>
              </Paper>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
