type BrandMarkProps = {
  name: "novaflow" | "noveome";
  className?: string;
  tone?: "color" | "light";
};

export function BrandMark({ name, className = "h-8 w-auto", tone = "color" }: BrandMarkProps) {
  const src =
    name === "novaflow"
      ? tone === "light"
        ? "/brands/novaflow-light.svg"
        : "/brands/novaflow.svg"
      : tone === "light"
        ? "/brands/noveome-light.svg"
        : "/brands/noveome.svg";
  const alt = name === "novaflow" ? "Novaflow" : "Noveome Biotherapeutics";
  return (
    // Brand SVGs already include wordmarks; next/image does not optimize SVGs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
