import { useState } from "react";
import {
  alpha,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { wh } from "../theme.js";

const RAIL = 76;

const allLinks = [
  { to: "/", label: "Dashboard", roles: ["employee", "manager", "hr"] },
  { to: "/profile", label: "Profile", roles: ["employee", "manager", "hr"] },
  { to: "/attendance", label: "Attendance", roles: ["employee", "manager", "hr"] },
  { to: "/leave", label: "Leave", roles: ["employee", "manager", "hr"] },
  { to: "/payroll", label: "Payroll", roles: ["employee", "manager", "hr"] },
  { to: "/learning", label: "Learning", roles: ["employee", "manager", "hr"] },
  { to: "/career", label: "Career", roles: ["employee", "manager", "hr"] },
  { to: "/wellness", label: "Wellness", roles: ["employee", "manager", "hr"] },
  { to: "/compliance", label: "Compliance", roles: ["employee", "manager", "hr"] },
  { to: "/hr", label: "HR Console", roles: ["hr"] },
];

const railItems = [
  { to: "/", label: "Home", icon: DashboardRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/leave", label: "Leave & WFH", icon: EventNoteRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/attendance", label: "Attendance", icon: AccessTimeRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/learning", label: "Learning", icon: SchoolRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/compliance", label: "Compliance", icon: GavelRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/payroll", label: "Payroll", icon: PaymentsRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/career", label: "Career", icon: TrendingUpRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/wellness", label: "Wellness", icon: SpaRoundedIcon, roles: ["employee", "manager", "hr"] },
  { to: "/hr", label: "HR", icon: AdminPanelSettingsRoundedIcon, roles: ["hr"] },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMd = useMediaQuery("(min-width:900px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const links = allLinks.filter((l) => l.roles.includes(user?.role));
  const railLinks = railItems.filter((l) => l.roles.includes(user?.role));
  const initials = (user?.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const tabValue = links.some((l) => l.to === location.pathname) ? location.pathname : false;

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", pt: 2 }}>
      <Box sx={{ px: 2.5, pb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            bgcolor: wh.accentSoft,
            color: wh.ink,
            border: `1px solid ${alpha(wh.accent, 0.35)}`,
          }}
        >
          <HubOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.4, lineHeight: 1.1 }}>
            WorkHub
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Menu
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ opacity: 0.7 }} />
      <List sx={{ flex: 1, px: 1.25, py: 1.5 }}>
        {links.map((item) => {
          const selected = location.pathname === item.to;
          const iconMap = {
            "/": <DashboardRoundedIcon fontSize="small" />,
            "/profile": <PersonRoundedIcon fontSize="small" />,
            "/attendance": <AccessTimeRoundedIcon fontSize="small" />,
            "/leave": <EventNoteRoundedIcon fontSize="small" />,
            "/payroll": <PaymentsRoundedIcon fontSize="small" />,
            "/learning": <SchoolRoundedIcon fontSize="small" />,
            "/career": <TrendingUpRoundedIcon fontSize="small" />,
            "/wellness": <SpaRoundedIcon fontSize="small" />,
            "/compliance": <GavelRoundedIcon fontSize="small" />,
            "/hr": <AdminPanelSettingsRoundedIcon fontSize="small" />,
          };
          return (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              aria-current={selected ? "page" : undefined}
              sx={{
                borderRadius: 2.5,
                mb: 0.5,
                "&.Mui-selected": {
                  bgcolor: wh.accentSoft,
                  border: `1px solid ${alpha(wh.accent, 0.45)}`,
                  "&:hover": { bgcolor: alpha(wh.accentSoft, 0.95) },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: selected ? "text.primary" : "text.secondary" }}>{iconMap[item.to]}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 800 : 600, fontSize: 15 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ opacity: 0.7 }} />
      <List sx={{ px: 1.25, py: 1 }}>
        <ListItemButton
          onClick={() => {
            logout();
            navigate("/login");
          }}
          sx={{ borderRadius: 2.5 }}
          aria-label="Log out"
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Log out" primaryTypographyProps={{ fontWeight: 700 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  const rail = (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        width: RAIL,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: RAIL,
          boxSizing: "border-box",
          borderRight: `1px solid ${wh.border}`,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
          overflowX: "hidden",
        },
      }}
    >
      <Box component={Link} to="/" sx={{ mb: 2, textDecoration: "none", color: "inherit" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: wh.accentSoft,
            border: `1px solid ${alpha(wh.accent, 0.4)}`,
            boxShadow: `0 8px 24px ${alpha(wh.ink, 0.06)}`,
          }}
        >
          <HubOutlinedIcon sx={{ fontSize: 24, color: wh.ink }} />
        </Box>
      </Box>
      <Stack spacing={0.75} alignItems="center" sx={{ flex: 1, width: "100%" }}>
        {railLinks.map((item) => {
          const Icon = item.icon;
          const selected = location.pathname === item.to;
          return (
            <Tooltip key={item.to} title={item.label} placement="right">
              <IconButton
                component={Link}
                to={item.to}
                size="medium"
                aria-label={item.label}
                sx={{
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  color: selected ? "primary.contrastText" : "text.secondary",
                  bgcolor: selected ? wh.ink : alpha(wh.ink, 0.04),
                  border: selected ? "none" : `1px solid ${alpha(wh.ink, 0.06)}`,
                  "&:hover": { bgcolor: selected ? wh.ink : alpha(wh.ink, 0.08) },
                }}
              >
                <Icon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>
      <Tooltip title="Profile & settings" placement="right">
        <IconButton component={Link} to="/profile" sx={{ borderRadius: "50%", color: "text.secondary", mb: 0.5 }} aria-label="Profile">
          <PersonRoundedIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Log out" placement="right">
        <IconButton
          onClick={() => {
            logout();
            navigate("/login");
          }}
          sx={{ borderRadius: "50%", color: "text.secondary" }}
          aria-label="Log out"
        >
          <LogoutRoundedIcon />
        </IconButton>
      </Tooltip>
    </Drawer>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f4f6fa" }}>
      {rail}

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: (t) => t.zIndex.drawer + 1,
            left: { xs: 0, md: RAIL },
            width: { xs: "100%", md: `calc(100% - ${RAIL}px)` },
            bgcolor: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(14px)",
            borderBottom: `1px solid ${wh.border}`,
            boxShadow: `0 8px 32px ${alpha(wh.ink, 0.04)}`,
          }}
        >
          <Toolbar
            sx={{
              gap: { xs: 0.5, sm: 1, md: 2 },
              minHeight: { xs: 58, md: 70 },
              px: { xs: 1, sm: 2, md: 2.5 },
              flexWrap: "nowrap",
              maxWidth: "100%",
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {!isMd && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu" sx={{ color: "text.primary", flexShrink: 0 }}>
                <MenuIcon />
              </IconButton>
            )}

            <Typography
              variant="subtitle1"
              component={Link}
              to="/"
              sx={{
                fontWeight: 900,
                letterSpacing: -0.3,
                textDecoration: "none",
                color: "text.primary",
                display: { xs: "none", sm: "block" },
                flexShrink: 0,
                pr: 1,
              }}
            >
              WorkHub
            </Typography>

            {isMd && (
              <Tabs
                value={tabValue}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  flex: 1,
                  minWidth: 0,
                  mx: 1,
                  "& .MuiTabs-indicator": { display: "none" },
                  "& .MuiTabs-scrollButtons": { color: "text.secondary" },
                }}
              >
                {links.map((item) => (
                  <Tab key={item.to} label={item.label} value={item.to} component={Link} to={item.to} disableRipple sx={{ minHeight: 44, px: 1.25 }} />
                ))}
              </Tabs>
            )}

            {!isMd && <Box sx={{ flex: 1, minWidth: 4 }} />}

            <Stack direction="row" alignItems="center" sx={{ flexShrink: 0, gap: { xs: 0, sm: 0.25 } }}>
              <IconButton
                aria-label="Search"
                size={isMd ? "medium" : "small"}
                onClick={() => setSearchOpen(true)}
                sx={{ color: "text.secondary", borderRadius: 2, p: { xs: 0.75, md: 1 } }}
              >
                <SearchIcon fontSize={isMd ? "medium" : "small"} />
              </IconButton>
              <IconButton
                aria-label="Notifications"
                size={isMd ? "medium" : "small"}
                onClick={() => setNotifOpen(true)}
                sx={{ color: "text.secondary", borderRadius: 2, p: { xs: 0.75, md: 1 } }}
              >
                <Badge variant="dot" overlap="circular" sx={{ "& .MuiBadge-badge": { bgcolor: wh.accent, color: wh.ink } }}>
                  <NotificationsNoneOutlinedIcon fontSize={isMd ? "medium" : "small"} />
                </Badge>
              </IconButton>
              <IconButton
                aria-label="Settings"
                size={isMd ? "medium" : "small"}
                component={Link}
                to="/profile"
                sx={{ color: "text.secondary", borderRadius: 2, p: { xs: 0.75, md: 1 } }}
              >
                <SettingsOutlinedIcon fontSize={isMd ? "medium" : "small"} />
              </IconButton>
            </Stack>

            <Button
              component={Link}
              to="/leave"
              variant="contained"
              size="small"
              sx={{
                display: { xs: "none", lg: "inline-flex" },
                fontWeight: 800,
                borderRadius: 99,
                px: 2,
                flexShrink: 0,
                ml: 1,
              }}
            >
              + Request leave
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, md: 1 }, pl: { xs: 0.5, md: 1 }, flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: { xs: 36, md: 42 },
                  height: { xs: 36, md: 42 },
                  fontWeight: 900,
                  fontSize: 14,
                  bgcolor: wh.ink,
                  color: "#fff",
                  border: `2px solid ${alpha(wh.accent, 0.65)}`,
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, maxWidth: 160 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.15 }} noWrap>
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {user?.role}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm" aria-labelledby="search-dialog-title">
          <DialogTitle id="search-dialog-title">Search</DialogTitle>
          <DialogContent>
            <TextField autoFocus fullWidth placeholder="Search people, pages, or help…" margin="dense" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 600 }}>
              Connect your directory or search index here later.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSearchOpen(false)} sx={{ fontWeight: 800 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={notifOpen} onClose={() => setNotifOpen(false)} maxWidth="xs" fullWidth aria-labelledby="notif-dialog-title">
          <DialogTitle id="notif-dialog-title">Notifications</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              You&apos;re all caught up — no new notifications.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNotifOpen(false)} sx={{ fontWeight: 800 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {!isMd && (
          <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ [`& .MuiDrawer-paper`]: { width: 300, boxSizing: "border-box" } }}>
            {drawer}
          </Drawer>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            width: "100%",
            pt: { xs: "58px", md: "70px" },
            pb: { xs: 10, md: 4 },
            px: { xs: 1.5, sm: 2, md: 2.5 },
            maxWidth: 1400,
            mx: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
