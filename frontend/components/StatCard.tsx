import GlassCard from "@/components/GlassCard";

export default function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <GlassCard className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-heading">{value}</p>
    </GlassCard>
  );
}
