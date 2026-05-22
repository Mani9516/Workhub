import { useState } from "react";
import {
  alpha,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  IconButton,
  Stack,
  TextField,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import api from "../api/client.js";
import { wh } from "../theme.js";

export default function EchoFab() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi, I am Echo — ask me about leave, learning, compliance, or the dashboard." }]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post("/api/chat/echo", { message: userMsg.text });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "I could not reach the assistant service. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Fab
        aria-label="Open Echo assistant"
        onClick={() => setOpen(true)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: (t) => t.zIndex.tooltip,
          width: 64,
          height: 64,
          color: wh.ink,
          bgcolor: wh.accent,
          boxShadow: "0 16px 40px rgba(232, 185, 35, 0.45)",
          "&:hover": { bgcolor: wh.accentHover },
        }}
      >
        <ChatIcon />
      </Fab>
      <Dialog
        fullScreen={typeof window !== "undefined" && window.innerWidth < 600}
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="echo-title"
        PaperProps={{ sx: { borderRadius: { sm: wh.radiusLg }, overflow: "hidden" } }}
      >
        <DialogTitle
          id="echo-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            background: `linear-gradient(120deg, ${alpha(wh.ink, 0.96)} 0%, ${alpha("#2d3544", 0.96)} 100%)`,
            color: "common.white",
            py: 2,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: alpha("#fff", 0.12),
                border: `1px solid ${alpha("#fff", 0.18)}`,
              }}
            >
              <SmartToyOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }}>Echo</Typography>
              <Typography variant="caption" sx={{ color: alpha("#fff", 0.75), fontWeight: 700 }}>
                In-app assistant
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Close chat" onClick={() => setOpen(false)} sx={{ color: "common.white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 360, bgcolor: alpha(wh.ink, 0.02) }}>
          <Stack spacing={1.25}>
            {messages.map((m, idx) => (
              <Box
                key={idx}
                sx={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 2.5,
                  bgcolor: m.role === "user" ? wh.ink : "background.paper",
                  color: m.role === "user" ? "common.white" : "text.primary",
                  border: (t) => `1px solid ${alpha(m.role === "user" ? "#fff" : t.palette.divider, m.role === "user" ? 0.12 : 1)}`,
                  boxShadow: m.role === "user" ? wh.shadow : wh.shadow,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 900, opacity: m.role === "user" ? 0.75 : 0.8 }}>
                  {m.role === "user" ? "You" : "Echo"}
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.25, fontWeight: m.role === "user" ? 600 : 600, lineHeight: 1.65 }}>
                  {m.text}
                </Typography>
              </Box>
            ))}
            {busy && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, bgcolor: "background.paper" }}>
          <TextField
            fullWidth
            placeholder="Ask about leave, policies, learning…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            aria-label="Message Echo"
          />
          <Button variant="contained" endIcon={<SendIcon />} onClick={send} disabled={busy} sx={{ px: 2.5, fontWeight: 900 }}>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
