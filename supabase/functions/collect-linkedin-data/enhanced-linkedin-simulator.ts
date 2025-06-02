
export interface LinkedInProfile {
  id: string;
  name: string;
  headline: string;
  location: string;
  industry: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
  }>;
  skills: string[];
  endorsements: Record<string, number>;
  connections: number;
  profile_url: string;
  avatar_url: string;
}

export class EnhancedLinkedInSimulator {
  private profileTemplates: any[];
  private companies: string[];
  private universities: string[];
  private skillDatabase: Record<string, string[]>;

  constructor() {
    this.initializeData();
  }

  generateEnhancedProfiles(query: string, location: string = '', count: number = 12): LinkedInProfile[] {
    console.log(`🔍 Generating ${count} enhanced LinkedIn profiles for: "${query}"`);
    
    const queryKeywords = this.extractKeywords(query);
    const profiles: LinkedInProfile[] = [];
    
    for (let i = 0; i < count; i++) {
      const profile = this.generateDetailedProfile(queryKeywords, location);
      profiles.push(profile);
    }
    
    return profiles.sort((a, b) => b.connections - a.connections);
  }

  private extractKeywords(query: string) {
    const techKeywords = ['python', 'javascript', 'react', 'node.js', 'java', 'api', 'rest', 'graphql', 'docker', 'aws'];
    const roleKeywords = ['developer', 'engineer', 'architect', 'lead', 'senior', 'principal', 'manager'];
    const domainKeywords = ['backend', 'frontend', 'fullstack', 'devops', 'data', 'machine learning', 'ai'];
    
    const queryLower = query.toLowerCase();
    
    return {
      technologies: techKeywords.filter(tech => queryLower.includes(tech)),
      roles: roleKeywords.filter(role => queryLower.includes(role)),
      domains: domainKeywords.filter(domain => queryLower.includes(domain))
    };
  }

