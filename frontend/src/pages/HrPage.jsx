import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import api from "../api/client.js";

/** Match directory name for assign-cert (employees, managers, HR). */
function resolvePersonByName(query, users) {
  const q = query.trim();
  if (!q) return { kind: "empty" };
  if (!users.length) return { kind: "no_directory" };
  const lower = q.toLowerCase();
  const norm = (s) => String(s).trim().toLowerCase();
  const active = users.filter((u) => u.is_active !== false);
  const exact = active.filter((u) => norm(u.full_name) === lower);
  if (exact.length === 1) return { kind: "single", user: exact[0] };
  if (exact.length > 1) return { kind: "many", users: exact };
  const words = lower.split(/\s+/).filter(Boolean);
  const partial = active.filter((u) => {
    const fn = norm(u.full_name);
    if (fn.includes(lower)) return true;
    return words.length > 0 && words.every((w) => fn.includes(w));
  });
  if (partial.length === 1) return { kind: "single", user: partial[0] };
  if (partial.length > 1) return { kind: "many", users: partial };
  return { kind: "none" };
}

const emptyOnboard = {
  email: "",
  full_name: "",
  initial_password: "",
  department: "General",
  job_title: "Employee",
  manager_id: "",
};

const emptyAssign = {
  person_name: "",
  title: "",
  notes: "",
  learning_item_id: "",
  typical_duration_weeks: "",
  auto_approve: true,
};

const emptyCourse = {
  title: "",
  description: "",
  department_tags: "",
  skill_tags: "",
  duration_hours: 1,
  mandatory_for_roles: "",
};

