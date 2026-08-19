import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/algo");

export const metadata = seriesLandingMetadata(series);

export default function AlgoSeriesPage() {
  return <SeriesLanding series={series} />;
}
