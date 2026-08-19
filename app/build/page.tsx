import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/build");

export const metadata = seriesLandingMetadata(series);

export default function BuildSeriesPage() {
  return <SeriesLanding series={series} />;
}
