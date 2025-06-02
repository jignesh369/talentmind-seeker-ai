
export interface ParsedQuery {
  originalQuery: string;
  skills: string[];
  roles: string[];
  location?: string;
  seniority?: string;
  interpretation: string;
  confidence: number;
}

export class QueryParser {
  private skillPatterns = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'python', 'java', 
    'c#', 'c++', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala',
    'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'git', 'jenkins', 'ci/cd', 'agile', 'scrum', 'devops'
  ];

  private rolePatterns = [
    'developer', 'engineer', 'programmer', 'architect', 'lead', 'senior', 'junior',
    'frontend', 'backend', 'fullstack', 'full-stack', 'full stack',
    'devops', 'sre', 'data scientist', 'data engineer', 'ml engineer'
  ];

  private seniorityPatterns = [
    'junior', 'mid-level', 'middle', 'senior', 'lead', 'principal', 'staff', 'expert'
  ];

  async parseQuery(query: string, location?: string): Promise<ParsedQuery> {
    const normalizedQuery = query.toLowerCase();
    
    // Extract skills
    const detectedSkills = this.skillPatterns.filter(skill => 
      normalizedQuery.includes(skill.toLowerCase())
    );

    // Extract roles
    const detectedRoles = this.rolePatterns.filter(role => 
      normalizedQuery.includes(role.toLowerCase())
    );

    // Extract seniority
    const detectedSeniority = this.seniorityPatterns.find(level => 
      normalizedQuery.includes(level.toLowerCase())
    );

    // Calculate confidence based on detected elements
    let confidence = 50; // Base confidence
    if (detectedSkills.length > 0) confidence += 20;
    if (detectedRoles.length > 0) confidence += 15;
    if (detectedSeniority) confidence += 10;
    if (location) confidence += 5;

    confidence = Math.min(confidence, 95);

    // Generate interpretation
    const interpretation = this.generateInterpretation(
      detectedRoles, 
      detectedSkills, 
      detectedSeniority, 
      location
    );

    return {
      originalQuery: query,
      skills: detectedSkills,
      roles: detectedRoles,
      location,
      seniority: detectedSeniority,
      interpretation,
      confidence
    };
  }

  private generateInterpretation(
    roles: string[], 
    skills: string[], 
    seniority?: string, 
    location?: string
  ): string {
    let parts = [];

    if (roles.length > 0) {
      parts.push(`${seniority ? seniority + ' ' : ''}${roles[0]}s`);
    } else {
      parts.push('professionals');
    }

    if (skills.length > 0) {
      parts.push(`skilled in ${skills.slice(0, 3).join(', ')}`);
    }

    if (location) {
      parts.push(`in ${location}`);
    }

    return `Searching for: ${parts.join(' ')}`;
  }
}
