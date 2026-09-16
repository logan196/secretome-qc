type BrandMarkProps = {
  name: "novaflow" | "noveome";
  className?: string;
  invert?: boolean;
};

export function BrandMark({ name, className = "h-8 w-auto", invert = false }: BrandMarkProps) {
  const src = name === "novaflow" ? "/brands/novaflow.svg" : "/brands/noveome.svg";
  const alt = name === "novaflow" ? "Novaflow" : "Noveome Biotherapeutics";
  return (
    // Brand SVGs already include wordmarks; next/image does not optimize SVGs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${className} ${invert ? "brightness-0 invert" : ""}`}
    />
  );
}
