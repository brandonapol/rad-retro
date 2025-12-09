import type { Card } from "../types/index.js";

export function exportToCSV(sessionId: string, cards: Card[]) {
  const headers = ["Category", "Content", "Author", "Created At", "Completed"];

  const rows = cards.map(card => [
    card.category,
    `"${card.content.replace(/"/g, '""')}"`,
    card.author,
    new Date(card.created_at).toLocaleString(),
    card.completed !== null ? (card.completed ? "Yes" : "No") : "N/A"
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `retro-${sessionId}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
