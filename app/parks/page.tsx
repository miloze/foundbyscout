import ParksMapDynamic from "@/components/ParksMapDynamic";

export const metadata = {
  title: "Find a Park — Found By Scout",
  description: "Every skatepark in the UK, mapped and searchable.",
};

export default function ParksPage() {
  return <ParksMapDynamic />;
}
