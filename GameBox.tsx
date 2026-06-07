type GameBoxProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

export default function GameBox({
  label,
  selected,
  onClick,
}: GameBoxProps) {
  return (
    <button
      onClick={onClick}
      className={`
        h-48 rounded-2xl text-2xl font-bold shadow-2xl transition-all duration-300
        flex items-center justify-center
        ${
          selected
            ? "bg-yellow-400 text-black scale-105"
            : "bg-yellow-700 text-black"
        }
      `}
    >
      {label}
    </button>
  );
}