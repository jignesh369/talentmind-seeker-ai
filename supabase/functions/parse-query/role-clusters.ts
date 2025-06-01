
export const CONTEXTUAL_ROLE_CLUSTERS = {
  'frontend_developer': {
    primary_skills: ['javascript', 'typescript', 'react', 'vue', 'angular'],
    secondary_skills: ['html', 'css', 'sass', 'webpack', 'vite'],
    tools: ['figma', 'git', 'npm', 'yarn'],
    seniority_progression: ['junior frontend', 'frontend developer', 'senior frontend', 'lead frontend', 'frontend architect']
  },
  'backend_developer': {
    primary_skills: ['node.js', 'python', 'java', 'go', 'rust'],
    secondary_skills: ['sql', 'postgresql', 'mongodb', 'redis'],
    tools: ['docker', 'git', 'postman', 'swagger'],
    seniority_progression: ['junior backend', 'backend developer', 'senior backend', 'lead backend', 'backend architect']
  },
  'fullstack_developer': {
    primary_skills: ['javascript', 'typescript', 'react', 'node.js'],
    secondary_skills: ['sql', 'mongodb', 'aws', 'docker'],
    tools: ['git', 'docker', 'figma', 'postman'],
    seniority_progression: ['junior fullstack', 'fullstack developer', 'senior fullstack', 'lead fullstack', 'solution architect']
  },
  'devops_engineer': {
    primary_skills: ['aws', 'kubernetes', 'docker', 'terraform'],
    secondary_skills: ['python', 'bash', 'jenkins', 'gitlab'],
    tools: ['prometheus', 'grafana', 'ansible', 'helm'],
    seniority_progression: ['junior devops', 'devops engineer', 'senior devops', 'lead devops', 'platform architect']
  }
};

export const TECHNOLOGY_STACKS = {
  'mern': ['mongodb', 'express', 'react', 'node.js'],
  'mean': ['mongodb', 'express', 'angular', 'node.js'],
  'lamp': ['linux', 'apache', 'mysql', 'php'],
  'django_stack': ['python', 'django', 'postgresql', 'redis'],
  'spring_stack': ['java', 'spring', 'mysql', 'maven'],
  'jamstack': ['javascript', 'api', 'markup', 'gatsby', 'next.js']
};
