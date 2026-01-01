import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Shield, Check, X } from 'lucide-react';
import { Team } from '@/shared/services/teamsService';

interface MatchupSelectorProps {
  teams: Team[];
  homeTeamId: string | null;
  awayTeamId: string | null;
  onHomeSelect: (teamId: string) => void;
  onAwaySelect: (teamId: string) => void;
}

const DIVISIONS = {
  'Atlantic': ['boston-bruins', 'buffalo-sabres', 'detroit-red-wings', 'florida-panthers', 'montreal-canadiens', 'ottawa-senators', 'tampa-bay-lightning', 'toronto-maple-leafs'],
  'Metropolitan': ['carolina-hurricanes', 'columbus-blue-jackets', 'new-jersey-devils', 'new-york-islanders', 'new-york-rangers', 'philadelphia-flyers', 'pittsburgh-penguins', 'washington-capitals'],
  'Central': ['chicago-blackhawks', 'colorado-avalanche', 'dallas-stars', 'minnesota-wild', 'nashville-predators', 'st-louis-blues', 'utah-hockey-club', 'winnipeg-jets'],
  'Pacific': ['anaheim-ducks', 'calgary-flames', 'edmonton-oilers', 'los-angeles-kings', 'san-jose-sharks', 'seattle-kraken', 'vancouver-canucks', 'vegas-golden-knights'],
};

