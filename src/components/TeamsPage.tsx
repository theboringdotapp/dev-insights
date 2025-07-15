import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TeamMemberData,
  useTeamPerformance,
} from "../hooks/useTeamPerformance";
import { useAuth } from "../lib/auth";
import { FilterToggle } from "./FilterToggle";
import { TeamMemberChart } from "./TeamMemberChart";
import { Timeframe } from "./TimeframeSelector";
import UnauthenticatedView from "./UnauthenticatedView";

const MEMBER_COLORS = [
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple (repeat)
  "#EC4899", // Pink
  "#6366F1", // Indigo
];

interface TeamMemberRowProps {
  member: TeamMemberData;
  showOnlyImportantPRs: boolean;
  color: string;
  onRemove: () => void;
  onNavigateToIndividual: () => void;
  timeframe: Timeframe;
  maxChartYValue: number;
  index: number;
}

function TeamMemberRow({
  member,
  showOnlyImportantPRs,
  timeframe,
  maxChartYValue,
  color,
  onRemove,
  onNavigateToIndividual,
  index,
}: TeamMemberRowProps) {
  if (member.isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="group relative"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex-1">
                <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center space-x-8 mr-8">
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-80 h-16 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (member.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="group relative"
      >
        <div className="bg-red-50/80 backdrop-blur-xl rounded-2xl border border-red-200/50 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {member.username}
                </h3>
                <p className="text-red-600 text-sm">{member.error}</p>
              </div>
            </div>
            <button
              onClick={onRemove}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative"
    >
      <div
        className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 p-6 hover:border-purple-200/60 cursor-pointer"
        onClick={onNavigateToIndividual}
      >
        <div className="flex items-center justify-between">
          {/* User Info */}
          <div className="flex items-center space-x-4 min-w-0 flex-shrink-0">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                  style={{ backgroundColor: color }}
                ></span>
                {member.username}
              </h3>
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <span className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 mr-1.5"></div>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center space-x-8 mx-8 flex-shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {showOnlyImportantPRs
                  ? member.importantPullRequestCount
                  : member.pullRequestCount}
              </div>
              <div className="text-xs text-gray-500 font-medium">PRs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {member.reviewCount}
              </div>
              <div className="text-xs text-gray-500 font-medium">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">
                {member.avgDaysToClose > 0
                  ? `${member.avgDaysToClose}d`
                  : "N/A"}
              </div>
              <div className="text-xs text-gray-500 font-medium">Avg Close</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {member.changesRequestedCount}
              </div>
              <div className="text-xs text-gray-500 font-medium">Changes</div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 max-w-sm">
            <div className="h-40">
              <TeamMemberChart
                pullRequests={member.pullRequests}
                reviews={member.reviews}
                color={color}
                showOnlyImportantPRs={showOnlyImportantPRs}
                timeframe={timeframe}
                maxYValue={maxChartYValue}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click when removing
                onRemove();
              }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50/80 opacity-0 group-hover:opacity-100"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TeamsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [newMemberInput, setNewMemberInput] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("1month");
  const [showOnlyImportantPRs, setShowOnlyImportantPRs] = useState(true);
  const [shouldFetchData, setShouldFetchData] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Only fetch data when shouldFetchData is true
  const teamData = useTeamPerformance(
    shouldFetchData ? teamMembers : [],
    timeframe
  );

  // Load team members from localStorage on mount
  useEffect(() => {
    const savedMembers = localStorage.getItem("github-review-team-members");

    if (savedMembers) {
      try {
        const members = JSON.parse(savedMembers);

        if (Array.isArray(members) && members.length > 0) {
          setTeamMembers(members);
          // Auto-fetch data if we have cached members
          setShouldFetchData(true);
        }
      } catch (error) {
        console.error("Failed to load team members from localStorage:", error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save team members to localStorage when they change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(
        "github-review-team-members",
        JSON.stringify(teamMembers)
      );
    }
  }, [teamMembers, isInitialized]);

  // Refetch data when timeframe changes (if we have members)
  useEffect(() => {
    if (teamMembers.length > 0) {
      setShouldFetchData(true);
    }
  }, [timeframe, teamMembers.length]);

  const addTeamMember = () => {
    const username = newMemberInput.trim();
    if (username && !teamMembers.includes(username)) {
      setTeamMembers((prev) => [...prev, username]);
      setNewMemberInput("");
      // Enable data fetching when adding first member or if data fetching is already enabled
      if (teamMembers.length === 0 || shouldFetchData) {
        setShouldFetchData(true);
      }
    }
  };

  const removeTeamMember = (username: string) => {
    setTeamMembers((prev) => {
      const newMembers = prev.filter((member) => member !== username);
      // Disable data fetching if no members left
      if (newMembers.length === 0) {
        setShouldFetchData(false);
      }
      return newMembers;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTeamMember();
    }
  };

  const handleFilterChange = (showOnlyImportant: boolean) => {
    setShowOnlyImportantPRs(showOnlyImportant);
  };

  const getTeamDisplayStats = () => {
    if (showOnlyImportantPRs) {
      return {
        avgPullRequests: teamData.teamStats.avgImportantPullRequests,
        totalPullRequests: teamData.teamStats.totalImportantPullRequests,
      };
    }
    return {
      avgPullRequests: teamData.teamStats.avgPullRequests,
      totalPullRequests: teamData.teamStats.totalPullRequests,
    };
  };

  // Calculate max Y value for consistent chart scaling across all members
  const maxChartYValue = useMemo(() => {
    const membersList = Object.values(teamData.members).filter(
      (member) => !member.isLoading && !member.error
    );

    if (membersList.length === 0) return 5; // Default minimum scale

    let maxPRs = 0;
    let maxReviews = 0;

    membersList.forEach((member) => {
      // Count PRs per week for this member
      const timeframeDays = {
        "1week": 7,
        "1month": 30,
        "3months": 90,
        "6months": 180,
        "1year": 365,
      }[timeframe];

      const numberOfWeeks = Math.ceil(timeframeDays / 7);
      const prCountForPeriod = showOnlyImportantPRs
        ? member.importantPullRequestCount
        : member.pullRequestCount;

      // Calculate actual max PRs per week for this member
      const maxPRsPerWeek = Math.ceil(prCountForPeriod / numberOfWeeks);
      const maxReviewsPerWeek = Math.ceil(member.reviewCount / numberOfWeeks);

      maxPRs = Math.max(maxPRs, maxPRsPerWeek);
      maxReviews = Math.max(maxReviews, maxReviewsPerWeek);
    });

    // Use the higher of the two values with minimal padding, minimum of 3
    const actualMax = Math.max(maxPRs, maxReviews);
    return Math.max(actualMax + 1, 3); // Add just 1 for breathing room
  }, [teamData.members, timeframe, showOnlyImportantPRs]);

  if (!isAuthenticated) {
    return <UnauthenticatedView />;
  }

  const timeframeLabel = {
    "1week": "Past Week",
    "1month": "Past Month",
    "3months": "Past 3 Months",
    "6months": "Past 6 Months",
    "1year": "Past Year",
  }[timeframe];

  const displayStats = getTeamDisplayStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 bg-clip-text text-transparent">
              Team Performance
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Analyze and compare your team's GitHub productivity
            </p>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-8">
            {/* Add Member Section */}
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={newMemberInput}
                  onChange={(e) => setNewMemberInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add GitHub username..."
                  className="w-full bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all placeholder-gray-400"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addTeamMember}
                disabled={!newMemberInput.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none transition-all"
              >
                Add Member
              </motion.button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">
                Timeframe:
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all"
              >
                <option value="1week">Past Week</option>
                <option value="1month">Past Month</option>
                <option value="3months">Past 3 Months</option>
                <option value="6months">Past 6 Months</option>
                <option value="1year">Past Year</option>
              </select>
            </div>
          </div>

          {/* Filter Toggle */}
          {teamData.teamStats.memberCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <FilterToggle
                showOnlyImportantPRs={showOnlyImportantPRs}
                onChange={handleFilterChange}
                importantCount={teamData.teamStats.totalImportantPullRequests}
                totalCount={teamData.teamStats.totalPullRequests}
              />
            </motion.div>
          )}

          {/* Team Stats Overview */}
          {teamData.teamStats.memberCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-sm p-8 mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Team Overview · {timeframeLabel}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {teamData.teamStats.memberCount}
                  </div>
                  <div className="text-sm text-gray-500 font-medium mt-1">
                    Team Members
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {displayStats.totalPullRequests}
                  </div>
                  <div className="text-sm text-gray-500 font-medium mt-1">
                    PRs
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {teamData.teamStats.totalReviews}
                  </div>
                  <div className="text-sm text-gray-500 font-medium mt-1">
                    Reviews
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {displayStats.avgPullRequests}
                  </div>
                  <div className="text-sm text-gray-500 font-medium mt-1">
                    Avg PRs/Member
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Team Members List */}
        <div className="space-y-4">
          {teamMembers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50"
            >
              <div className="inline-flex items-center justify-center mb-6 p-4 rounded-full bg-gradient-to-r from-purple-100 to-blue-100">
                <svg
                  className="w-12 h-12 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Build Your Team
              </h3>
              <p className="text-gray-600 max-w-md mx-auto text-lg">
                Add GitHub usernames to start analyzing and comparing team
                performance
              </p>
            </motion.div>
          ) : (
            teamMembers.map((username, index) => {
              const member = teamData.members[username] || {
                username,
                pullRequestCount: 0,
                reviewCount: 0,
                importantPullRequestCount: 0,
                totalPullRequestCount: 0,
                avgDaysToClose: 0,
                changesRequestedCount: 0,
                isLoading: true,
                pullRequests: [],
                reviews: [],
              };

              const color = MEMBER_COLORS[index % MEMBER_COLORS.length];

              return (
                <TeamMemberRow
                  key={username}
                  member={member}
                  showOnlyImportantPRs={showOnlyImportantPRs}
                  timeframe={timeframe}
                  maxChartYValue={maxChartYValue}
                  color={color}
                  onRemove={() => removeTeamMember(username)}
                  onNavigateToIndividual={() =>
                    navigate(`/?username=${username}`)
                  }
                  index={index}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
