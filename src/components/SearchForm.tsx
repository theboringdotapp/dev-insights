import { useState } from "react";

interface SearchFormProps {
  username: string;
  onSearch: (username: string) => void;
  isLoading: boolean;
}

export function SearchForm({
  username: initialUsername,
  onSearch,
  isLoading,
}: SearchFormProps) {
  const [username, setUsername] = useState(initialUsername);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(username);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className="col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          GitHub Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g., octocat"
          required
          className="px-3 py-2 border border-gray-300 rounded-md w-full"
        />
      </div>

      <div className="col-span-1 flex items-end">
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Analyze"}
        </button>
      </div>
    </form>
  );
}
