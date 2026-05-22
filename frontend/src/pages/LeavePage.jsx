import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
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
import { useAuth } from "../context/AuthContext.jsx";
import { wh } from "../theme.js";

export default function LeavePage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [wfhMine, setWfhMine] = useState([]);
  const [team, setTeam] = useState([]);
  const [teamWfh, setTeamWfh] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ leave_type: "earned", start_date: "", end_date: "", reason: "" });

  const balanceByType = useMemo(() => Object.fromEntries(balances.map((b) => [b.leave_type, b])), [balances]);

  const leaveTypeMenuItems = useMemo(() => {
    if (!leaveTypes.length) return [];
    return leaveTypes.map((t) => {
      if (t.uses_balance) {
        const b = balanceByType[t.key];
        if (!b) {
          return { key: t.key, label: t.label, disabled: true, hint: " — balance not set (contact HR)" };
        }
        return { key: t.key, label: `${t.label} (${b.balance_days} days)`, disabled: false, hint: "" };
      }
      return {
        key: t.key,
        label: `${t.label} — HR approves; not deducted from balance`,
        disabled: false,
        hint: "",
      };
    });
  }, [leaveTypes, balanceByType]);

  const load = async () => {
    const [b, r, w, t] = await Promise.all([
      api.get("/api/leave/balance"),
      api.get("/api/leave/requests"),
      api.get("/api/wfh/requests"),
      api.get("/api/leave/types"),
    ]);
    setBalances(b.data);
    setRequests(r.data);
    setWfhMine(w.data);
    setLeaveTypes(t.data);
    if (user?.role === "manager" || user?.role === "hr") {
      const [te, tw] = await Promise.all([api.get("/api/leave/team-requests"), api.get("/api/wfh/team-requests")]);
      setTeam(te.data);
      setTeamWfh(tw.data);
    } else {
      setTeam([]);
      setTeamWfh([]);
    }
  };

  useEffect(() => {
    load().catch((e) => setError(e.displayMessage || "Could not load leave data"));
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (!leaveTypes.length) return;
    setForm((f) => {
      if (leaveTypes.some((t) => t.key === f.leave_type)) return f;
      if (balanceByType.earned) return { ...f, leave_type: "earned" };
      const firstBalanced = leaveTypes.find((t) => t.uses_balance && balanceByType[t.key]);
      const pick = firstBalanced || leaveTypes[0];
      return { ...f, leave_type: pick?.key || "earned" };
    });
  }, [leaveTypes, balanceByType]);

  const apply = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await api.post("/api/leave/requests", {
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      });
      setMsg("Leave request submitted.");
      setForm((f) => ({ ...f, reason: "" }));
      await load();
    } catch (err) {
      setError(err.displayMessage || "Could not submit");
    }
  };

  const decide = async (id, decision) => {
    setError("");
    setMsg("");
    try {
      await api.post(`/api/leave/requests/${id}/decision?decision=${decision}`);
      setMsg(`Request ${decision}.`);
      await load();
    } catch (err) {
      setError(err.displayMessage || "Decision failed");
    }
  };

  const decideWfh = async (id, decision) => {
    setError("");
    setMsg("");
    try {
      await api.post(`/api/wfh/requests/${id}/decision?decision=${decision}`);
      setMsg(`WFH request ${decision}.`);
      await load();
    } catch (err) {
      setError(err.displayMessage || "Decision failed");
    }
  };

  return (
    <Stack spacing={3} component="section" aria-labelledby="leave-heading" sx={{ bgcolor: "#ffffff" }}>
      <Typography id="leave-heading" variant="h4" component="h1" sx={{ fontWeight: 900 }}>
        Leave
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {msg && <Alert severity="success">{msg}</Alert>}

      <Box component="form" onSubmit={apply}>
        <Stack spacing={2} maxWidth={560}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Apply for leave
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Earned, casual, and sick leave use your balances. Bereavement and optional leave are available to everyone and are approved by HR only (not deducted from balances).
          </Typography>
          <TextField select label="Leave type" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} required>
            {leaveTypeMenuItems.map((row) => (
              <MenuItem key={row.key} value={row.key} disabled={row.disabled}>
                {row.label}
                {row.hint}
              </MenuItem>
            ))}
          </TextField>
          <TextField type="date" label="Start" InputLabelProps={{ shrink: true }} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
          <TextField type="date" label="End" InputLabelProps={{ shrink: true }} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
          <TextField label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} multiline minRows={2} />
          <Button type="submit" variant="contained" sx={{ fontWeight: 800 }}>
            Submit request
          </Button>
        </Stack>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }} gutterBottom>
          My leave requests
        </Typography>
        <Table size="small" aria-label="My leave requests" sx={{ border: `1px solid ${wh.border}`, borderRadius: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  {req.leave_type_label || req.leave_type}
                  {req.requires_hr_approval ? (
                    <Chip size="small" label="HR approval" sx={{ ml: 1 }} variant="outlined" />
                  ) : null}
                </TableCell>
                <TableCell>{req.start_date}</TableCell>
                <TableCell>{req.end_date}</TableCell>
                <TableCell>{req.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }} gutterBottom>
          My WFH requests
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
          Submitted from Attendance. Use that page to send new WFH requests.
        </Typography>
        <Table size="small" aria-label="My WFH requests" sx={{ border: `1px solid ${wh.border}`, borderRadius: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wfhMine.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{req.start_date}</TableCell>
                <TableCell>{req.end_date}</TableCell>
                <TableCell sx={{ maxWidth: 320 }}>{req.reason}</TableCell>
                <TableCell>{req.status}</TableCell>
              </TableRow>
            ))}
            {!wfhMine.length && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                    No WFH requests.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {(user?.role === "manager" || user?.role === "hr") && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }} gutterBottom>
            {user?.role === "hr" ? "Organization approvals — leave" : "Team approvals — leave"}
          </Typography>
          {user?.role === "manager" ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
              Bereavement and optional leave are not listed here — they are sent to HR for approval.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
              Includes bereavement and optional leave (HR-only approval).
            </Typography>
          )}
          <Table size="small" aria-label="Pending team leave" sx={{ border: `1px solid ${wh.border}`, borderRadius: 2, mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {team.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.employee_name || `User #${req.user_id}`}</TableCell>
                  <TableCell>
                    {req.leave_type_label || req.leave_type}
                    {req.requires_hr_approval ? <Chip size="small" label="HR route" sx={{ ml: 0.5 }} color="info" variant="outlined" /> : null}
                  </TableCell>
                  <TableCell>
                    {req.start_date} → {req.end_date}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>{req.reason}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => decide(req.id, "approved")} sx={{ mr: 0.5 }}>
                      Approve
                    </Button>
                    <Button size="small" color="error" onClick={() => decide(req.id, "rejected")}>
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!team.length && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                      No pending leave requests.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Typography variant="h6" sx={{ fontWeight: 900 }} gutterBottom>
            Team approvals — work from home
          </Typography>
          <Table size="small" aria-label="Pending team WFH" sx={{ border: `1px solid ${wh.border}`, borderRadius: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamWfh.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.employee_name || `User #${req.user_id}`}</TableCell>
                  <TableCell>
                    {req.start_date} → {req.end_date}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>{req.reason}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => decideWfh(req.id, "approved")} sx={{ mr: 0.5 }}>
                      Approve
                    </Button>
                    <Button size="small" color="error" onClick={() => decideWfh(req.id, "rejected")}>
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!teamWfh.length && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                      No pending WFH requests.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}
