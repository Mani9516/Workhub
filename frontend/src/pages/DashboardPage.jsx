import { useEffect, useState } from "react";
import {
  alpha,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Switch,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  IconButton,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { wh } from "../theme.js";
import { useAuth } from "../context/AuthContext.jsx";

const MODULE_META = {
  profile: { title: "Profile", to: "/profile", blurb: "Details & skills", Icon: PersonOutlineIcon },
  attendance: { title: "Attendance", to: "/attendance", blurb: "Check-in", Icon: AccessTimeOutlinedIcon },
  leave: { title: "Leave", to: "/leave", blurb: "Requests", Icon: EventNoteOutlinedIcon },
  payroll: { title: "Payroll", to: "/payroll", blurb: "Payslips", Icon: PaymentsOutlinedIcon },
  learning: { title: "Learning", to: "/learning", blurb: "Courses", Icon: SchoolOutlinedIcon },
  career: { title: "Career", to: "/career", blurb: "Growth", Icon: TrendingUpOutlinedIcon },
  wellness: { title: "Wellness", to: "/wellness", blurb: "Well-being", Icon: SpaOutlinedIcon },
  compliance: { title: "Compliance", to: "/compliance", blurb: "Policies", Icon: GavelOutlinedIcon },
};

function segmentGradient(tone) {
  if (tone === "purple") return "linear-gradient(90deg, #c4b5fd, #8b5cf6)";
  if (tone === "green") return "linear-gradient(90deg, #6ee7b7, #10b981)";
  return "linear-gradient(90deg, #bfdbfe, #3b82f6)";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [modules, setModules] = useState([]);
  const [planned, setPlanned] = useState(null);
  const [teamPeers, setTeamPeers] = useState([]);
  const [teamLeave, setTeamLeave] = useState([]);
  const [teamWfh, setTeamWfh] = useState([]);
  const [mgrError, setMgrError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, m, p] = await Promise.all([
          api.get("/api/dashboard/summary"),
          api.get("/api/dashboard/modules"),
          api.get("/api/dashboard/planned-absences"),
        ]);
        if (!cancelled) {
          setSummary(s.data);
          setModules(m.data.modules || []);
          setPlanned(p.data);
        }
      } catch (e) {
        if (!cancelled) setError(e.displayMessage || "Could not load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.role !== "manager" && user?.role !== "hr") {
      setTeamPeers([]);
      setTeamLeave([]);
      setTeamWfh([]);
      return;
    }
    let cancelled = false;
    setMgrError("");
    (async () => {
      try {
        const [u, l, w] = await Promise.all([api.get("/api/users/"), api.get("/api/leave/team-requests"), api.get("/api/wfh/team-requests")]);
        if (!cancelled) {
          setTeamPeers(u.data || []);
          setTeamLeave(l.data || []);
          setTeamWfh(w.data || []);
        }
      } catch (e) {
        if (!cancelled) setMgrError(e.displayMessage || "Could not load team data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const refreshTeamQueues = async () => {
    if (user?.role !== "manager" && user?.role !== "hr") return;
    const [l, w] = await Promise.all([api.get("/api/leave/team-requests"), api.get("/api/wfh/team-requests")]);
    setTeamLeave(l.data || []);
    setTeamWfh(w.data || []);
    const p = await api.get("/api/dashboard/planned-absences");
    setPlanned(p.data);
  };

  const decideLeave = async (id, decision) => {
    try {
      await api.post(`/api/leave/requests/${id}/decision?decision=${decision}`);
      await refreshTeamQueues();
    } catch (e) {
      setMgrError(e.displayMessage || "Leave decision failed");
    }
  };

  const decideWfh = async (id, decision) => {
    try {
      await api.post(`/api/wfh/requests/${id}/decision?decision=${decision}`);
      await refreshTeamQueues();
    } catch (e) {
      setMgrError(e.displayMessage || "WFH decision failed");
    }
  };

  const toggleModule = async (key, visible) => {
    const next = modules.map((mod) => (mod.key === key ? { ...mod, visible } : mod));
    setModules(next);
    await api.put("/api/dashboard/modules", next.map((mod) => ({ module_key: mod.key, visible: mod.visible })));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }} aria-busy="true">
        <CircularProgress sx={{ color: wh.accent }} />
      </Box>
    );
  }

  const announcements = summary?.announcements || [];
  const firstAnn = announcements[0];
  const restAnn = announcements.slice(1, 3);
  const days = planned?.day_headers?.length || 14;
  const people = planned?.people || [];
  const weekLabel = planned?.week_start ? `From ${planned.week_start}` : "";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
            Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
            Hi {summary?.user?.name?.split(" ")[0] || "there"} — here&apos;s your people snapshot.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {teamPeers.slice(0, 5).map((p, idx) => (
            <Avatar key={p.id} src={undefined} sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 800, ml: idx ? -1 : 0, border: "2px solid #fff" }}>
              {(p.full_name || "?")
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </Avatar>
          ))}
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {mgrError && <Alert severity="warning">{mgrError}</Alert>}

      {/* Planned absences — reference layout */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.75 },
          borderRadius: "28px",
          border: `1px solid ${alpha(wh.ink, 0.06)}`,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          boxShadow: `0 24px 60px ${alpha(wh.ink, 0.07)}`,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Planned absences
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={weekLabel || "This & next week"} size="small" sx={{ fontWeight: 700, borderRadius: 2 }} />
            <Button size="small" variant="outlined" startIcon={<FilterListOutlinedIcon />} component={Link} to="/leave" sx={{ borderRadius: 99, fontWeight: 800 }}>
              Filter
            </Button>
            <Button size="small" component={Link} to="/leave" sx={{ fontWeight: 800 }}>
              View all
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: Math.max(640, 200 + days * 36) }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `minmax(180px, 1fr) repeat(${days}, minmax(32px, 40px))`,
                gap: 0.5,
                alignItems: "stretch",
                borderBottom: `1px solid ${alpha(wh.ink, 0.06)}`,
                pb: 1,
                mb: 0.5,
              }}
            >
              <Box />
              {(planned?.day_headers || []).map((d) => (
                <Box
                  key={d.date}
                  sx={{
                    textAlign: "center",
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor: d.weekend ? alpha(wh.ink, 0.04) : alpha(wh.accentSoft, 0.35),
                    backgroundImage: d.weekend
                      ? `repeating-linear-gradient(-45deg, transparent, transparent 3px, ${alpha(wh.ink, 0.05)} 3px, ${alpha(wh.ink, 0.05)} 6px)`
                      : "none",
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, display: "block", color: "text.secondary", fontSize: 10 }}>
                    {d.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {people.length === 0 && (
              <Typography color="text.secondary" sx={{ fontWeight: 600, py: 3 }}>
                No people in this view.
              </Typography>
            )}

            {people.map((person) => (
              <Box key={person.user_id} sx={{ py: 1.25, borderBottom: `1px solid ${alpha(wh.ink, 0.05)}` }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `minmax(180px, 1fr) repeat(${days}, minmax(32px, 40px))`,
                    gap: 0.5,
                    alignItems: "center",
                    mb: 0.75,
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar sx={{ width: 40, height: 40, fontWeight: 900 }}>{(person.name || "?").slice(0, 1)}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }} noWrap>
                        {person.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>
                        {person.title}
                      </Typography>
                    </Box>
                  </Stack>
                  {(planned?.day_headers || []).map((d) => (
                    <Box key={`${person.user_id}-${d.date}`} sx={{ minHeight: 8 }} />
                  ))}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: `minmax(180px, 1fr) repeat(${days}, minmax(32px, 40px))`, gap: 0.5 }}>
                  <Box />
                  <Box sx={{ gridColumn: `2 / -1`, position: "relative", height: 40, borderRadius: 2, bgcolor: alpha(wh.ink, 0.03) }}>
                    {(person.segments || []).map((seg) => (
                      <Box
                        key={`${seg.request_id}-${seg.kind}-${seg.col_start}`}
                        sx={{
                          position: "absolute",
                          top: 6,
                          left: `calc(${(100 * seg.col_start) / days}% + 2px)`,
                          width: `calc(${(100 * (seg.col_end - seg.col_start + 1)) / days}% - 4px)`,
                          height: 28,
                          borderRadius: 99,
                          background: segmentGradient(seg.tone),
                          boxShadow: `0 6px 16px ${alpha(wh.ink, 0.12)}`,
                          px: 1,
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 900, color: "rgba(255,255,255,0.96)", fontSize: 9, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                          {seg.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {(user?.role === "manager" || user?.role === "hr") && (teamLeave.length > 0 || teamWfh.length > 0) && (
        <Paper sx={{ p: 2.5, borderRadius: "24px", border: `1px solid ${wh.border}`, bgcolor: "#fff" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
            Pending approvals
          </Typography>
          <Stack spacing={2}>
            {teamLeave.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Leave</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamLeave.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.leave_type}</TableCell>
                      <TableCell>{req.employee_name || `#${req.user_id}`}</TableCell>
                      <TableCell>
                        {req.start_date} → {req.end_date}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => decideLeave(req.id, "approved")}>
                          Approve
                        </Button>
                        <Button size="small" color="error" onClick={() => decideLeave(req.id, "rejected")}>
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {teamWfh.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>WFH</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamWfh.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>Remote</TableCell>
                      <TableCell>{req.employee_name || `#${req.user_id}`}</TableCell>
                      <TableCell>
                        {req.start_date} → {req.end_date}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => decideWfh(req.id, "approved")}>
                          Approve
                        </Button>
                        <Button size="small" color="error" onClick={() => decideWfh(req.id, "rejected")}>
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Paper>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: "24px", border: `1px solid ${wh.border}`, boxShadow: `0 16px 40px ${alpha(wh.ink, 0.06)}`, bgcolor: "rgba(255,255,255,0.95)" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Future events
                </Typography>
                <Button size="small" sx={{ fontWeight: 800 }}>
                  View all
                </Button>
              </Stack>
              <List disablePadding>
                {firstAnn && (
                  <ListItem sx={{ borderRadius: 2.5, bgcolor: wh.accentSoft, border: `1px solid ${alpha(wh.accent, 0.45)}`, mb: 1.5, py: 1.5, flexDirection: "column", alignItems: "flex-start" }}>
                    <Chip size="small" label="Soon" sx={{ fontWeight: 800, mb: 1 }} />
                    <ListItemText primary={firstAnn.title} primaryTypographyProps={{ fontWeight: 900 }} secondary="Announcement" secondaryTypographyProps={{ sx: { fontWeight: 600 } }} />
                  </ListItem>
                )}
                {restAnn.map((a) => (
                  <ListItem key={a.id} sx={{ borderRadius: 2, border: `1px solid ${wh.border}`, mb: 1, py: 1.25 }}>
                    <ListItemText primary={a.title} primaryTypographyProps={{ fontWeight: 800 }} />
                  </ListItem>
                ))}
                {!announcements.length && <Typography color="text.secondary">No announcements.</Typography>}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: "24px", border: `1px solid ${wh.border}`, boxShadow: `0 16px 40px ${alpha(wh.ink, 0.06)}`, bgcolor: "rgba(255,255,255,0.95)" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Onboarding
                </Typography>
                <Button size="small" component={Link} to="/profile" sx={{ fontWeight: 800 }}>
                  View all
                </Button>
              </Stack>
              <Grid container spacing={1.5}>
                {modules.slice(0, 4).map((mod) => {
                  const meta = MODULE_META[mod.key];
                  if (!meta) return null;
                  const Icon = meta.Icon;
                  return (
                    <Grid item xs={6} key={mod.key}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, height: "100%", borderColor: wh.border }}>
                        <Stack spacing={0.75}>
                          <Icon sx={{ opacity: 0.85 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                            {meta.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {mod.visible ? "On home" : "Hidden"}
                          </Typography>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Switch size="small" checked={mod.visible} onChange={(e) => toggleModule(mod.key, e.target.checked)} />
                            <Button component={Link} to={meta.to} size="small" sx={{ fontWeight: 800, minWidth: 0 }}>
                              Open
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: "24px",
              border: `1px solid ${wh.border}`,
              boxShadow: `0 16px 40px ${alpha(wh.ink, 0.06)}`,
              background: `linear-gradient(165deg, ${alpha("#e0f2fe", 0.9)} 0%, #fff 45%, ${alpha(wh.accentSoft, 0.5)} 100%)`,
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 30% 30%, #93c5fd, #6366f1 55%, #a78bfa 100%)`,
                    boxShadow: `0 12px 32px ${alpha("#6366f1", 0.35)}`,
                  }}
                />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, textAlign: "center", mb: 0.5 }}>
                Welcome, {summary?.user?.name?.split(" ")[0] || "there"}.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textAlign: "center", mb: 2 }}>
                What can I help with today?
              </Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Button fullWidth variant="text" component={Link} to="/profile" sx={{ justifyContent: "flex-start", fontWeight: 800, borderRadius: 2 }}>
                  Create a profile
                </Button>
                <Button fullWidth variant="text" component={Link} to="/payroll" sx={{ justifyContent: "flex-start", fontWeight: 800, borderRadius: 2 }}>
                  Get reports
                </Button>
                <Button fullWidth variant="text" component={Link} to="/leave" sx={{ justifyContent: "flex-start", fontWeight: 800, borderRadius: 2 }}>
                  Manage leave
                </Button>
              </Stack>
              <Paper variant="outlined" sx={{ p: 1, borderRadius: 3, bgcolor: "rgba(255,255,255,0.75)", borderStyle: "dashed" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ask me anything…"
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                    endAdornment: (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconButton size="small" aria-label="Attach">
                          <AttachFileOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Voice">
                          <MicNoneOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ),
                  }}
                  inputProps={{ readOnly: true }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mt: 0.5 }}>
                  Use the floating Echo button for real answers.
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        More modules: open the top navigation or the rail on desktop — or visit{" "}
        <Button component={Link} to="/profile" size="small" sx={{ fontWeight: 800 }}>
          Profile
        </Button>{" "}
        to tune what appears on your home experience.
      </Typography>
    </Stack>
  );
}
