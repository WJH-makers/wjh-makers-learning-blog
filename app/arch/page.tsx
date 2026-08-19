import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/arch");

export const metadata = seriesLandingMetadata(series);

export default function ArchSeriesPage() {
  return <SeriesLanding series={series} />;
}
