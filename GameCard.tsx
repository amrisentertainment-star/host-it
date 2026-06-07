type Props = {
  title: string;
  description: string;
  locked?: boolean;
  href?: string;
};

export default function GameCard({
  title,
  description,
  locked,
  href,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:scale-[1.02] transition-all">

      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5" />

      <div className="relative z-10">

        <div className="flex items-center justify-between">

          <h3 className="text-2xl font-black">
            {title}
          </h3>

          {locked && (
            <div className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/20">
              PREMIUM
            </div>
          )}
        </div>

        <p className="text-zinc-400 mt-3">
          {description}
        </p>

        {href ? (
          <a
            href={href}
            className="mt-6 inline-block w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-center hover:scale-[1.02] transition-all"
          >
            {locked ? "Unlock" : "Launch"}
          </a>
        ) : (
          <button className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black hover:scale-[1.02] transition-all">
            {locked ? "Unlock" : "Launch"}
          </button>
        )}
      </div>
    </div>
  );
}