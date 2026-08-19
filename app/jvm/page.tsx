import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/jvm");

export const metadata = seriesLandingMetadata(series);

export default function JvmSeriesPage() {
  return <SeriesLanding series={series} />;
}
