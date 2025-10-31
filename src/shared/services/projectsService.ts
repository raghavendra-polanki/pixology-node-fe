export interface ProjectFormData {
  title: string;
  description: string;
  thumbnail: string;
  status: 'draft' | 'published' | 'archived';
}

export interface Project extends ProjectFormData {
  id: string;
  ownerId: string;
  members: Record<string, 'owner' | 'editor' | 'viewer'>;
  createdAt: Date;
  updatedAt: Date;
  userRole?: 'owner' | 'editor' | 'viewer';
  isOwner?: boolean;
}

class ProjectsService {
  private apiBaseUrl: string;
  private isProduction: boolean;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.isProduction = import.meta.env.MODE === 'production';
  }

  /**
   * Get the authorization header with the stored token
   *
   * Development: Token from sessionStorage
   * Production: Token in httpOnly cookie (not accessible, browser sends automatically)
   */
  private getAuthHeader(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // In development, get token from sessionStorage
    if (!this.isProduction) {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Get all projects for the authenticated user
   */
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include', // Include cookies (for production httpOnly cookie)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch projects');
    }

    const data = await response.json();
    return data.projects || [];
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<Project> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include', // Include cookies (for production httpOnly cookie)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch project');
    }

    const data = await response.json();
    return data.project;
  }

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectFormData): Promise<Project> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include', // Include cookies (for production httpOnly cookie)
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }

    const data = await response.json();
    return data.project;
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, projectData: Partial<ProjectFormData>): Promise<Project> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      credentials: 'include', // Include cookies (for production httpOnly cookie)
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    const data = await response.json();
    return data.project;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
      credentials: 'include', // Include cookies (for production httpOnly cookie)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }
  }
}

export default ProjectsService;
