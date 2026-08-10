/**
 * HireSync ATS Skill Taxonomy Dictionary
 *
 * A curated, normalized lookup dictionary of 200+ technical & domain skills
 * organized by category. Used by the ATS parser entity extractor to identify
 * candidate skills from raw resume text.
 *
 * Rules:
 * - All keys and values are lowercase for case-insensitive matching.
 * - Each skill entry maps a canonical name to an array of recognized aliases.
 * - The extractor uses the canonical name as the stored skill token.
 */

const skillsTaxonomy = {
  // ─────────────────────────────────────────────
  // Frontend / UI
  // ─────────────────────────────────────────────
  frontend: {
    react: ['react', 'reactjs', 'react.js'],
    vue: ['vue', 'vuejs', 'vue.js', 'vue 3'],
    angular: ['angular', 'angularjs', 'angular.js'],
    nextjs: ['next.js', 'nextjs', 'next js'],
    nuxtjs: ['nuxt.js', 'nuxtjs'],
    svelte: ['svelte', 'sveltekit'],
    html: ['html', 'html5', 'hypertext markup language'],
    css: ['css', 'css3', 'cascading style sheets'],
    tailwind: ['tailwind', 'tailwindcss', 'tailwind css'],
    sass: ['sass', 'scss'],
    bootstrap: ['bootstrap'],
    typescript: ['typescript', 'ts'],
    javascript: ['javascript', 'js', 'es6', 'es2015', 'ecmascript'],
    jquery: ['jquery'],
    redux: ['redux', 'react-redux', 'redux toolkit', 'rtk'],
    graphql: ['graphql', 'graph ql'],
    webpack: ['webpack'],
    vite: ['vite'],
    storybook: ['storybook'],
    figma: ['figma'],
  },

  // ─────────────────────────────────────────────
  // Backend / Server
  // ─────────────────────────────────────────────
  backend: {
    nodejs: ['node.js', 'nodejs', 'node js'],
    express: ['express', 'expressjs', 'express.js'],
    fastapi: ['fastapi', 'fast api'],
    django: ['django'],
    flask: ['flask'],
    springboot: ['spring boot', 'springboot', 'spring framework'],
    laravel: ['laravel'],
    nestjs: ['nestjs', 'nest.js'],
    python: ['python', 'python3', 'python 3'],
    java: ['java', 'java se', 'java ee'],
    golang: ['golang', 'go lang', 'go'],
    rust: ['rust', 'rust-lang'],
    php: ['php', 'php8'],
    ruby: ['ruby', 'ruby on rails', 'rails'],
    dotnet: ['dotnet', '.net', 'asp.net', 'c#', 'csharp'],
    rest: ['rest api', 'restful', 'rest', 'restful api'],
    grpc: ['grpc', 'grpc api'],
    jwt: ['jwt', 'json web token'],
    oauth: ['oauth', 'oauth2', 'openid connect'],
    websocket: ['websocket', 'socket.io', 'ws'],
  },

  // ─────────────────────────────────────────────
  // Databases
  // ─────────────────────────────────────────────
  databases: {
    postgresql: ['postgresql', 'postgres', 'psql', 'pg'],
    mysql: ['mysql', 'my sql'],
    mongodb: ['mongodb', 'mongo db', 'mongo'],
    redis: ['redis'],
    sqlite: ['sqlite', 'sqlite3'],
    cassandra: ['cassandra', 'apache cassandra'],
    dynamodb: ['dynamodb', 'dynamo db'],
    elasticsearch: ['elasticsearch', 'elastic search'],
    firebase: ['firebase', 'firestore', 'firebase realtime database'],
    neo4j: ['neo4j', 'graph database'],
    supabase: ['supabase'],
    prisma: ['prisma', 'prisma orm'],
    sequelize: ['sequelize'],
    typeorm: ['typeorm'],
    mongoose: ['mongoose'],
    sqlalchemy: ['sqlalchemy', 'sql alchemy'],
  },

  // ─────────────────────────────────────────────
  // DevOps & Infrastructure
  // ─────────────────────────────────────────────
  devops: {
    docker: ['docker', 'dockerfile', 'docker compose', 'docker-compose'],
    kubernetes: ['kubernetes', 'k8s', 'kube'],
    terraform: ['terraform', 'tf'],
    ansible: ['ansible'],
    jenkins: ['jenkins'],
    githubactions: ['github actions', 'github ci', 'gha'],
    gitlab: ['gitlab ci', 'gitlab ci/cd', 'gitlab'],
    nginx: ['nginx', 'nginx server'],
    linux: ['linux', 'ubuntu', 'debian', 'centos', 'rhel'],
    bash: ['bash', 'shell scripting', 'shell script', 'zsh'],
    cicd: ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment'],
    prometheus: ['prometheus'],
    grafana: ['grafana'],
    helm: ['helm', 'helm charts'],
  },

  // ─────────────────────────────────────────────
  // Cloud Platforms
  // ─────────────────────────────────────────────
  cloud: {
    aws: ['aws', 'amazon web services', 'amazon aws'],
    gcp: ['gcp', 'google cloud', 'google cloud platform'],
    azure: ['azure', 'microsoft azure'],
    cloudflare: ['cloudflare', 'cloudflare workers'],
    vercel: ['vercel'],
    netlify: ['netlify'],
    heroku: ['heroku'],
    digitalocean: ['digitalocean', 'digital ocean'],
  },

  // ─────────────────────────────────────────────
  // Mobile
  // ─────────────────────────────────────────────
  mobile: {
    reactnative: ['react native', 'react-native'],
    flutter: ['flutter'],
    swift: ['swift', 'ios development', 'swiftui'],
    kotlin: ['kotlin', 'android development', 'android kotlin'],
    dart: ['dart'],
    expo: ['expo'],
  },

  // ─────────────────────────────────────────────
  // Data Science & ML
  // ─────────────────────────────────────────────
  datascience: {
    pandas: ['pandas'],
    numpy: ['numpy'],
    scikitlearn: ['scikit-learn', 'sklearn', 'scikit learn'],
    tensorflow: ['tensorflow', 'tf'],
    pytorch: ['pytorch', 'torch'],
    jupyter: ['jupyter', 'jupyter notebook'],
    spark: ['apache spark', 'pyspark', 'spark'],
    hadoop: ['hadoop', 'apache hadoop'],
    tableau: ['tableau'],
    powerbi: ['power bi', 'powerbi'],
    machinelearning: ['machine learning', 'ml'],
    deeplearning: ['deep learning', 'dl'],
    nlp: ['nlp', 'natural language processing'],
    computervision: ['computer vision', 'cv'],
  },

  // ─────────────────────────────────────────────
  // Testing
  // ─────────────────────────────────────────────
  testing: {
    jest: ['jest'],
    mocha: ['mocha', 'chai'],
    pytest: ['pytest'],
    selenium: ['selenium', 'selenium webdriver'],
    cypress: ['cypress'],
    playwright: ['playwright'],
    postman: ['postman'],
    jmeter: ['jmeter', 'apache jmeter'],
    sonarqube: ['sonarqube', 'sonar'],
  },

  // ─────────────────────────────────────────────
  // Soft Skills / Methodologies
  // ─────────────────────────────────────────────
  methodology: {
    agile: ['agile', 'agile methodology'],
    scrum: ['scrum', 'scrum master'],
    kanban: ['kanban'],
    jira: ['jira', 'atlassian jira'],
    git: ['git', 'version control', 'github', 'bitbucket'],
    tdd: ['tdd', 'test driven development'],
    microservices: ['microservices', 'micro services', 'microservice architecture'],
    solidprinciples: ['solid principles', 'solid', 'design patterns'],
    systemdesign: ['system design', 'distributed systems'],
  },
};

