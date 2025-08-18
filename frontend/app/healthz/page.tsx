export default function HealthzPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <pre className="text-lg font-mono">
        ok {new Date().toISOString()}
      </pre>
    </div>
  );
}
