import { createFileRoute } from "@tanstack/react-router";
import { WeatherDashboard } from "@/components/weather/WeatherDashboard";

export const Route = createFileRoute("/clima")({
  component: ClimaPage,
});

function ClimaPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <WeatherDashboard theme="dark" />
    </div>
  );
}
