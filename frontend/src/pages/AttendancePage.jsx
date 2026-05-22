import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/client.js";
import { wh } from "../theme.js";

export default function AttendancePage() {
  const [rows, setRows] = useState([]);
  const [wfhList, setWfhList] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [wfhForm, setWfhForm] = useState({ start_date: "", end_date: "", reason: "" });

  const load = async () => {
    const { data } = await api.get("/api/attendance/me");
    setRows(data);
  };

  const loadWfh = async () => {
    const { data } = await api.get("/api/wfh/requests");
    setWfhList(data);
  };

  useEffect(() => {
    load().catch(() => setError("Could not load attendance"));
    loadWfh().catch(() => {});
  }, []);

  const checkin = async (status) => {
    setMsg("");
    setError("");
    try {
      await api.post(`/api/attendance/checkin?status=${encodeURIComponent(status)}`);
      setMsg(`Marked as ${status}.`);
      await load();
    } catch (e) {
      setError(e.displayMessage || "Check-in failed");
    }
  };

  const submitWfh = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await api.post("/api/wfh/requests", {
        start_date: wfhForm.start_date,
        end_date: wfhForm.end_date,
        reason: wfhForm.reason.trim(),
      });
      setMsg("Work-from-home request sent for approval.");
      setWfhForm({ start_date: "", end_date: "", reason: "" });
      await loadWfh();
    } catch (err) {
      setError(err.displayMessage || "Could not submit WFH request");
    }
  };

  return (
    <Stack spacing={3} component="section" aria-labelledby="attendance-heading" sx={{ bgcolor: "#ffffff" }}>
      <Typography id="attendance-heading" variant="h4" component="h1" sx={{ fontWeight: 900 }}>
        Attendance
      </Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: wh.radiusLg,
              border: `1px solid ${wh.border}`,
              bgcolor: "#ffffff",
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
              Today{"'"}s check-in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
              Mark your attendance for today. Multi-day work from home uses the form on the right.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" onClick={() => checkin("present")} sx={{ fontWeight: 800 }}>
                Mark present
              </Button>
            </Stack>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 3, mb: 1 }}>
              Recent days
            </Typography>
            <Table size="small" aria-label="Attendance history">
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.day}>
                    <TableCell>{r.day}</TableCell>
                    <TableCell>{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            component="form"
            onSubmit={submitWfh}
            sx={{
              p: 2.5,
              borderRadius: wh.radiusLg,
              border: `1px solid ${wh.border}`,
              bgcolor: "#ffffff",
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
              Work from home
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
              Request remote work for a date range. Your manager will be notified to approve or reject.
            </Typography>
            <Stack spacing={2}>
              <TextField
                type="date"
                label="Start date"
                InputLabelProps={{ shrink: true }}
                value={wfhForm.start_date}
                onChange={(e) => setWfhForm({ ...wfhForm, start_date: e.target.value })}
                required
                fullWidth
              />
              <TextField
                type="date"
                label="End date"
                InputLabelProps={{ shrink: true }}
                value={wfhForm.end_date}
                onChange={(e) => setWfhForm({ ...wfhForm, end_date: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Reason for work from home"
                value={wfhForm.reason}
                onChange={(e) => setWfhForm({ ...wfhForm, reason: e.target.value })}
                multiline
                minRows={3}
                required
                fullWidth
                placeholder="Describe why you need to work remotely for this period."
              />
              <Button type="submit" variant="contained" sx={{ fontWeight: 800, alignSelf: "flex-start" }}>
                Send for approval
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: wh.radiusLg,
          border: `1px solid ${wh.border}`,
          bgcolor: "#ffffff",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
          My WFH requests
        </Typography>
        <Table size="small" aria-label="My WFH requests">
          <TableHead>
            <TableRow>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wfhList.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.start_date}</TableCell>
                <TableCell>{r.end_date}</TableCell>
                <TableCell sx={{ maxWidth: 360 }}>{r.reason}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
            {!wfhList.length && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                    No WFH requests yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
