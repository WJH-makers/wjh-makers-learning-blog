import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/sec");

export const metadata = seriesLandingMetadata(series);

export default function SecSeriesPage() {
  return <SeriesLanding series={series} />;
}
