import { ListingDetailClient } from "./_components/ListingDetailClient";

// Pre-render a generous range of listing IDs so the static export covers
// every plausible listing without needing live blockchain reads at build time.
// New listings beyond this range are still navigable in-app, but to be
// reachable via a hard URL hit they'd need to be added here on the next deploy.
export function generateStaticParams() {
  return Array.from({ length: 200 }, (_, i) => ({ id: String(i + 1) }));
}

type Params = { id: string };

const Page = ({ params }: { params: Promise<Params> }) => {
  return <ListingDetailClient paramsPromise={params} />;
};

export default Page;
