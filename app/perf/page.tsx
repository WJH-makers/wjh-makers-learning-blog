import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/perf");

export const metadata = seriesLandingMetadata(series);

export default function PerfSeriesPage() {
  return <SeriesLanding series={series} />;
}
