import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/db");

export const metadata = seriesLandingMetadata(series);

export default function DbSeriesPage() {
  return <SeriesLanding series={series} />;
}
