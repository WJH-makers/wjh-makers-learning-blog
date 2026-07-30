import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/obs");

export const revalidate = 3600;
export const runtime = "nodejs";
export const metadata = seriesLandingMetadata(series);

export default function ObsSeriesPage() {
  return <SeriesLanding series={series} />;
}
