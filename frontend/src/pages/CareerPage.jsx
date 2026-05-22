import { useEffect, useState } from "react";
import { Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import api from "../api/client.js";

export default function CareerPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/career/summary").then((r) => setData(r.data));
  }, []);

  const verifiedTitles = Array.isArray(data?.verified_certification_titles)
    ? data.verified_certification_titles.filter(Boolean)
    : [];

  return (
    <Stack spacing={2} component="section" aria-labelledby="career-heading">
      <Typography id="career-heading" variant="h4" component="h1">
        Career
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
            {data?.tip}
          </Typography>
          {verifiedTitles.length ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }} alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">
                HR-approved certifications
              </Typography>
              {verifiedTitles.map((c) => (
                <Chip key={c} size="small" label={c} variant="outlined" />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No HR-approved certifications yet. Request verification from Profile; HR can also record certifications for you.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <AutoAwesomeOutlinedIcon color="primary" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
              AI-style path suggestions
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ranked from HR-approved certifications (strongest signal), then skills, goals, and role. Heuristic scoring only — not a formal talent decision.
          </Typography>
          <Stack spacing={0} divider={<Divider flexItem />}>
            {(data?.recommendations || []).map((row) => (
              <Stack key={row.title} spacing={0.75} sx={{ py: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2} flexWrap="wrap">
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {row.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    score {row.score}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {row.summary}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Why: {row.explanation}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