export default function HrPage() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pendingCerts, setPendingCerts] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [progressOverview, setProgressOverview] = useState([]);
  const [progressFilter, setProgressFilter] = useState("employees");
  const [error, setError] = useState("");
  const [onboard, setOnboard] = useState(emptyOnboard);
  const [onboardMsg, setOnboardMsg] = useState("");
  const [onboardErr, setOnboardErr] = useState("");
  const [onboardBusy, setOnboardBusy] = useState(false);
  const [assign, setAssign] = useState(emptyAssign);
  const [assignMsg, setAssignMsg] = useState("");
  const [assignErr, setAssignErr] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [course, setCourse] = useState(emptyCourse);
  const [courseMsg, setCourseMsg] = useState("");
  const [courseErr, setCourseErr] = useState("");
  const [courseBusy, setCourseBusy] = useState(false);
  const [certBusyId, setCertBusyId] = useState(null);

  const load = async () => {
    const [o, u, meta, pending, cat, prog] = await Promise.all([
      api.get("/api/dashboard/hr-overview"),
      api.get("/api/users"),
      api.get("/api/meta/departments").catch(() => ({ data: { departments: [] } })),
      api.get("/api/certifications/hr/pending").catch(() => ({ data: [] })),
      api.get("/api/learning/catalog").catch(() => ({ data: [] })),
      api.get("/api/learning/hr/progress-overview").catch(() => ({ data: [] })),
    ]);
    setOverview(o.data);
    setUsers(u.data);
    setDepartments(Array.isArray(meta.data?.departments) ? meta.data.departments : []);
    setPendingCerts(Array.isArray(pending.data) ? pending.data : []);
    setCatalog(Array.isArray(cat.data) ? cat.data : []);
    setProgressOverview(Array.isArray(prog.data) ? prog.data : []);
  };

  useEffect(() => {
    load().catch((e) => {
      const raw = e.displayMessage || e.message || "HR data unavailable";
      const network =
        raw === "Network Error" ||
        (typeof raw === "string" && /network/i.test(raw)) ||
        e.code === "ERR_NETWORK";
      setError(
        network
          ? "Could not reach the API (network error). Use the app URL that proxies /api (e.g. Docker http://localhost:8080), or for local Vite set VITE_API_URL to your API (e.g. http://127.0.0.1:8000) and restart the dev server."
          : raw,
      );
    });
  }, []);

  const managerChoices = useMemo(
    () => users.filter((u) => u.role === "manager" || u.role === "hr"),
    [users],
  );

  const assignUserChoices = useMemo(() => users.filter((u) => u.is_active !== false), [users]);

  const userById = useMemo(() => {
    const m = {};
    for (const u of users) m[u.id] = u;
    return m;
  }, [users]);

  const assignNameResolution = useMemo(
    () => resolvePersonByName(assign.person_name, assignUserChoices),
    [assign.person_name, assignUserChoices],
  );

  const filteredLearningProgress = useMemo(() => {
    if (progressFilter === "all") return progressOverview;
    return progressOverview.filter((row) => row.role === "employee");
  }, [progressOverview, progressFilter]);

  const submitOnboard = async (e) => {
    e.preventDefault();
    setOnboardMsg("");
    setOnboardErr("");
    setOnboardBusy(true);
    try {
      await api.post("/api/admin/onboard", {
        email: onboard.email.trim(),
        full_name: onboard.full_name.trim(),
        initial_password: onboard.initial_password,
        department: onboard.department.trim() || "General",
        job_title: onboard.job_title.trim() || "Employee",
        manager_id: onboard.manager_id === "" ? null : Number(onboard.manager_id),
      });
      setOnboardMsg("Employee created with earned, casual, and sick leave balances. Share their sign-in email and temporary password.");
      setOnboard(emptyOnboard);
      await load();
    } catch (err) {
      setOnboardErr(err.displayMessage || "Onboarding failed");
    } finally {
      setOnboardBusy(false);
    }
  };

  const approveEntry = async (id) => {
    setCertBusyId(id);
    try {
      await api.post(`/api/certifications/hr/entries/${id}/approve`);
      await load();
    } catch (err) {
      setError(err.displayMessage || "Approve failed");
    } finally {
      setCertBusyId(null);
    }
  };

  const rejectEntry = async (id) => {
    setCertBusyId(id);
    try {
      await api.post(`/api/certifications/hr/entries/${id}/reject`);
      await load();
    } catch (err) {
      setError(err.displayMessage || "Reject failed");
    } finally {
      setCertBusyId(null);
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    setAssignMsg("");
    setAssignErr("");
    const resolved = resolvePersonByName(assign.person_name, assignUserChoices);
    if (resolved.kind !== "single") {
      setAssignErr(
        resolved.kind === "empty"
          ? "Enter the person's full name."
          : resolved.kind === "no_directory"
            ? "User directory did not load — fix connection and refresh the page."
            : resolved.kind === "many"
              ? "That text matches more than one person — type the full name exactly as in the directory."
              : "No person matches that name — check spelling or use the full name from the directory below.",
      );
      return;
    }
    setAssignBusy(true);
    try {
      const w = assign.typical_duration_weeks === "" ? null : Number(assign.typical_duration_weeks);
      const typical_duration_weeks =
        w != null && Number.isFinite(w) && w >= 1 ? Math.min(520, Math.floor(w)) : null;
      await api.post("/api/certifications/hr/assign", {
        user_id: resolved.user.id,
        title: assign.title.trim(),
        notes: (assign.notes || "").trim(),
        learning_item_id: assign.learning_item_id === "" ? null : Number(assign.learning_item_id),
        auto_approve: assign.auto_approve,
        typical_duration_weeks,
      });
      setAssignMsg(
        assign.auto_approve
          ? "Certification recorded and approved for that person."
          : "Certification queued as pending HR (same as a self-request).",
      );
      setAssign(emptyAssign);
      await load();
    } catch (err) {
      setAssignErr(err.displayMessage || "Assign failed");
    } finally {
      setAssignBusy(false);
    }
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    setCourseMsg("");
    setCourseErr("");
    setCourseBusy(true);
    try {
      await api.post("/api/learning/items", null, {
        params: {
          title: course.title.trim(),
          description: (course.description || "").trim(),
          department_tags: (course.department_tags || "").trim(),
          skill_tags: (course.skill_tags || "").trim(),
          duration_hours: Number(course.duration_hours) || 1,
          mandatory_for_roles: (course.mandatory_for_roles || "").trim(),
        },
      });
      setCourseMsg("New course added to the catalog. Everyone records study progress as % on Learning; only HR marks a course complete.");
      setCourse(emptyCourse);
      await load();
    } catch (err) {
      setCourseErr(err.displayMessage || "Could not create course");
    } finally {
      setCourseBusy(false);
    }
  };

  return (
    <Stack spacing={2} component="section" aria-labelledby="hr-heading">
      <Typography id="hr-heading" variant="h4" component="h1">
        HR console
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
            Certification queue (pending HR)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nothing appears on employee or manager profiles until a row here is approved. They can update self-reported preparation % on Profile; only HR can approve or reject.
          </Typography>
          {pendingCerts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No pending certification requests.
            </Typography>
          ) : (
            <Table size="small" aria-label="Pending certifications">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Est. weeks</TableCell>
                  <TableCell align="right">Prep %</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Course link</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingCerts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.employee_name || `User #${row.user_id}`}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.typical_duration_weeks != null ? `${row.typical_duration_weeks} wk` : "—"}</TableCell>
                    <TableCell align="right">{row.self_progress_pct ?? 0}%</TableCell>
                    <TableCell>{row.notes || "—"}</TableCell>
                    <TableCell>{row.learning_item_id != null ? `#${row.learning_item_id}` : "—"}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={certBusyId === row.id}
                          onClick={() => approveEntry(row.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={certBusyId === row.id}
                          onClick={() => rejectEntry(row.id)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
            Assign certification / course
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Record a certification for someone (optionally tied to a catalog course). Leave &quot;Approve immediately&quot; checked so it shows on their profile and career insights right away. Type their <strong>full name</strong> as it appears in the workforce directory (employees, managers, and HR).
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>HR-only:</strong> only people with the HR role can approve certification requests or record HR-verified credentials. Employees and managers can submit requests, but they cannot mark a credential as HR-approved.
          </Alert>
          {assignMsg && <Alert severity="success" sx={{ mb: 2 }}>{assignMsg}</Alert>}
          {assignErr && <Alert severity="error" sx={{ mb: 2 }}>{assignErr}</Alert>}
          <Stack component="form" onSubmit={submitAssign} spacing={2} maxWidth={560}>
            <TextField
              label="Person's full name"
              required
              value={assign.person_name}
              onChange={(e) => setAssign({ ...assign, person_name: e.target.value })}
              placeholder="e.g. Alex Rivers"
              error={assignNameResolution.kind === "none" && assign.person_name.trim().length > 0}
              helperText={
                assignNameResolution.kind === "empty"
                  ? "Start typing a name; when exactly one person matches, you can save."
                  : assignNameResolution.kind === "no_directory"
                    ? "User list not loaded — fix the connection (see banner above) and refresh."
                    : assignNameResolution.kind === "single"
                      ? `Matched: ${assignNameResolution.user.full_name} (${assignNameResolution.user.role}) · ${assignNameResolution.user.email}`
                      : assignNameResolution.kind === "many"
                        ? `Multiple matches (${assignNameResolution.users.length}) — type the full name exactly.`
                        : "No match — use the exact full name from the directory."
              }
            />
            {assignNameResolution.kind === "many" && (
              <Alert severity="warning" sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Several people match &quot;{assign.person_name.trim()}&quot;. Use one of these full names:
                </Typography>
                <Stack component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {assignNameResolution.users.map((u) => (
                    <Typography key={u.id} component="li" variant="body2">
                      {u.full_name} ({u.role}) — {u.email}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}
            {assignNameResolution.kind === "single" && (
              <Alert severity="info" sx={{ py: 0.75 }}>
                Certification will be saved for <strong>{assignNameResolution.user.full_name}</strong> ({assignNameResolution.user.role}
                {assignNameResolution.user.role === "employee" && userById[assignNameResolution.user.manager_id]
                  ? `, reports to ${userById[assignNameResolution.user.manager_id].full_name}`
                  : ""}
                ).
              </Alert>
            )}
            <TextField
              label="Certification title"
              required
              value={assign.title}
              onChange={(e) => setAssign({ ...assign, title: e.target.value })}
            />
            <TextField
              label="Notes (optional)"
              value={assign.notes}
              onChange={(e) => setAssign({ ...assign, notes: e.target.value })}
              multiline
              minRows={2}
            />
            <FormControl fullWidth>
              <InputLabel id="assign-course-label">Related catalog course (optional)</InputLabel>
              <Select
                labelId="assign-course-label"
                label="Related catalog course (optional)"
                value={assign.learning_item_id === "" ? "" : String(assign.learning_item_id)}
                onChange={(e) =>
                  setAssign({ ...assign, learning_item_id: e.target.value === "" ? "" : e.target.value })
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {catalog.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Estimated time to complete (weeks)"
              type="number"
              inputProps={{ min: 1, max: 520, step: 1 }}
              value={assign.typical_duration_weeks}
              onChange={(e) => setAssign({ ...assign, typical_duration_weeks: e.target.value })}
              helperText="Optional. Shown to the employee on profile and in this HR view."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={assign.auto_approve}
                  onChange={(e) => setAssign({ ...assign, auto_approve: e.target.checked })}
                />
              }
              label="Approve immediately (visible on profile & career)"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={assignBusy || assignNameResolution.kind !== "single" || !assign.title.trim()}
              sx={{ fontWeight: 800, alignSelf: "flex-start" }}
            >
              {assignBusy ? "Saving…" : "Save assignment"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
            Add learning course
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            New catalog items appear for everyone; link them when assigning certifications above.
          </Typography>
          {courseMsg && <Alert severity="success" sx={{ mb: 2 }}>{courseMsg}</Alert>}
          {courseErr && <Alert severity="error" sx={{ mb: 2 }}>{courseErr}</Alert>}
          <Stack component="form" onSubmit={submitCourse} spacing={2} maxWidth={560}>
            <TextField label="Title" required value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
            <TextField
              label="Description"
              value={course.description}
              onChange={(e) => setCourse({ ...course, description: e.target.value })}
              multiline
              minRows={2}
            />
            <TextField
              label="Department tags (comma-separated)"
              value={course.department_tags}
              onChange={(e) => setCourse({ ...course, department_tags: e.target.value })}
              helperText="e.g. Marketing, Finance"
            />
            <TextField
              label="Skill tags (comma-separated)"
              value={course.skill_tags}
              onChange={(e) => setCourse({ ...course, skill_tags: e.target.value })}
            />
            <TextField
              label="Duration (hours)"
              type="number"
              inputProps={{ min: 0.25, step: 0.25 }}
              value={course.duration_hours}
              onChange={(e) => setCourse({ ...course, duration_hours: e.target.value })}
            />
            <TextField
              label="Mandatory for roles (optional)"
              value={course.mandatory_for_roles}
              onChange={(e) => setCourse({ ...course, mandatory_for_roles: e.target.value })}
              helperText="Comma-separated role names if you use this field."
            />
            <Button type="submit" variant="contained" disabled={courseBusy} sx={{ fontWeight: 800, alignSelf: "flex-start" }}>
              {courseBusy ? "Creating…" : "Create course"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
            Onboard new hire
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates an <strong>employee</strong> account, optional reporting manager, and default leave balances (earned, casual, sick). Promote to manager later via user admin tools if needed.
          </Typography>
          {onboardMsg && <Alert severity="success" sx={{ mb: 2 }}>{onboardMsg}</Alert>}
          {onboardErr && <Alert severity="error" sx={{ mb: 2 }}>{onboardErr}</Alert>}
          <Stack component="form" onSubmit={submitOnboard} spacing={2} maxWidth={520}>
            <TextField
              label="Work email"
              type="email"
              required
              value={onboard.email}
              onChange={(e) => setOnboard({ ...onboard, email: e.target.value })}
              autoComplete="off"
            />
            <TextField label="Full name" required value={onboard.full_name} onChange={(e) => setOnboard({ ...onboard, full_name: e.target.value })} />
            <TextField
              label="Initial password"
              type="password"
              required
              helperText="Employee changes this after first sign-in (recommended)."
              value={onboard.initial_password}
              onChange={(e) => setOnboard({ ...onboard, initial_password: e.target.value })}
              autoComplete="new-password"
            />
            <TextField
              label="Department"
              value={onboard.department}
              onChange={(e) => setOnboard({ ...onboard, department: e.target.value })}
              helperText="Use suggestions or type any department (Marketing, Social Media, Finance, …)."
              InputProps={{ inputProps: { list: "hr-dept-suggestions" } }}
            />
            <datalist id="hr-dept-suggestions">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <TextField label="Job title" value={onboard.job_title} onChange={(e) => setOnboard({ ...onboard, job_title: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel id="mgr-label">Reporting manager (optional)</InputLabel>
              <Select
                labelId="mgr-label"
                label="Reporting manager (optional)"
                value={onboard.manager_id === "" ? "" : String(onboard.manager_id)}
                onChange={(e) => setOnboard({ ...onboard, manager_id: e.target.value === "" ? "" : e.target.value })}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {managerChoices.map((m) => (
                  <MenuItem key={m.id} value={String(m.id)}>
                    {m.full_name} ({m.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" disabled={onboardBusy} sx={{ fontWeight: 800, alignSelf: "flex-start" }}>
              {onboardBusy ? "Creating…" : "Create employee"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {overview && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Organization snapshot
            </Typography>
            <Typography variant="body2">Total employees: {overview.total_employees}</Typography>
            <Typography variant="body2">Pending leave (all): {overview.pending_leave_globally}</Typography>
            <Typography variant="body2">Learning completions: {overview.learning_completions_recorded}</Typography>
            <Typography variant="body2">Policy acknowledgements: {overview.policy_acknowledgements}</Typography>
          </CardContent>
        </Card>
      )}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
            Employee progress: learning, certifications &amp; role ideas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Expand each person for <strong>catalog courses</strong> (self-reported % and HR-only complete), <strong>HR-approved and pending certifications</strong> (only HR can
            approve; employees/managers report prep % on Profile), and <strong>suggested certifications / open roles</strong> from their skills and goals. Managers and HR also
            take courses — use <strong>Everyone</strong> to include them.
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Show:
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={progressFilter}
              onChange={(_, v) => v != null && setProgressFilter(v)}
              aria-label="Filter learning progress list"
            >
              <ToggleButton value="employees">Employees only</ToggleButton>
              <ToggleButton value="all">Everyone</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              {filteredLearningProgress.length} people
            </Typography>
          </Stack>
          {filteredLearningProgress.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {progressOverview.length === 0
                ? "No progress data loaded yet (check connection), or no people match this filter."
                : "No rows for this filter."}
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {filteredLearningProgress.map((row) => {
                const pct = row.courses_total > 0 ? Math.round((row.courses_completed / row.courses_total) * 100) : 0;
                return (
                  <Accordion key={row.user_id} disableGutters variant="outlined">
                    <AccordionSummary expandIcon={<ExpandMoreIcon aria-hidden />}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        sx={{ width: "100%", pr: 1 }}
                      >
                        <Typography sx={{ fontWeight: 800, minWidth: 0 }}>{row.full_name}</Typography>
                        <Chip size="small" label={row.role} variant="outlined" />
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                          {row.email}
                        </Typography>
                        <Box sx={{ flexGrow: 1, minWidth: 140, maxWidth: 420 }}>
                          <Stack spacing={0.4}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                Learning
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {row.courses_completed}/{row.courses_total} courses
                              </Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 1 }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                Certifications (HR-verified vs in review)
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {row.certification_progress_pct ?? 0}%
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={row.certification_progress_pct ?? 0}
                              color="secondary"
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Stack>
                        </Box>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, px: 1, pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {row.job_title} · {row.department || "—"}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
                        Learning catalog
                      </Typography>
                      {row.courses_total === 0 ? (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          No courses in the catalog yet.
                        </Alert>
                      ) : (
                        <Table size="small" sx={{ mb: 2 }} aria-label={`Learning courses for ${row.full_name}`}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Course</TableCell>
                              <TableCell align="right">Progress</TableCell>
                              <TableCell align="right">Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {row.courses.map((c) => (
                              <TableRow key={c.learning_item_id}>
                                <TableCell>{c.title}</TableCell>
                                <TableCell align="right">{c.completed ? "100%" : `${c.progress_pct ?? 0}%`}</TableCell>
                                <TableCell align="right">
                                  {c.completed ? (
                                    <Chip label="Complete (HR)" color="success" size="small" />
                                  ) : (
                                    <Chip label="In progress" size="small" variant="outlined" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
                        Certifications
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Approve pending rows in the queue above. Prep % = self-reported preparation from the employee/manager. Est. weeks = expected time to complete the
                        credential (from request or HR assign).
                      </Typography>
                      {(row.certifications || []).length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          No approved or in-review certifications.
                        </Typography>
                      ) : (
                        <Table size="small" sx={{ mb: 2 }} aria-label={`Certifications for ${row.full_name}`}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Title</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Prep %</TableCell>
                              <TableCell align="right">Est. weeks</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(row.certifications || []).map((c, idx) => (
                              <TableRow key={`${row.user_id}-cert-${idx}`}>
                                <TableCell>{c.title}</TableCell>
                                <TableCell>
                                  {c.status === "approved" ? (
                                    <Chip label="Approved" color="success" size="small" />
                                  ) : (
                                    <Chip label="Pending HR" size="small" variant="outlined" />
                                  )}
                                </TableCell>
                                <TableCell align="right">{c.status === "pending_hr" ? `${c.self_progress_pct ?? 0}%` : "—"}</TableCell>
                                <TableCell align="right">{c.typical_duration_weeks != null ? `${c.typical_duration_weeks}` : "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                        Suggested certifications (from skills / goals)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                        Heuristic ideas only — not an official credential list.
                      </Typography>
                      {(row.skill_insights?.suggested_certifications || []).length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Add skills or career goals on Profile to populate ideas.
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                          {(row.skill_insights?.suggested_certifications || []).map((t) => (
                            <Chip key={t} label={t} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                        Open role directions (from profile + approved certs)
                      </Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {(row.skill_insights?.open_roles || []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        ) : (
                          (row.skill_insights?.open_roles || []).map((t) => <Chip key={t} label={t} size="small" />)
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
      <Divider />
      <Typography variant="h6">Workforce directory</Typography>
      <Table size="small" aria-label="Users">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Department</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.full_name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{u.department}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
