const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export async function fetchTransactions(filter = {}) {
  const params = new URLSearchParams();
  if (filter.flagged !== undefined) params.append("flagged", filter.flagged);
  if (filter.status) params.append("status", filter.status);
  if (filter.limit) params.append("limit", filter.limit);

  const res = await fetch(`${API_URL}/api/transactions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function fetchFlaggedTransactions() {
  const res = await fetch(`${API_URL}/api/transactions/flagged`);
  if (!res.ok) throw new Error("Failed to fetch flagged transactions");
  return res.json();
}

export async function fetchRules() {
  const res = await fetch(`${API_URL}/api/rules`);
  if (!res.ok) throw new Error("Failed to fetch rules");
  return res.json();
}

export async function reviewTransaction(transactionId, action, reviewer = "Fraud Analyst", notes = "") {
  const res = await fetch(`${API_URL}/api/transactions/${transactionId}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reviewer, notes }),
  });
  if (!res.ok) throw new Error(`Failed to update review status: ${res.statusText}`);
  return res.json();
}

export async function submitTransaction(payload) {
  const res = await fetch(`${API_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to submit transaction: ${res.statusText}`);
  return res.json();
}

export async function fetchAuditLogs(transactionId = null) {
  const url = transactionId
    ? `${API_URL}/api/audit-logs?transaction_id=${transactionId}`
    : `${API_URL}/api/audit-logs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export async function triggerScenario(scenarioType, customerId = "CUST-DEMO") {
  const res = await fetch(`${API_URL}/api/scenarios/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_type: scenarioType, customer_id: customerId }),
  });
  if (!res.ok) throw new Error(`Failed to trigger scenario: ${res.statusText}`);
  return res.json();
}

export async function streamKaggle(count = 5) {
  const res = await fetch(`${API_URL}/api/scenarios/stream-kaggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) throw new Error(`Failed to stream Kaggle transactions: ${res.statusText}`);
  return res.json();
}

export async function updateRuleConfig(ruleCode, payload) {
  const res = await fetch(`${API_URL}/api/rules/${ruleCode}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update rule configuration: ${res.statusText}`);
  return res.json();
}

export async function fetchRuleAnalytics() {
  const res = await fetch(`${API_URL}/api/rules/analytics`);
  if (!res.ok) throw new Error("Failed to fetch rule analytics");
  return res.json();
}

export async function fetchAlertStatus() {
  const res = await fetch(`${API_URL}/api/alerts/status`);
  if (!res.ok) throw new Error("Failed to fetch alert service status");
  return res.json();
}

export async function testAlertDispatch(payload = {}) {
  const res = await fetch(`${API_URL}/api/alerts/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to test alert dispatch: ${res.statusText}`);
  return res.json();
}

export async function fetchTransactionDossier(transactionId) {
  const res = await fetch(`${API_URL}/api/transactions/${transactionId}/dossier`);
  if (!res.ok) throw new Error(`Failed to fetch incident dossier: ${res.statusText}`);
  return res.json();
}

export { API_URL, WS_URL };
