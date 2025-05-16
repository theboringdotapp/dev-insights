import { FocusArea } from "../../lib/types";
import FocusAreaItem from "./FocusAreaItem";

interface FocusAreasProps {
  areas: FocusArea[];
}

function FocusAreas({ areas }: FocusAreasProps) {
  if (!areas || areas.length === 0) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
        No focus areas identified yet. Add more PR analysis data.
      </div>
    );
  }

  return (
    <ul className="space-y-0">
      {areas.map((area, index) => (
        <FocusAreaItem key={index} area={area} />
      ))}
    </ul>
  );
}

export default FocusAreas;
