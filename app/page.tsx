import { loadKeyboardConfig } from "@/lib/load-config";
import { ConfiguratorView } from "@/components/ConfiguratorView";

export default async function Page() {
  const config = await loadKeyboardConfig();
  return <ConfiguratorView config={config} />;
}
