import { useEffect, useState } from "react";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import api from "../api/client.js";

export default function WellnessPage() {
  const [tips, setTips] = useState({});

  useEffect(() => {
    api.get("/api/wellness/tips").then((r) => setTips(r.data));
  }, []);

  return (
    <Stack spacing={2} component="section" aria-labelledby="wellness-heading">
      <Typography id="wellness-heading" variant="h4" component="h1">
        Wellness
      </Typography>
      <Stack spacing={2}>
        {Object.entries(tips).map(([k, v]) => (
          <Card key={k} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ textTransform: "capitalize" }}>
                {k.replace(/([A-Z])/g, " $1")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {v}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
