/**
 * Text Styles Service
 * Service for managing text style presets in the Style Library
 */

import type {
  LibraryTextStyle,
  CreateTextStyleInput,
  UpdateTextStyleInput,
  TextStyleListResponse,
  TextStyleCategory,
} from '@/features/flarelab/types/project.types';

class TextStylesService {
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
   * Get all text styles
   */
  async getTextStyles(options?: {
    category?: TextStyleCategory | 'all';
    favorites?: boolean;
    search?: string;
  }): Promise<TextStyleListResponse> {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.favorites) params.append('favorites', 'true');
    if (options?.search) params.append('search', options.search);

    const queryString = params.toString();
    const url = `${this.apiBaseUrl}/api/flarelab/text-styles${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch text styles');
    }

    return response.json();
  }

  /**
   * Get a single text style by ID
   */
  async getTextStyle(id: string): Promise<LibraryTextStyle> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/text-styles/${id}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch text style');
    }

    const data = await response.json();
    return data.style;
  }

  /**
   * Create a new text style
   */
  async createTextStyle(styleData: CreateTextStyleInput): Promise<LibraryTextStyle> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/text-styles`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(styleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create text style');
    }

    const data = await response.json();
    return data.style;
  }

  /**
   * Update an existing text style
   */
  async updateTextStyle(id: string, styleData: UpdateTextStyleInput): Promise<LibraryTextStyle> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/text-styles/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(styleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update text style');
    }

    const data = await response.json();
    return data.style;
  }

  /**
   * Delete a text style
   */
  async deleteTextStyle(id: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/text-styles/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete text style');
    }
  }

  /**
   * Duplicate a text style
   */
  async duplicateTextStyle(id: string, newName?: string): Promise<LibraryTextStyle> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/text-styles/${id}/duplicate`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to duplicate text style');
    }

    const data = await response.json();
    return data.style;
  }

  /**
   * Toggle favorite status for a text style
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const response = await fetch(`${this.apiBaseUrl}/api/flarelab/text-styles/${id}/favorite`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle favorite');
    }

    const data = await response.json();
    return data.isFavorite;
  }
}

export default TextStylesService;
