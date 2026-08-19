import SeriesLanding, { seriesLandingMetadata } from "@/app/_components/SeriesLanding";
import { seriesByRoute } from "@/lib/series-registry";

const series = seriesByRoute("/mq");

export const metadata = seriesLandingMetadata(series);

export default function MqSeriesPage() {
  return <SeriesLanding series={series} />;
}
