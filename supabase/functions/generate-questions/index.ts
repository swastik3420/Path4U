import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Difficulty = 'Basic' | 'Intermediate' | 'Advanced';
interface QTemplate {
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Curated, verified question bank keyed by lowercased skill name.
const BANK: Record<string, QTemplate[]> = {
  javascript: [
    { difficulty: 'Basic', question: 'Which keyword declares a block-scoped variable that cannot be reassigned?', options: ['var', 'let', 'const', 'static'], correctAnswer: 2, explanation: '`const` creates a block-scoped binding that cannot be reassigned.' },
    { difficulty: 'Basic', question: 'What does `typeof null` return in JavaScript?', options: ['"null"', '"object"', '"undefined"', '"number"'], correctAnswer: 1, explanation: '`typeof null` returns "object" — a long-standing quirk of the language.' },
    { difficulty: 'Intermediate', question: 'Which method creates a new array with the results of calling a function on every element?', options: ['forEach', 'map', 'reduce', 'filter'], correctAnswer: 1, explanation: '`Array.prototype.map` returns a new array of transformed elements.' },
    { difficulty: 'Intermediate', question: 'What is the result of `[1,2,3].reduce((a,b) => a+b, 0)`?', options: ['0', '6', '"123"', 'undefined'], correctAnswer: 1, explanation: 'reduce sums 0+1+2+3 = 6.' },
    { difficulty: 'Advanced', question: 'Which statement about the JavaScript event loop is correct?', options: ['Microtasks run after each macrotask completes', 'setTimeout callbacks run before Promise callbacks scheduled earlier', 'Promises are macrotasks', 'The call stack processes async code directly'], correctAnswer: 0, explanation: 'After each macrotask, the microtask queue (Promises, queueMicrotask) drains fully before the next macrotask.' },
  ],
  typescript: [
    { difficulty: 'Basic', question: 'Which type in TypeScript accepts any value and disables type checking?', options: ['unknown', 'never', 'any', 'void'], correctAnswer: 2, explanation: '`any` opts out of type checking; `unknown` is safer since it requires narrowing.' },
    { difficulty: 'Intermediate', question: 'What is the difference between `interface` and `type` for object shapes?', options: ['Only `type` supports unions', '`interface` can be declaration-merged, `type` cannot', 'They are identical', '`type` supports extends, `interface` does not'], correctAnswer: 1, explanation: 'Interfaces can be re-opened via declaration merging; type aliases cannot.' },
    { difficulty: 'Advanced', question: 'What does the utility type `Partial<T>` do?', options: ['Makes all properties readonly', 'Makes all properties optional', 'Removes null from properties', 'Picks specified properties'], correctAnswer: 1, explanation: '`Partial<T>` maps every property of T to optional.' },
  ],
  react: [
    { difficulty: 'Basic', question: 'Which hook manages local component state?', options: ['useEffect', 'useState', 'useMemo', 'useRef'], correctAnswer: 1, explanation: '`useState` returns a stateful value and a setter.' },
    { difficulty: 'Basic', question: 'What must a React component return?', options: ['A string', 'A single valid React element or null', 'A DOM node', 'A Promise'], correctAnswer: 1, explanation: 'A component must return a React element, fragment, string, number, or null.' },
    { difficulty: 'Intermediate', question: 'When does `useEffect(fn, [])` run?', options: ['On every render', 'Only once after the initial mount', 'Only on unmount', 'Before render'], correctAnswer: 1, explanation: 'An empty dependency array runs the effect only after the first render (and cleanup on unmount).' },
    { difficulty: 'Intermediate', question: 'Which prop is required when rendering a list of elements?', options: ['id', 'key', 'ref', 'index'], correctAnswer: 1, explanation: 'React uses `key` to identify list items across renders.' },
    { difficulty: 'Advanced', question: 'What does `useMemo` primarily optimize?', options: ['Network requests', 'Expensive computed values between renders', 'DOM diffing', 'State updates'], correctAnswer: 1, explanation: '`useMemo` memoizes a computed value so it is only recomputed when dependencies change.' },
  ],
  'node.js': [
    { difficulty: 'Basic', question: 'Which module provides file system access in Node.js?', options: ['os', 'fs', 'path', 'http'], correctAnswer: 1, explanation: 'The `fs` module provides file system operations.' },
    { difficulty: 'Intermediate', question: 'What does `process.nextTick(cb)` do?', options: ['Schedules cb after the current operation, before I/O events', 'Runs cb after setTimeout(0)', 'Runs cb immediately synchronously', 'Runs cb on next event loop tick after I/O'], correctAnswer: 0, explanation: '`process.nextTick` queues the callback to run after the current operation completes and before any I/O events.' },
    { difficulty: 'Advanced', question: 'Which is true about Node.js streams?', options: ['They must load the full data into memory', 'Readable streams emit "data" events in flowing mode', 'They are synchronous', 'They only work with files'], correctAnswer: 1, explanation: 'In flowing mode, readable streams push data via "data" events as it becomes available.' },
  ],
  python: [
    { difficulty: 'Basic', question: 'Which of these is a mutable built-in type?', options: ['tuple', 'str', 'list', 'frozenset'], correctAnswer: 2, explanation: '`list` is mutable; tuple, str, and frozenset are immutable.' },
    { difficulty: 'Basic', question: 'What does `len("hello")` return?', options: ['4', '5', '6', 'Error'], correctAnswer: 1, explanation: '`len` returns the number of characters — 5.' },
    { difficulty: 'Intermediate', question: 'Which statement about list comprehensions is correct?', options: ['They are always slower than for loops', 'They produce generators', 'They create a new list eagerly', 'They cannot include conditionals'], correctAnswer: 2, explanation: 'List comprehensions build a new list eagerly. Generator expressions use () and are lazy.' },
    { difficulty: 'Advanced', question: 'What does the GIL (Global Interpreter Lock) in CPython do?', options: ['Prevents multiple threads from executing Python bytecode simultaneously', 'Locks file I/O', 'Disables garbage collection', 'Serializes network requests'], correctAnswer: 0, explanation: 'The GIL allows only one thread to execute Python bytecode at a time within a CPython process.' },
  ],
  java: [
    { difficulty: 'Basic', question: 'Which keyword is used to inherit a class in Java?', options: ['implements', 'extends', 'inherits', 'super'], correctAnswer: 1, explanation: '`extends` is used for class inheritance; `implements` is for interfaces.' },
    { difficulty: 'Intermediate', question: 'What is the default value of an `int` instance field?', options: ['0', 'null', 'undefined', '-1'], correctAnswer: 0, explanation: 'Numeric instance fields default to 0 in Java.' },
    { difficulty: 'Advanced', question: 'Which is true about `String` in Java?', options: ['Strings are mutable', 'Strings are stored in the heap only, never pooled', 'String literals are interned in the string pool', 'String comparison with == compares content'], correctAnswer: 2, explanation: 'String literals are automatically interned in the string constant pool.' },
  ],
  html: [
    { difficulty: 'Basic', question: 'Which tag defines the largest heading?', options: ['<h6>', '<h1>', '<header>', '<head>'], correctAnswer: 1, explanation: '`<h1>` is the top-level heading.' },
    { difficulty: 'Intermediate', question: 'Which attribute makes an input required in HTML5?', options: ['mandatory', 'required', 'validate', 'must'], correctAnswer: 1, explanation: 'The boolean `required` attribute marks an input as required.' },
    { difficulty: 'Advanced', question: 'Which element is used for the main self-contained content of a document?', options: ['<section>', '<article>', '<div>', '<aside>'], correctAnswer: 1, explanation: '`<article>` represents self-contained composition (post, article, card).' },
  ],
  css: [
    { difficulty: 'Basic', question: 'Which property changes text color?', options: ['font-color', 'color', 'text-color', 'foreground'], correctAnswer: 1, explanation: 'The `color` property sets the foreground text color.' },
    { difficulty: 'Intermediate', question: 'Which value of `position` removes an element from normal flow and positions it relative to the nearest positioned ancestor?', options: ['static', 'relative', 'absolute', 'sticky'], correctAnswer: 2, explanation: '`position: absolute` positions relative to the nearest ancestor with a non-static position.' },
    { difficulty: 'Advanced', question: 'What does `display: grid` primarily enable?', options: ['1D flex layout', '2D layout with rows and columns', 'Floating layout', 'Absolute stacking'], correctAnswer: 1, explanation: 'CSS Grid is a two-dimensional layout system for rows and columns.' },
  ],
  sql: [
    { difficulty: 'Basic', question: 'Which clause filters rows returned by SELECT?', options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'], correctAnswer: 0, explanation: '`WHERE` filters rows before aggregation; `HAVING` filters after.' },
    { difficulty: 'Intermediate', question: 'Which JOIN returns all rows from the left table and matching rows from the right?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN'], correctAnswer: 1, explanation: '`LEFT JOIN` returns all left rows plus matches; unmatched right columns are NULL.' },
    { difficulty: 'Advanced', question: 'What does an index primarily improve?', options: ['Insert speed', 'Read/lookup speed for indexed columns', 'Storage size', 'Backup time'], correctAnswer: 1, explanation: 'Indexes speed up reads/lookups at the cost of extra storage and slower writes.' },
  ],
  git: [
    { difficulty: 'Basic', question: 'Which command stages changes for commit?', options: ['git commit', 'git add', 'git push', 'git stage'], correctAnswer: 1, explanation: '`git add` moves changes into the staging area.' },
    { difficulty: 'Intermediate', question: 'What does `git rebase` do?', options: ['Merges branches with a merge commit', 'Reapplies commits on top of another base tip', 'Deletes commits permanently', 'Creates a new branch'], correctAnswer: 1, explanation: '`git rebase` moves or replays commits onto a new base commit for a linear history.' },
    { difficulty: 'Advanced', question: 'What is the effect of `git reset --hard HEAD~1`?', options: ['Undoes the last commit and discards working tree changes', 'Creates a new commit reversing the last', 'Only unstages the last commit', 'Pushes to remote'], correctAnswer: 0, explanation: '`--hard` resets HEAD, index, and working tree, discarding uncommitted changes.' },
  ],
  docker: [
    { difficulty: 'Basic', question: 'Which file defines a Docker image build?', options: ['docker-compose.yml', 'Dockerfile', 'image.json', 'container.yaml'], correctAnswer: 1, explanation: 'A `Dockerfile` contains the instructions to build an image.' },
    { difficulty: 'Intermediate', question: 'What does `docker exec -it <container> sh` do?', options: ['Starts a new container', 'Runs an interactive shell inside a running container', 'Builds an image', 'Removes a container'], correctAnswer: 1, explanation: '`exec -it` attaches an interactive TTY to run a command in an existing container.' },
    { difficulty: 'Advanced', question: 'Which is true about Docker image layers?', options: ['Each instruction in a Dockerfile creates a new layer', 'Images have exactly one layer', 'Layers cannot be cached', 'Layers are always mutable at runtime'], correctAnswer: 0, explanation: 'Each Dockerfile instruction produces an immutable, cacheable layer.' },
  ],
  kubernetes: [
    { difficulty: 'Basic', question: 'What is the smallest deployable unit in Kubernetes?', options: ['Container', 'Pod', 'Node', 'Service'], correctAnswer: 1, explanation: 'A Pod is the smallest deployable unit; it contains one or more containers sharing network and storage.' },
    { difficulty: 'Intermediate', question: 'Which resource exposes a set of Pods as a stable network endpoint?', options: ['Deployment', 'Service', 'ConfigMap', 'Ingress'], correctAnswer: 1, explanation: 'A Service provides a stable IP/DNS name to reach a dynamic set of Pods.' },
    { difficulty: 'Advanced', question: 'What does a Deployment provide over a bare ReplicaSet?', options: ['Automatic scaling based on CPU', 'Declarative updates with rollout/rollback history', 'Storage provisioning', 'Container image builds'], correctAnswer: 1, explanation: 'Deployments manage ReplicaSets with declarative rolling updates and rollback.' },
  ],
  aws: [
    { difficulty: 'Basic', question: 'Which AWS service provides object storage?', options: ['EC2', 'S3', 'RDS', 'Lambda'], correctAnswer: 1, explanation: 'Amazon S3 is the object storage service.' },
    { difficulty: 'Intermediate', question: 'What is AWS Lambda?', options: ['A virtual machine service', 'A serverless compute service that runs code in response to events', 'A managed database', 'A CDN'], correctAnswer: 1, explanation: 'Lambda runs code without provisioning servers, triggered by events.' },
    { difficulty: 'Advanced', question: 'Which service is best suited for a globally distributed key-value store with single-digit ms latency?', options: ['RDS', 'DynamoDB', 'Redshift', 'S3'], correctAnswer: 1, explanation: 'DynamoDB is a managed NoSQL key-value store with low-latency global tables.' },
  ],
  mongodb: [
    { difficulty: 'Basic', question: 'What is the primary data structure MongoDB stores documents as?', options: ['XML', 'BSON', 'CSV', 'YAML'], correctAnswer: 1, explanation: 'MongoDB stores documents in BSON (binary JSON) format.' },
    { difficulty: 'Intermediate', question: 'Which operator matches documents where a field exists?', options: ['$has', '$exists', '$in', '$defined'], correctAnswer: 1, explanation: '`$exists: true` matches documents that contain the field.' },
    { difficulty: 'Advanced', question: 'What does the aggregation pipeline stage `$lookup` do?', options: ['Filters documents', 'Performs a left outer join to another collection', 'Sorts documents', 'Groups documents'], correctAnswer: 1, explanation: '`$lookup` joins documents from another collection into the pipeline.' },
  ],
  postgresql: [
    { difficulty: 'Basic', question: 'Which command creates a new table in PostgreSQL?', options: ['MAKE TABLE', 'CREATE TABLE', 'NEW TABLE', 'ADD TABLE'], correctAnswer: 1, explanation: '`CREATE TABLE` is the standard SQL DDL command.' },
    { difficulty: 'Intermediate', question: 'Which PostgreSQL type stores JSON with indexing and query support optimized for reads?', options: ['json', 'jsonb', 'text', 'xml'], correctAnswer: 1, explanation: '`jsonb` stores JSON in a decomposed binary format, supports indexing and is faster to query.' },
    { difficulty: 'Advanced', question: 'What does `EXPLAIN ANALYZE` do?', options: ['Only shows the query plan', 'Executes the query and returns actual runtime statistics with the plan', 'Rewrites the query', 'Creates an index automatically'], correctAnswer: 1, explanation: '`EXPLAIN ANALYZE` runs the query and reports the plan with real execution times.' },
  ],
};

// Generic fallback templates for skills not in the bank.
function genericTemplates(skill: string): QTemplate[] {
  return [
    {
      difficulty: 'Basic',
      question: `Which of the following best describes ${skill}?`,
      options: [
        `A tool, technology, or skill used in software development`,
        `A programming language exclusively for mobile apps`,
        `A hardware component`,
        `A type of database index`,
      ],
      correctAnswer: 0,
      explanation: `${skill} is listed on your resume as a professional skill or technology used in software development.`,
    },
    {
      difficulty: 'Intermediate',
      question: `When working with ${skill}, which practice is generally recommended?`,
      options: [
        `Skip reading any official documentation`,
        `Follow the official documentation and community best practices`,
        `Never write tests`,
        `Avoid version control`,
      ],
      correctAnswer: 1,
      explanation: `Following official docs and established community best practices is the recommended approach for any technology, including ${skill}.`,
    },
    {
      difficulty: 'Advanced',
      question: `Which is most important when scaling a project that heavily uses ${skill}?`,
      options: [
        `Ignoring performance profiling`,
        `Monitoring, profiling, and applying documented optimization patterns`,
        `Rewriting everything from scratch every release`,
        `Removing all abstractions`,
      ],
      correctAnswer: 1,
      explanation: `Measurement (monitoring/profiling) combined with documented optimization patterns is the sound approach for scaling systems built with ${skill}.`,
    },
  ];
}

function normalizeSkill(name: string): string {
  return String(name || '').toLowerCase().trim();
}

function lookupBank(name: string): QTemplate[] | null {
  const key = normalizeSkill(name);
  if (BANK[key]) return BANK[key];
  // Alias handling
  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    node: 'node.js',
    nodejs: 'node.js',
    reactjs: 'react',
    'react.js': 'react',
    postgres: 'postgresql',
    psql: 'postgresql',
    mongo: 'mongodb',
    k8s: 'kubernetes',
  };
  if (aliases[key] && BANK[aliases[key]]) return BANK[aliases[key]];
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skills, count } = await req.json();
    const totalQuestions = Math.max(3, Math.min(30, Number(count) || 30));

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Skills array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize skills into { name } objects.
    const skillList = skills
      .map((s: any) => (typeof s === 'string' ? { name: s } : { name: s?.name }))
      .filter((s: any) => s.name && typeof s.name === 'string')
      .slice(0, 50);

    if (skillList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid skill names provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a candidate pool: for each skill, produce its templates (bank or generic).
    const pool: { skill: string; template: QTemplate }[] = [];
    for (const s of skillList) {
      const templates = lookupBank(s.name) ?? genericTemplates(s.name);
      for (const t of templates) pool.push({ skill: s.name, template: t });
    }

    // Shuffle helper
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // Target counts per difficulty
    const basicTarget = Math.ceil(totalQuestions / 3);
    const intermediateTarget = Math.ceil(totalQuestions / 3);
    const advancedTarget = totalQuestions - basicTarget - intermediateTarget;

    const buckets: Record<Difficulty, { skill: string; template: QTemplate }[]> = {
      Basic: shuffle(pool.filter(p => p.template.difficulty === 'Basic')),
      Intermediate: shuffle(pool.filter(p => p.template.difficulty === 'Intermediate')),
      Advanced: shuffle(pool.filter(p => p.template.difficulty === 'Advanced')),
    };

    const pickFromBucket = (bucket: { skill: string; template: QTemplate }[], n: number, usedSkills: Set<string>) => {
      const picked: { skill: string; template: QTemplate }[] = [];
      // First pass: prefer unused skills for coverage
      for (const item of bucket) {
        if (picked.length >= n) break;
        if (!usedSkills.has(item.skill.toLowerCase())) {
          picked.push(item);
          usedSkills.add(item.skill.toLowerCase());
        }
      }
      // Second pass: fill remainder
      for (const item of bucket) {
        if (picked.length >= n) break;
        if (!picked.includes(item)) picked.push(item);
      }
      return picked;
    };

    const usedSkills = new Set<string>();
    let selected = [
      ...pickFromBucket(buckets.Basic, basicTarget, usedSkills),
      ...pickFromBucket(buckets.Intermediate, intermediateTarget, usedSkills),
      ...pickFromBucket(buckets.Advanced, advancedTarget, usedSkills),
    ];

    // If we still don't have enough (small skill set), backfill from any remaining
    if (selected.length < totalQuestions) {
      const remaining = shuffle(pool.filter(p => !selected.includes(p)));
      for (const item of remaining) {
        if (selected.length >= totalQuestions) break;
        selected.push(item);
      }
    }

    // Cap and shape final questions
    selected = selected.slice(0, totalQuestions);

    const questions = selected.map((item, index) => ({
      id: index + 1,
      skill: item.skill,
      difficulty: item.template.difficulty,
      question: item.template.question,
      options: item.template.options,
      correctAnswer: item.template.correctAnswer,
      explanation: item.template.explanation,
    }));

    console.log(`Generated ${questions.length} questions locally for ${skillList.length} skills`);

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
