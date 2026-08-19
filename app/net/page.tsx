import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/net");

export const metadata = seriesLandingMetadata(series);

export default function NetSeriesPage() {
  return <SeriesLanding series={series} />;
}
