type Props = {
  status: string;
};

export default function ConnectorStatus({
  status,
}: Props) {
  const connected =
    status === "online";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-4">

      <div className="flex items-center gap-3">

        <div
          className={`w-3 h-3 rounded-full ${
            connected
              ? "bg-green-400 animate-pulse"
              : "bg-yellow-400 animate-pulse"
          }`}
        />

        <div>

          <div className="text-sm text-zinc-400">
            Connector
          </div>

          <div className="font-bold">
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}