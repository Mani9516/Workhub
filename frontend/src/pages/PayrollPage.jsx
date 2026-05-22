import { useEffect, useState } from "react";
import { Link as MuiLink, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import api from "../api/client.js";

export default function PayrollPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/api/payroll/payslips").then((r) => setRows(r.data));
  }, []);

  return (
    <Stack spacing={2} component="section" aria-labelledby="payroll-heading">
      <Typography id="payroll-heading" variant="h4" component="h1">
        Payroll
      </Typography>
      <Typography color="text.secondary">Payslips are read-only in this demo environment.</Typography>
      <Table size="small" aria-label="Payslips">
        <TableHead>
          <TableRow>
            <TableCell>Month</TableCell>
            <TableCell>Gross</TableCell>
            <TableCell>Net</TableCell>
            <TableCell>Document</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.month}</TableCell>
              <TableCell>{p.gross.toLocaleString()}</TableCell>
              <TableCell>{p.net.toLocaleString()}</TableCell>
              <TableCell>
                <MuiLink href={p.pdf_url} aria-label={`Payslip ${p.month}`}>
                  View
                </MuiLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
