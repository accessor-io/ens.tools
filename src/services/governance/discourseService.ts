/**
 * Discourse API Service for discuss.ens.domains
 * Provides access to proposals, discussions, and forum data
 */

const DISCOURSE_BASE_URL = 'https://discuss.ens.domains';

export interface DiscourseTopic {
  id: number;
  title: string;
  fancy_title: string;
  slug: string;
  posts_count: number;
  reply_count: number;
  created_at: string;
  last_posted_at: string;
  views: number;
  like_count: number;
  tags: string[];
  category_id: number;
  visible: boolean;
  closed: boolean;
  archived: boolean;
  pinned: boolean;
  posters: Array<{
    user_id: number;
    description: string;
  }>;
}

export interface DiscoursePost {
  id: number;
  name: string;
  username: string;
  created_at: string;
  cooked: string;
  raw: string;
  post_number: number;
  topic_id: number;
  topic_slug: string;
  like_count: number;
  reply_count: number;
  reads: number;
  score: number;
  link_counts: Array<{
    url: string;
    internal: boolean;
    clicks: number;
  }>;
}

export interface DiscourseTopicDetail {
  id: number;
  title: string;
  fancy_title: string;
  slug: string;
  posts_count: number;
  created_at: string;
  views: number;
  reply_count: number;
  like_count: number;
  tags: string[];
  category_id: number;
  post_stream: {
    posts: DiscoursePost[];
  };
  details: {
    created_by: {
      id: number;
      username: string;
      name: string;
    };
    last_poster: {
      id: number;
      username: string;
      name: string;
    };
    participants: Array<{
      id: number;
      username: string;
      name: string;
      post_count: number;
    }>;
  };
}

export interface DiscourseSearchResult {
  posts: Array<{
    id: number;
    topic_id: number;
    topic_title: string;
    username: string;
    created_at: string;
    blurb: string;
    like_count: number;
    url: string;
  }>;
  topics: DiscourseTopic[];
}

class DiscourseService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  private async fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const data = await fetcher();
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Discourse API error for ${key}:`, error);
      throw error;
    }
  }

  async getLatestTopics(limit = 50, order: 'default' | 'created' | 'activity' = 'default'): Promise<DiscourseTopic[]> {
    const key = `latest_${limit}_${order}`;
    return this.fetchWithCache(key, async () => {
      const response = await fetch(
        `${DISCOURSE_BASE_URL}/latest.json?limit=${limit}&order=${order}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.topic_list?.topics || [];
    });
  }

  async getTopic(topicId: number): Promise<DiscourseTopicDetail> {
    const key = `topic_${topicId}`;
    return this.fetchWithCache(key, async () => {
      const response = await fetch(`${DISCOURSE_BASE_URL}/t/${topicId}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }

  async getTopicBySlug(slug: string): Promise<DiscourseTopicDetail | null> {
    try {
      // Discourse requires topic ID, but we can search for the slug
      const searchResults = await this.search(slug);
      const topic = searchResults.topics.find(t => t.slug === slug);
      if (topic) {
        return this.getTopic(topic.id);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching topic by slug ${slug}:`, error);
      return null;
    }
  }

  async search(query: string): Promise<DiscourseSearchResult> {
    const key = `search_${query}`;
    return this.fetchWithCache(key, async () => {
      const response = await fetch(
        `${DISCOURSE_BASE_URL}/search.json?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }

  async getCategoryTopics(categorySlug: string, limit = 50): Promise<DiscourseTopic[]> {
    const key = `category_${categorySlug}_${limit}`;
    return this.fetchWithCache(key, async () => {
      const response = await fetch(
        `${DISCOURSE_BASE_URL}/c/${categorySlug}.json?limit=${limit}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.topic_list?.topics || [];
    });
  }

  async searchProposals(query: string): Promise<DiscourseTopic[]> {
    const results = await this.search(query);
    return results.topics.filter(topic => 
      topic.tags?.includes('proposal') || 
      topic.tags?.includes('executable') ||
      topic.title.toLowerCase().includes('ep ')
    );
  }

  async findProposalByEP(epNumber: string): Promise<DiscourseTopic | null> {
    const patterns = [
      `EP ${epNumber}`,
      `EP-${epNumber}`,
      `EP${epNumber}`,
    ];

    for (const pattern of patterns) {
      const results = await this.searchProposals(pattern);
      const match = results.find(topic => 
        topic.title.includes(`EP ${epNumber}`) ||
        topic.title.includes(`EP-${epNumber}`) ||
        topic.title.includes(`EP${epNumber}`)
      );
      if (match) return match;
    }

    return null;
  }

  async findTopicsWithAddress(address: string): Promise<DiscourseTopic[]> {
    const results = await this.search(address);
    return results.topics || [];
  }

  clearCache() {
    this.cache.clear();
  }
}

export const discourseService = new DiscourseService();







