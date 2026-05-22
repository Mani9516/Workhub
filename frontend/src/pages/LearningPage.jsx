import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LearningPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  /** Whose catalog / completions we are viewing (defaults to you). */
  const [viewUserId, setViewUserId] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [draftPct, setDraftPct] = useState({});
  const [recs, setRecs] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const canPickOthers = user?.role === "hr" || user?.role === "manager";

  useEffect(() => {
    if (!canPickOthers) return;
    api
      .get("/api/users/")
      .then((r) => setTeam(r.data))
      .catch(() => setTeam([]));
  }, [canPickOthers]);

  const audienceOptions = useMemo(() => {
    if (!user) return [];
    const me = { id: user.id, full_name: user.full_name, email: user.email };
    if (!canPickOthers) return [me];
    const rest = team.filter((t) => t.id !== user.id);
    return [me, ...rest];
  }, [user, team, canPickOthers]);

  const effectiveViewId = viewUserId ?? user?.id ?? null;

  const viewLabel = useMemo(() => {
    if (!user || !effectiveViewId) return "";
    if (effectiveViewId === user.id) return user.full_name;
    return team.find((t) => t.id === effectiveViewId)?.full_name || `User #${effectiveViewId}`;
  }, [user, team, effectiveViewId]);

  const load = async () => {
    if (!user?.id) return;
    const vid = viewUserId ?? user.id;
    const params = vid !== user.id ? { user_id: vid } : {};
    const [c, r] = await Promise.all([
      api.get("/api/learning/catalog-with-progress", { params }),
      api.get("/api/ai/recommendations/learning", { params }),
    ]);
    setCatalog(c.data);
    const nextDraft = {};
    (c.data || []).forEach((row) => {
      nextDraft[row.id] = row.progress_pct ?? 0;
    });
    setDraftPct(nextDraft);
    setRecs(r.data);
  };

  useEffect(() => {
    if (!user?.id) return undefined;
    setMsg("");
    setError("");
    load().catch((e) => setError(e.displayMessage || "Could not load learning"));
    return undefined;
  }, [user?.id, viewUserId]);

  const isHr = user?.role === "hr";
  const viewingSelf = user && effectiveViewId === user.id;
  const canEditOwnProgress = viewingSelf;
  const canHrMarkComplete = isHr && effectiveViewId != null;

  const saveCourseProgress = async (id) => {
    if (!user?.id || !canEditOwnProgress) return;
    setMsg("");
    setError("");
    try {
      const pct = Math.max(0, Math.min(100, Number(draftPct[id]) || 0));
      await api.patch(`/api/learning/progress/${id}`, { progress_pct: pct });
      setMsg("Progress saved.");
      await load();
    } catch (e) {
      setError(e.displayMessage || "Could not update");
    }
  };

  const markComplete = async (id) => {
    if (!user?.id || !effectiveViewId || !canHrMarkComplete) return;
    setMsg("");
    setError("");
    try {
      await api.post(`/api/learning/users/${effectiveViewId}/progress/${id}/complete`);
      setMsg(
        effectiveViewId === user.id
          ? "Marked complete. It appears on your Profile under learning."
          : `Marked complete for ${viewLabel}. They will see it on their Profile.`,
      );
      await load();
    } catch (e) {
      setError(e.displayMessage || "Could not update");
    }
  };

  if (!user) return null;

  return (
    <Stack spacing={2} component="section" aria-labelledby="learning-heading">
      <Typography id="learning-heading" variant="h4" component="h1">
        Learning
      </Typography>

      {canPickOthers && audienceOptions.length > 1 && (
        <FormControl fullWidth size="small">
          <InputLabel id="learning-subject-label">Record / view progress for</InputLabel>
          <Select
            labelId="learning-subject-label"
            label="Record / view progress for"
            value={effectiveViewId}
            onChange={(e) => setViewUserId(Number(e.target.value))}
          >
            {audienceOptions.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.full_name}
                {p.id === user.id ? " (you)" : ""} · {p.email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Typography variant="body2" color="text.secondary">
        Set your own course progress (0–100%) below. <strong>Only HR</strong> can mark a catalog course as complete; managers can view their team&apos;s progress here but
        cannot complete courses for them.
      </Typography>

      {msg && <Alert severity="success">{msg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI recommendations
            {effectiveViewId !== user.id ? (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, fontWeight: 600 }}>
                (for {viewLabel})
              </Typography>
            ) : null}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {recs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No open recommendations — completed courses are hidden here, or the catalog is empty.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {recs.map((r) => (
                <Typography key={r.learning_item_id} variant="body2">
                  <strong>{r.title}</strong> — {r.explanation}
                </Typography>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {catalog.map((c) => {
          const serverPct = c.progress_pct ?? 0;
          const draft = draftPct[c.id] ?? serverPct;
          const dirty = canEditOwnProgress && Math.round(Number(draft) || 0) !== Math.round(Number(serverPct) || 0);
          return (
            <Card key={c.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ sm: "flex-start" }}>
                  <BoxText c={c} />
                  <Stack spacing={1.2} sx={{ minWidth: { sm: 220 }, width: "100%", maxWidth: 360 }} flexShrink={0}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Progress
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.completed ? 100 : Math.round(Number(draft) || 0)}%
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={c.completed ? 100 : Math.round(Number(draft) || 0)} sx={{ height: 8, borderRadius: 1 }} />
                    {canEditOwnProgress && !c.completed ? (
                      <>
                        <Slider
                          size="small"
                          value={Number(draft) || 0}
                          onChange={(_, v) => setDraftPct((prev) => ({ ...prev, [c.id]: v }))}
                          min={0}
                          max={100}
                          valueLabelDisplay="auto"
                          aria-label={`Progress for ${c.title}`}
                        />
                        <Button variant="outlined" size="small" disabled={!dirty} onClick={() => saveCourseProgress(c.id)} sx={{ alignSelf: "flex-start" }}>
                          Save progress
                        </Button>
                      </>
                    ) : !canEditOwnProgress && !c.completed ? (
                      <Typography variant="caption" color="text.secondary">
                        {`Self-reported progress for ${viewLabel} (read-only for you).`}
                      </Typography>
                    ) : c.completed ? (
                      <Typography variant="caption" color="text.secondary">
                        HR marked this course complete.
                      </Typography>
                    ) : null}
                    {canHrMarkComplete ? (
                      <Button
                        variant="contained"
                        disabled={c.completed}
                        onClick={() => markComplete(c.id)}
                        aria-label={c.completed ? `${c.title} already complete` : `Mark ${c.title} complete for ${viewLabel}`}
                        sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                      >
                        {c.completed ? "Complete" : "HR: mark complete"}
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}

function BoxText({ c }) {
  return (
    <div>
      <Typography variant="h6">{c.title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {c.description}
      </Typography>
      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
        {c.duration_hours}h · Skills: {c.skill_tags}
      </Typography>
    </div>
  );
}