  private generateDetailedProfile(keywords: any, location: string): LinkedInProfile {
    const firstName = this.getRandomItem(['Alex', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Maria', 'Robert', 'Jennifer']);
    const lastName = this.getRandomItem(['Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson']);
    const name = `${firstName} ${lastName}`;
    
    const primaryRole = this.selectPrimaryRole(keywords.roles);
    const primaryTech = this.selectPrimaryTechnology(keywords.technologies);
    const seniority = this.generateSeniorityLevel();
    
    const experience = this.generateExperience(primaryRole, primaryTech, seniority);
    const skills = this.generateRelevantSkills(keywords, primaryTech);
    const education = this.generateEducation();
    
    return {
      id: `linkedin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      headline: this.generateHeadline(seniority, primaryRole, primaryTech),
      location: location || this.getRandomLocation(),
      industry: this.selectIndustry(keywords.domains),
      summary: this.generateProfessionalSummary(name, seniority, primaryRole, skills, experience.length),
      experience,
      education,
      skills: skills.slice(0, 15),
      endorsements: this.generateEndorsements(skills),
      connections: this.generateConnectionCount(seniority),
      profile_url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Math.random().toString(36).substr(2, 6)}`,
      avatar_url: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 50)}.jpg`
    };
  }

  private selectPrimaryRole(roles: string[]): string {
    if (roles.length > 0) {
      return this.getRandomItem(roles);
    }
    
    return this.getRandomItem([
      'Software Engineer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
      'DevOps Engineer', 'Data Engineer', 'Solutions Architect', 'Technical Lead'
    ]);
  }

  private selectPrimaryTechnology(technologies: string[]): string {
    if (technologies.length > 0) {
      return this.getRandomItem(technologies);
    }
    
    return this.getRandomItem(['Python', 'JavaScript', 'Java', 'Node.js', 'React', 'AWS']);
  }

  private generateSeniorityLevel(): { level: string; years: number } {
    const levels = [
      { level: 'Senior', years: 6 + Math.floor(Math.random() * 4) },
      { level: 'Lead', years: 8 + Math.floor(Math.random() * 5) },
      { level: 'Principal', years: 10 + Math.floor(Math.random() * 6) },
      { level: 'Mid-Level', years: 3 + Math.floor(Math.random() * 3) },
      { level: '', years: 1 + Math.floor(Math.random() * 2) }
    ];
    
    const weights = [30, 15, 10, 25, 20]; // Favor senior levels
    return this.weightedChoice(levels, weights);
  }

  private generateExperience(role: string, tech: string, seniority: any) {
    const experienceCount = Math.min(2 + Math.floor(seniority.years / 3), 5);
    const experience = [];
    
    for (let i = 0; i < experienceCount; i++) {
      const isCurrentRole = i === 0;
      const company = this.getRandomItem(this.companies);
      const duration = this.generateDuration(isCurrentRole, seniority.years - i * 2);
      
      experience.push({
        title: this.generateJobTitle(role, seniority.level, i === 0),
        company,
        duration,
        description: this.generateJobDescription(role, tech, company, seniority.level)
      });
    }
    
    return experience;
  }

  private generateJobTitle(baseRole: string, seniorityLevel: string, isCurrent: boolean): string {
    const variations = {
      'Software Engineer': ['Software Engineer', 'Software Developer', 'Application Developer'],
      'Backend Developer': ['Backend Engineer', 'API Developer', 'Server-Side Developer'],
      'Frontend Developer': ['Frontend Engineer', 'UI Developer', 'Web Developer'],
      'Full Stack Developer': ['Full Stack Engineer', 'Software Engineer', 'Web Developer']
    };
    
    const baseTitle = variations[baseRole] ? this.getRandomItem(variations[baseRole]) : baseRole;
    
    if (seniorityLevel && seniorityLevel !== '') {
      return `${seniorityLevel} ${baseTitle}`;
    }
    
    return baseTitle;
  }

  private generateDuration(isCurrent: boolean, baseYears: number): string {
    if (isCurrent) {
      const months = Math.max(6, Math.floor(Math.random() * 36));
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      
      if (years > 0) {
        return `${years} yr${years > 1 ? 's' : ''} ${remainingMonths} mo`;
      } else {
        return `${remainingMonths} mos`;
      }
    } else {
      const durationYears = Math.max(1, Math.floor(Math.random() * 3) + 1);
      const months = Math.floor(Math.random() * 12);
      
      if (months === 0) {
        return `${durationYears} yr${durationYears > 1 ? 's' : ''}`;
      } else {
        return `${durationYears} yr${durationYears > 1 ? 's' : ''} ${months} mo`;
      }
    }
  }

  private generateJobDescription(role: string, tech: string, company: string, seniority: string): string {
    const responsibilities = [
      `Developed and maintained scalable ${tech} applications`,
      `Collaborated with cross-functional teams to deliver high-quality software solutions`,
      `Implemented RESTful APIs and microservices architecture`,
      `Optimized application performance and resolved complex technical challenges`,
      `Mentored junior developers and conducted code reviews`,
      `Participated in agile development processes and sprint planning`
    ];
    
    const achievementTemplates = [
      `Reduced application load time by 40% through optimization`,
      `Led migration to cloud infrastructure, improving scalability`,
      `Implemented automated testing, increasing code coverage to 90%`,
      `Designed and built new feature that increased user engagement by 25%`
    ];
    
    const selectedResponsibilities = this.shuffleArray(responsibilities).slice(0, 3);
    const achievement = seniority !== '' ? this.getRandomItem(achievementTemplates) : null;
    
    let description = selectedResponsibilities.join('. ') + '.';
    
    if (achievement) {
      description += ` ${achievement}.`;
    }
    
    return description;
  }

  private generateRelevantSkills(keywords: any, primaryTech: string): string[] {
    const skills = new Set<string>();
    
    // Add primary technology and related skills
    skills.add(primaryTech);
    
    if (this.skillDatabase[primaryTech.toLowerCase()]) {
      this.skillDatabase[primaryTech.toLowerCase()].forEach(skill => skills.add(skill));
    }
    
    // Add query-related skills
    keywords.technologies.forEach((tech: string) => {
      skills.add(tech);
      if (this.skillDatabase[tech.toLowerCase()]) {
        this.skillDatabase[tech.toLowerCase()].slice(0, 3).forEach(skill => skills.add(skill));
      }
    });
    
    // Add common professional skills
    const professionalSkills = [
      'Problem Solving', 'Team Leadership', 'Agile Methodologies', 'Code Review',
      'Technical Documentation', 'Project Management', 'Mentoring'
    ];
    
    this.shuffleArray(professionalSkills).slice(0, 3).forEach(skill => skills.add(skill));
    
    return Array.from(skills);
  }

  private generateEducation() {
    const degrees = [
      { degree: 'Bachelor of Science', field: 'Computer Science' },
      { degree: 'Bachelor of Engineering', field: 'Software Engineering' },
      { degree: 'Master of Science', field: 'Computer Science' },
      { degree: 'Bachelor of Science', field: 'Information Technology' }
    ];
    
    const education = [
      {
        school: this.getRandomItem(this.universities),
        ...this.getRandomItem(degrees)
      }
    ];
    
    // Sometimes add additional education
    if (Math.random() > 0.7) {
      education.push({
        school: this.getRandomItem(['Coursera', 'edX', 'Udacity', 'Pluralsight']),
        degree: 'Certificate',
        field: this.getRandomItem(['Cloud Computing', 'Machine Learning', 'DevOps', 'Data Science'])
      });
    }
    
    return education;
  }

  private generateEndorsements(skills: string[]): Record<string, number> {
    const endorsements: Record<string, number> = {};
    
    skills.slice(0, 10).forEach(skill => {
      endorsements[skill] = Math.floor(Math.random() * 50) + 5;
    });
    
    return endorsements;
  }

  private generateConnectionCount(seniority: any): number {
    const baseConnections = seniority.years * 50;
    const variance = Math.floor(Math.random() * 200) - 100;
    return Math.max(100, baseConnections + variance);
  }

  private generateProfessionalSummary(name: string, seniority: any, role: string, skills: string[], experienceCount: number): string {
    const intro = `${name} is a ${seniority.level ? seniority.level + ' ' : ''}${role} with ${seniority.years}+ years of experience`;
    
    const expertise = `in ${skills.slice(0, 4).join(', ')} and modern software development practices`;
    
    const experience = experienceCount > 2 
      ? `Having worked across ${experienceCount} different organizations, ${name.split(' ')[0]} brings diverse industry experience`
      : `${name.split(' ')[0]} has a strong track record of delivering scalable solutions`;
    
    const strengths = [
      'strong problem-solving abilities',
      'excellent collaboration skills',
      'passion for clean code and best practices',
      'commitment to continuous learning'
    ];
    
    const selectedStrengths = this.shuffleArray(strengths).slice(0, 2).join(' and ');
    
    return `${intro} ${expertise}. ${experience} and demonstrates ${selectedStrengths}.`;
  }

  private generateHeadline(seniority: any, role: string, tech: string): string {
    const templates = [
      `${seniority.level ? seniority.level + ' ' : ''}${role} | ${tech} Specialist`,
      `${tech} ${role} | Building scalable solutions`,
      `${seniority.level ? seniority.level + ' ' : ''}${role} specializing in ${tech}`,
      `${role} | ${tech} • Cloud Architecture • API Development`
    ];
    
    return this.getRandomItem(templates);
  }

  private selectIndustry(domains: string[]): string {
    const industries = [
      'Information Technology and Services',
      'Computer Software',
      'Financial Services',
      'Internet',
      'Telecommunications',
      'E-learning',
      'Healthcare Technology',
      'Fintech'
    ];
    
    return this.getRandomItem(industries);
  }

  private getRandomLocation(): string {
    const locations = [
      'San Francisco Bay Area', 'New York City Metropolitan Area', 'Seattle, Washington',
      'Austin, Texas', 'Boston, Massachusetts', 'Los Angeles, California',
      'London, United Kingdom', 'Berlin, Germany', 'Toronto, Canada',
      'Sydney, Australia', 'Remote'
    ];
    
    return this.getRandomItem(locations);
  }

  private initializeData() {
    this.companies = [
      'Microsoft', 'Google', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Spotify',
      'Uber', 'Airbnb', 'Stripe', 'Shopify', 'Slack', 'Zoom', 'Dropbox',
      'TechCorp', 'InnovateIT', 'NextGen Solutions', 'DataFlow Systems',
      'CloudFirst Technologies', 'ScaleUp Inc', 'Digital Dynamics'
    ];
    
    this.universities = [
      'Stanford University', 'MIT', 'Carnegie Mellon University', 'UC Berkeley',
      'Georgia Tech', 'University of Washington', 'University of Texas at Austin',
      'Harvard University', 'Princeton University', 'Caltech'
    ];
    
    this.skillDatabase = {
      'python': ['Django', 'Flask', 'FastAPI', 'Pandas', 'NumPy', 'SQLAlchemy'],
      'javascript': ['React', 'Node.js', 'Express', 'Vue.js', 'TypeScript', 'Webpack'],
      'java': ['Spring Boot', 'Hibernate', 'Maven', 'JUnit', 'Microservices'],
      'react': ['Redux', 'React Router', 'Jest', 'Material-UI', 'Next.js'],
      'node.js': ['Express.js', 'MongoDB', 'Socket.io', 'Passport.js', 'Mocha'],
      'aws': ['EC2', 'S3', 'Lambda', 'RDS', 'CloudFormation', 'EKS']
    };
  }

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private weightedChoice<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}