/**
 * Flatten the taxonomy into a Map for O(1) alias-to-canonical lookups.
 * alias → canonical skill name
 * @type {Map<string, string>}
 */
const aliasToCanonical = new Map();

for (const [, categorySkills] of Object.entries(skillsTaxonomy)) {
  for (const [canonical, aliases] of Object.entries(categorySkills)) {
    for (const alias of aliases) {
      aliasToCanonical.set(alias.toLowerCase(), canonical);
    }
  }
}

/**
 * Match a single raw token against the taxonomy.
 * @param {string} token - Lowercased word or phrase from resume text.
 * @returns {string|null} Canonical skill name or null if no match.
 */
function matchSkillToken(token) {
  return aliasToCanonical.get(token.toLowerCase()) || null;
}

/**
 * Extract all canonical skills found in raw resume text.
 * Applies binary presence scoring — duplicates are de-duplicated automatically.
 * @param {string} rawText - Sanitized plain text from the parsed PDF.
 * @returns {string[]} Array of unique canonical skill names.
 */
function extractSkillsFromText(rawText) {
  const text = rawText.toLowerCase();
  const foundSkills = new Set();

  for (const [alias, canonical] of aliasToCanonical.entries()) {
    // Use word-boundary aware match to avoid partial word false positives
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegex(alias)}(?![a-z0-9])`, 'i');
    if (pattern.test(text)) {
      foundSkills.add(canonical);
    }
  }

  return Array.from(foundSkills);
}

/**
 * Escape special regex characters in alias strings.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  skillsTaxonomy,
  aliasToCanonical,
  matchSkillToken,
  extractSkillsFromText,
};