export const MatchupSelector = ({
  teams,
  homeTeamId,
  awayTeamId,
  onHomeSelect,
  onAwaySelect,
}: MatchupSelectorProps) => {
  const [activeDropdown, setActiveDropdown] = useState<'home' | 'away' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const homeTeam = teams.find(t => t.teamId === homeTeamId);
  const awayTeam = teams.find(t => t.teamId === awayTeamId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeDropdown && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [activeDropdown]);

  const getFilteredTeams = (excludeTeamId: string | null) => {
    const filtered = teams.filter(team => {
      if (team.teamId === excludeTeamId) return false;
      const query = searchQuery.toLowerCase();
      return (
        team.name.toLowerCase().includes(query) ||
        team.city.toLowerCase().includes(query) ||
        team.abbreviation.toLowerCase().includes(query)
      );
    });

    const grouped: Record<string, Team[]> = {};
    Object.entries(DIVISIONS).forEach(([division, teamIds]) => {
      const divisionTeams = filtered.filter(t => teamIds.includes(t.teamId));
      if (divisionTeams.length > 0) grouped[division] = divisionTeams;
    });

    const unmapped = filtered.filter(t => !Object.values(DIVISIONS).flat().includes(t.teamId));
    if (unmapped.length > 0) grouped['Other'] = unmapped;

    return grouped;
  };

  const handleSelect = (teamId: string, type: 'home' | 'away') => {
    if (type === 'home') {
      onHomeSelect(teamId);
    } else {
      onAwaySelect(teamId);
    }
    setActiveDropdown(null);
    setSearchQuery('');
  };

  const Dropdown = ({ type }: { type: 'home' | 'away' }) => {
    const excludeId = type === 'home' ? awayTeamId : homeTeamId;
    const groupedTeams = getFilteredTeams(excludeId);
    const selectedId = type === 'home' ? homeTeamId : awayTeamId;

    return (
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-full pl-10 pr-8 py-2.5 bg-[#151515] border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {Object.keys(groupedTeams).length === 0 ? (
            <div className="p-4 text-center text-gray-500">No teams found</div>
          ) : (
            Object.entries(groupedTeams).map(([division, divisionTeams]) => (
              <div key={division}>
                <div className="px-3 py-2 bg-[#121212] text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                  {division}
                </div>
                {divisionTeams.map(team => (
                  <button
                    key={team.teamId}
                    onClick={() => handleSelect(team.teamId, type)}
                    className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      team.teamId === selectedId ? 'bg-orange-500/10' : 'hover:bg-[#222]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white p-1 flex-shrink-0">
                      {team.logo?.primary ? (
                        <img src={team.logo.primary} alt={team.name} className="w-full h-full object-contain" />
                      ) : (
                        <Shield className="w-full h-full text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">{team.city} <span className="text-gray-400">{team.name}</span></div>
                    </div>
                    {team.teamId === selectedId && <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Matchup Display */}
      <div className="grid grid-cols-[1fr_80px_1fr] items-stretch bg-[#0c0c0c] rounded-2xl border border-gray-800">

        {/* HOME TEAM */}
        <button
          onClick={() => setActiveDropdown(activeDropdown === 'home' ? null : 'home')}
          className={`relative p-5 pb-12 transition-all group text-center rounded-l-2xl ${
            activeDropdown === 'home' ? 'bg-[#1a1a1a]' : 'hover:bg-[#141414]'
          }`}
        >
          {homeTeam ? (
            <>
              {/* HOME Badge - Filled when team selected */}
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white rounded-full mb-3">
                Home
              </span>
              <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-white p-2 shadow-lg">
                {homeTeam.logo?.primary ? (
                  <img src={homeTeam.logo.primary} alt={homeTeam.name} className="w-full h-full object-contain" />
                ) : (
                  <Shield className="w-full h-full text-gray-400" />
                )}
              </div>
              <div className="text-lg font-bold text-white">{homeTeam.city}</div>
              <div className="text-sm text-gray-400">{homeTeam.name}</div>
            </>
          ) : (
            <>
              {/* HOME Badge - Subtle when empty */}
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                Home
              </span>
              <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-gray-800/30 border-2 border-dashed border-gray-600 flex items-center justify-center group-hover:border-orange-500/50 group-hover:bg-orange-500/5 transition-colors">
                <Shield className="w-8 h-8 text-gray-600 group-hover:text-orange-500/50 transition-colors" />
              </div>
              <div className="text-gray-400 font-medium">Select Team</div>
              <div className="text-xs text-gray-600 mt-1">Click to choose</div>
            </>
          )}

          {/* Dropdown indicator */}
          <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
            activeDropdown === 'home'
              ? 'bg-orange-500/20 text-orange-400'
              : homeTeam
                ? 'bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-gray-300'
                : 'bg-orange-500/10 text-orange-400/70 group-hover:bg-orange-500/20 group-hover:text-orange-400'
          }`}>
            <span className="text-[10px] font-medium uppercase tracking-wide">{homeTeam ? 'Change' : 'Select'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'home' ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* VS DIVIDER */}
        <div className="relative flex items-center justify-center bg-gradient-to-b from-[#0c0c0c] via-[#111] to-[#0c0c0c]">
          {/* Decorative dots */}
          <div className="absolute top-4 flex flex-col gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-700" />
            <div className="w-1 h-1 rounded-full bg-gray-700" />
            <div className="w-1 h-1 rounded-full bg-gray-700" />
          </div>
          {/* VS Badge */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 ring-4 ring-[#0c0c0c]">
            <span className="text-white font-black text-sm">VS</span>
          </div>
          {/* Decorative dots */}
          <div className="absolute bottom-4 flex flex-col gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-700" />
            <div className="w-1 h-1 rounded-full bg-gray-700" />
            <div className="w-1 h-1 rounded-full bg-gray-700" />
          </div>
        </div>

        {/* AWAY TEAM */}
        <button
          onClick={() => setActiveDropdown(activeDropdown === 'away' ? null : 'away')}
          className={`relative p-5 pb-12 transition-all group text-center rounded-r-2xl ${
            activeDropdown === 'away' ? 'bg-[#1a1a1a]' : 'hover:bg-[#141414]'
          }`}
        >
          {awayTeam ? (
            <>
              {/* AWAY Badge - Filled when team selected */}
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white rounded-full mb-3">
                Away
              </span>
              <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-white p-2 shadow-lg">
                {awayTeam.logo?.primary ? (
                  <img src={awayTeam.logo.primary} alt={awayTeam.name} className="w-full h-full object-contain" />
                ) : (
                  <Shield className="w-full h-full text-gray-400" />
                )}
              </div>
              <div className="text-lg font-bold text-white">{awayTeam.city}</div>
              <div className="text-sm text-gray-400">{awayTeam.name}</div>
            </>
          ) : (
            <>
              {/* AWAY Badge - Subtle when empty */}
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                Away
              </span>
              <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-gray-800/30 border-2 border-dashed border-gray-600 flex items-center justify-center group-hover:border-orange-500/50 group-hover:bg-orange-500/5 transition-colors">
                <Shield className="w-8 h-8 text-gray-600 group-hover:text-orange-500/50 transition-colors" />
              </div>
              <div className="text-gray-400 font-medium">Select Team</div>
              <div className="text-xs text-gray-600 mt-1">Click to choose</div>
            </>
          )}

          {/* Dropdown indicator */}
          <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
            activeDropdown === 'away'
              ? 'bg-orange-500/20 text-orange-400'
              : awayTeam
                ? 'bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-gray-300'
                : 'bg-orange-500/10 text-orange-400/70 group-hover:bg-orange-500/20 group-hover:text-orange-400'
          }`}>
            <span className="text-[10px] font-medium uppercase tracking-wide">{awayTeam ? 'Change' : 'Select'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'away' ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {/* Dropdowns - Outside the grid for proper positioning */}
      {activeDropdown === 'home' && (
        <div className="absolute z-50 top-full left-0 w-[calc(50%-40px)] mt-2">
          <Dropdown type="home" />
        </div>
      )}
      {activeDropdown === 'away' && (
        <div className="absolute z-50 top-full right-0 w-[calc(50%-40px)] mt-2">
          <Dropdown type="away" />
        </div>
      )}
    </div>
  );
};
