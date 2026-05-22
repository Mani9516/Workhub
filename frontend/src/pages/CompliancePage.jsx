import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import api from "../api/client.js";

export default function CompliancePage() {
  const [policies, setPolicies] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const { data } = await api.get("/api/compliance/policies");
    setPolicies(data);
  };

  useEffect(() => {
    load().catch((e) => setError(e.displayMessage || "Could not load policies"));
  }, []);

  const ack = async (id) => {
    setMsg("");
    setError("");
    try {
      await api.post(`/api/compliance/policies/${id}/ack`);
      setMsg("Acknowledgement recorded.");
    } catch (e) {
      setError(e.displayMessage || "Could not acknowledge");
    }
  };

  return (
    <Stack spacing={2} component="section" aria-labelledby="compliance-heading">
      <Typography id="compliance-heading" variant="h4" component="h1">
        Compliance & policies
      </Typography>
      <Typography color="text.secondary">Structured areas: HR, Responsible AI, IT Security, and Financial Conduct.</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack spacing={2}>
        {policies.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">{p.title}</Typography>
                <Chip label={p.category} size="small" />
              </Stack>
              <Typography variant="body2" paragraph>
                {p.body}
              </Typography>
              {p.requires_ack && (
                <Button variant="outlined" onClick={() => ack(p.id)} aria-label={`Acknowledge ${p.title}`}>
                  Acknowledge
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
