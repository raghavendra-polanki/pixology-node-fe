/**
 * Teams Service
 * Service for fetching sports teams and players data
 */

export interface Sport {
  id: string;
  name: string;
  icon: string;
  teamsCount: number;
  playersCount: number;
  league: string;
  season: string;
}

export interface Team {
  teamId: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  founded: number;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  logo?: {
    primary: string;
    alternate?: string;
  };
  jersey?: {
    home: string;
    away: string;
  };
  stadium: {
    name: string;
    capacity: number;
    location: string;
  };
  players: Player[];
}

export interface Player {
  playerId: string;
  name: string;
  jerseyNumber: string;
  position: string;
  height?: string;
  weight?: number;
  birthDate?: string;
  age?: number;
  birthCity?: string;
  birthCountry?: string;
  shootsCatches?: string;
  images?: {
    headshot?: string;
    action?: string;
  };
}

class TeamsService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  /**
   * Get authorization header with token
   */
  private getAuthHeader(): Record<string, string> {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get all available sports
   */
  async getSports(): Promise<Sport[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/teams/sports`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch sports');
    }

    const data = await response.json();
    return data.sports;
  }

  /**
   * Get all teams for a specific sport
   */
  async getTeams(sport: string): Promise<Team[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/teams/${sport}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch teams');
    }

    const data = await response.json();
    return data.teams;
  }

  /**
   * Get a specific team with all players
   */
  async getTeam(sport: string, teamId: string): Promise<Team> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/teams/${sport}/${teamId}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch team');
    }

    const data = await response.json();
    return data.team;
  }

  /**
   * Get all players for a specific team
   */
  async getPlayers(sport: string, teamId: string): Promise<Player[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/teams/${sport}/${teamId}/players`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch players');
    }

    const data = await response.json();
    return data.players;
  }

  /**
   * Get a team with all its players (convenience method)
   */
  async getTeamWithPlayers(sport: string, teamId: string): Promise<Team> {
    // getTeam already returns players embedded in the team object
    return this.getTeam(sport, teamId);
  }

  /**
   * Update a team's data
   */
  async updateTeam(sport: string, teamId: string, teamData: Partial<Team>): Promise<Team> {
    const url = `${this.apiBaseUrl}/api/flarelab/teams/${sport}/${teamId}`;
    console.log('Updating team at URL:', url);
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(teamData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update team');
    }

    const data = await response.json();
    return data.team;
  }
}

export default TeamsService;
