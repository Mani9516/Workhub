import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Link,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api from "../api/client.js";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [certMe, setCertMe] = useState({
    approved_titles: [],
    approved_items: [],
    pending: [],
    progress_verified_pct: 0,
    self_reported_pending_avg_pct: 0,
  });
  const [certPendingDraft, setCertPendingDraft] = useState({});
  const [certReq, setCertReq] = useState({ title: "", notes: "", typical_duration_weeks: "" });
  const [learningDone, setLearningDone] = useState([]);
  const [skillInsights, setSkillInsights] = useState({ suggested_certifications: [], open_roles: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reloadCerts = useCallback(async () => {
    const { data } = await api.get("/api/certifications/me");
    setCertMe(data);
  }, []);

  const reloadInsights = useCallback(async () => {
    try {
      const { data } = await api.get("/api/career/skill-insights");
      setSkillInsights({
        suggested_certifications: Array.isArray(data?.suggested_certifications) ? data.suggested_certifications : [],
        open_roles: Array.isArray(data?.open_roles) ? data.open_roles : [],
      });
    } catch {
      setSkillInsights({ suggested_certifications: [], open_roles: [] });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data }, prog, meta, certs] = await Promise.all([
        api.get("/api/users/me"),
        api.get("/api/learning/catalog-with-progress").catch(() => ({ data: [] })),
        api.get("/api/meta/departments").catch(() => ({ data: { departments: [] } })),
        api.get("/api/certifications/me").catch(() => ({
          data: {
            approved_titles: [],
            approved_items: [],
            pending: [],
            progress_verified_pct: 0,
            self_reported_pending_avg_pct: 0,
          },
        })),
      ]);
      setUser(data);
      setForm({
        full_name: data.full_name,
        department: data.department,
        job_title: data.job_title,
        skills: data.skills || "",
        interests: data.interests || "",
        career_goals: data.career_goals || "",
      });
      setDepartments(Array.isArray(meta.data?.departments) ? meta.data.departments : []);
      setCertMe(certs.data);
      const rows = Array.isArray(prog.data) ? prog.data : [];
      setLearningDone(rows.filter((r) => r.completed));
      await reloadInsights();
    })();
  }, [reloadInsights]);

  const save = async () => {
    setMessage("");
    setError("");
    try {
      const { data } = await api.patch("/api/users/me", form);
      setUser(data);
      setMessage("Profile updated.");
      await reloadInsights();
    } catch (e) {
      setError(e.displayMessage || "Update failed");
    }
  };

  const submitCertRequest = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await api.post("/api/certifications/request", {
        title: certReq.title.trim(),
        notes: certReq.notes.trim(),
        typical_duration_weeks:
          certReq.typical_duration_weeks === ""
            ? null
            : (() => {
                const n = Number(certReq.typical_duration_weeks);
                return Number.isFinite(n) && n >= 1 ? Math.min(520, Math.floor(n)) : null;
              })(),
      });
      setCertReq({ title: "", notes: "", typical_duration_weeks: "" });
      setMessage("Certification submitted for HR review.");
      await reloadCerts();
      await reloadInsights();
    } catch (e) {
      setError(e.displayMessage || "Request failed");
    }
  };

  useEffect(() => {
    const next = {};
    (certMe.pending || []).forEach((p) => {
      next[p.id] = p.self_progress_pct ?? 0;
    });
    setCertPendingDraft(next);
  }, [certMe.pending]);

  const saveCertSelfProgress = async (entryId) => {
    setMessage("");
    setError("");
    try {
      const v = Math.max(0, Math.min(100, Math.round(Number(certPendingDraft[entryId]) || 0)));
      await api.patch(`/api/certifications/me/entries/${entryId}/self-progress`, { self_progress_pct: v });
      setMessage("Certification progress updated.");
      await reloadCerts();
    } catch (e) {
      setError(e.displayMessage || "Could not save progress");
    }
  };

  if (!user) return null;

  const canRequestCertification = user.role === "employee" || user.role === "manager";

  const verifiedTitles =
    user.verified_certifications?.length > 0
      ? user.verified_certifications
      : (certMe.approved_items?.length
          ? certMe.approved_items.map((x) => x.title)
          : certMe.approved_titles) || [];

  return (
    <Stack spacing={2} component="section" aria-labelledby="profile-heading">
      <Typography id="profile-heading" variant="h4" component="h1">
        My profile
      </Typography>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Typography color="text.secondary">Email: {user.email}</Typography>
      <TextField label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} fullWidth />
      <TextField
        label="Department"
        value={form.department}
        onChange={(e) => setForm({ ...form, department: e.target.value })}
        fullWidth
        helperText="Pick from suggestions or type any department (e.g. Marketing, Social Media, Finance)."
        InputProps={{ inputProps: { list: "dept-suggestions" } }}
      />
      <datalist id="dept-suggestions">
        {departments.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <TextField label="Job title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} fullWidth />
      <TextField label="Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} fullWidth multiline minRows={2} />
      <TextField label="Interests" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} fullWidth multiline minRows={2} />
      <TextField label="Career goals" value={form.career_goals} onChange={(e) => setForm({ ...form, career_goals: e.target.value })} fullWidth multiline minRows={2} />

      <Box>
        <Button variant="contained" onClick={save} sx={{ fontWeight: 800 }}>
          Save changes
        </Button>
      </Box>

      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
        Ideas from your saved profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Heuristic suggestions from your skills, interests, goals, and job context. <strong>Save changes</strong> above to refresh after you edit your profile. Only{" "}
        <strong>HR</strong> can mark a credential as verified on your record
        {canRequestCertification ? " — use the request form below to ask HR to review a certification." : "."}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
        Certifications to consider
      </Typography>
      {skillInsights.suggested_certifications.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          None yet — try richer skills or goals (e.g. cloud, security, HR, finance, marketing).
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
            {canRequestCertification ? "Click a chip to pre-fill the HR request form below." : "Chips are ideas only — HR assigns certifications from the HR console."}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {skillInsights.suggested_certifications.map((t) => (
              <Chip
                key={t}
                label={t.length > 52 ? `${t.slice(0, 52)}…` : t}
                size="small"
                variant="outlined"
                onClick={canRequestCertification ? () => setCertReq((r) => ({ ...r, title: t })) : undefined}
                sx={{ cursor: canRequestCertification ? "pointer" : "default" }}
              />
            ))}
          </Stack>
        </Box>
      )}
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
        Open role directions (see Career for detail)
      </Typography>
      {skillInsights.open_roles.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          —
        </Typography>
      ) : (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {skillInsights.open_roles.map((t) => (
            <Chip key={t} label={t} size="small" />
          ))}
        </Stack>
      )}
      <Link component={RouterLink} to="/career" variant="body2" sx={{ fontWeight: 700 }}>
        Open Career for full path suggestions →
      </Link>

      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
        Certifications (HR-approved only)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Unverified certifications are not shown here or on career insights. Only <strong>HR</strong> can mark a credential as verified. Employees and managers submit
        requests and update <strong>their own preparation progress (%)</strong> while HR reviews; HR can also assign certifications from the HR console.
      </Typography>
      {(certMe.pending || []).length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Your preparation (in-review certifications)
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {certMe.self_reported_pending_avg_pct ?? 0}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={certMe.self_reported_pending_avg_pct ?? 0}
            sx={{ height: 10, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Average of your self-reported % on each certification awaiting HR. This is not the same as HR approval.
          </Typography>
        </Box>
      ) : null}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            HR-verified pipeline
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {certMe.progress_verified_pct ?? 0}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={certMe.progress_verified_pct ?? 0}
          color="secondary"
          sx={{ height: 10, borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Approved ÷ (approved + pending HR review). Only HR can move a request to approved.
        </Typography>
      </Box>
      {verifiedTitles.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          None approved yet.
        </Typography>
      ) : (
        <Stack spacing={0.75} sx={{ mb: 1 }}>
          {(certMe.approved_items?.length ? certMe.approved_items : verifiedTitles.map((t) => ({ title: t, typical_duration_weeks: null }))).map(
            (item) => (
              <Stack key={item.title} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip label={item.title} color="primary" variant="outlined" />
                {item.typical_duration_weeks != null ? (
                  <Typography variant="caption" color="text.secondary">
                    Est. {item.typical_duration_weeks} week{item.typical_duration_weeks === 1 ? "" : "s"} to complete
                  </Typography>
                ) : null}
              </Stack>
            ),
          )}
        </Stack>
      )}

      {(certMe.pending || []).length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Awaiting HR review — your preparation
          </Typography>
          <Stack spacing={2}>
            {(certMe.pending || []).map((p) => {
              const draft = certPendingDraft[p.id] ?? p.self_progress_pct ?? 0;
              const dirty = Math.round(Number(draft) || 0) !== Math.round(Number(p.self_progress_pct ?? 0) || 0);
              return (
                <Box key={p.id}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {p.title}
                    {p.typical_duration_weeks != null ? ` · Est. ${p.typical_duration_weeks} wk` : ""}
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                    <Slider
                      size="small"
                      value={Number(draft) || 0}
                      onChange={(_, v) => setCertPendingDraft((prev) => ({ ...prev, [p.id]: v }))}
                      min={0}
                      max={100}
                      valueLabelDisplay="auto"
                      sx={{ flex: 1, maxWidth: 400 }}
                      aria-label={`Preparation progress for ${p.title}`}
                    />
                    <Button variant="outlined" size="small" disabled={!dirty} onClick={() => saveCertSelfProgress(p.id)} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                      Save %
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : null}

      {canRequestCertification ? (
        <Stack component="form" onSubmit={submitCertRequest} spacing={1.5} maxWidth={520}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Request HR verification for a certification
          </Typography>
          <TextField
            label="Certification / credential title"
            value={certReq.title}
            onChange={(e) => setCertReq({ ...certReq, title: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Estimated time to complete (weeks)"
            type="number"
            inputProps={{ min: 1, max: 520, step: 1 }}
            value={certReq.typical_duration_weeks}
            onChange={(e) => setCertReq({ ...certReq, typical_duration_weeks: e.target.value })}
            helperText="Optional. Helps HR and you plan; shown on your profile when approved."
            fullWidth
          />
          <TextField label="Notes (optional)" value={certReq.notes} onChange={(e) => setCertReq({ ...certReq, notes: e.target.value })} fullWidth multiline minRows={2} />
          <Button type="submit" variant="outlined" disabled={!certReq.title.trim()} sx={{ fontWeight: 800, alignSelf: "flex-start" }}>
            Submit for HR review
          </Button>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" maxWidth={520}>
          HR accounts record certifications from the <strong>HR console</strong> (assign flow). To submit a personal verification request, sign in as an employee or manager —
          that role uses the request form on Profile.
        </Typography>
      )}

      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
        Learning completed
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Courses that <strong>HR</strong> has marked complete on the Learning page appear here. Everyone else records study progress as a percentage there; only HR marks a
        course complete.
      </Typography>
      {learningDone.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          None recorded yet.
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {learningDone.map((c) => (
            <Chip key={c.id} label={c.title} color="success" variant="outlined" />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
