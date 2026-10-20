import Image from "next/image";
import type { QuestionOptionView } from "@/application/content-views";

type Props = {
  option: QuestionOptionView;
  inverted?: boolean;
};

export function OptionContent({ option, inverted = false }: Props) {
  if (!option.media) {
    return <span>{option.label}</span>;
  }

  return (
    <span className="block min-w-0">
      <Image
        src={option.media.file}
        alt={option.media.alt}
        width={option.media.width}
        height={option.media.height}
        unoptimized
        className={`h-auto w-full max-w-64 rounded-lg border bg-white ${
          inverted ? "border-white/30" : "border-slate-200"
        }`}
      />
      <span className={`mt-1.5 block text-xs ${inverted ? "text-white/75" : "text-slate-500"}`}>
        {option.label}
      </span>
    </span>
  );
}
