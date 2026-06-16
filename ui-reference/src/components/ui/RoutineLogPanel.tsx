type RoutineLogPanelProps = {
  logs: string[];
};

export function RoutineLogPanel({ logs }: RoutineLogPanelProps) {
  if (logs.length === 0) return null;

  return (
    <aside className="routine-log">
      {logs.map((log, index) => (
        <p key={`${log}-${index}`}>{log}</p>
      ))}
    </aside>
  );
}
