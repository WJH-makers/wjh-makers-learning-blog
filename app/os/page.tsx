import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/os");

export const metadata = seriesLandingMetadata(series);

export default function OsSeriesPage() {
  return <SeriesLanding series={series} />;
}
