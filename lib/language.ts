export interface LanguageProfile {
  language: string
  framework?: string
  runtime?: string
  packageManager?: string
  buildCommand?: string
  startCommand?: string
  description?: string
}

export const DEFAULT_LANGUAGE_PROFILE: LanguageProfile = {
  language: 'html',
  framework: 'Vanilla',
  runtime: 'Browser',
  packageManager: 'none',
  buildCommand: 'none',
  startCommand: 'Open index.html in a browser',
  description: 'Single-file web experience rendered directly in the browser.',
}

type ProfilePreset = {
  match: RegExp[]
  profile: LanguageProfile
}

const PROFILE_PRESETS: ProfilePreset[] = [
  {
    match: [/next\.?js/i, /app router/i, /react server components/i],
    profile: {
      language: 'TypeScript',
      framework: 'Next.js 14',
      runtime: 'Node.js (Vercel / Edge)',
      packageManager: 'npm',
      buildCommand: 'npm install && npm run build',
      startCommand: 'npm run dev',
      description: 'Modern React (App Router) project with server components.',
    },
  },
  {
    match: [/react/i],
    profile: {
      language: 'TypeScript',
      framework: 'React',
      runtime: 'Browser + Node.js tooling',
      packageManager: 'npm',
      buildCommand: 'npm install && npm run build',
      startCommand: 'npm start',
      description: 'Client-side React application bundled with Vite or CRA.',
    },
  },
  {
    match: [/python/i, /fastapi/i, /flask/i, /django/i],
    profile: {
      language: 'Python',
      framework: 'FastAPI',
      runtime: 'uvicorn',
      packageManager: 'pip',
      buildCommand: 'python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt',
      startCommand: 'uvicorn main:app --reload',
      description: 'Python API/server project with FastAPI-style structure.',
    },
  },
  {
    match: [/golang/i, /\bgo\b/i],
    profile: {
      language: 'Go',
      framework: 'net/http',
      runtime: 'Go toolchain',
      packageManager: 'go modules',
      buildCommand: 'go mod tidy',
      startCommand: 'go run ./...',
      description: 'Go service using Go modules and standard http server.',
    },
  },
  {
    match: [/rust/i, /cargo/i],
    profile: {
      language: 'Rust',
      framework: 'Axum',
      runtime: 'tokio',
      packageManager: 'cargo',
      buildCommand: 'cargo build',
      startCommand: 'cargo run',
      description: 'Rust application using Cargo and async Tokio runtime.',
    },
  },
  {
    match: [/swift/i, /ios/i, /mac app/i],
    profile: {
      language: 'Swift',
      framework: 'SwiftUI',
      runtime: 'Xcode',
      packageManager: 'Swift Package Manager',
      buildCommand: 'swift build',
      startCommand: 'swift run',
      description: 'Swift application using SwiftUI components.',
    },
  },
  {
    match: [/kotlin/i, /android/i],
    profile: {
      language: 'Kotlin',
      framework: 'Android Jetpack',
      runtime: 'Android Runtime',
      packageManager: 'Gradle',
      buildCommand: './gradlew assembleDebug',
      startCommand: './gradlew installDebug',
      description: 'Android mobile application written in Kotlin.',
    },
  },
  {
    match: [/c#|dotnet|asp\.net/i],
    profile: {
      language: 'C#',
      framework: 'ASP.NET Core',
      runtime: '.NET 8',
      packageManager: 'dotnet CLI',
      buildCommand: 'dotnet restore && dotnet build',
      startCommand: 'dotnet run',
      description: 'ASP.NET Core web or API project using the dotnet CLI.',
    },
  },
  {
    match: [/node\.?js/i, /express/i, /api server/i],
    profile: {
      language: 'JavaScript',
      framework: 'Express',
      runtime: 'Node.js',
      packageManager: 'npm',
      buildCommand: 'npm install',
      startCommand: 'node index.js',
      description: 'Node.js server-side project using Express.',
    },
  },
]

export function mergeLanguageProfile(
  base: LanguageProfile = DEFAULT_LANGUAGE_PROFILE,
  overrides?: Partial<LanguageProfile>
): LanguageProfile {
  return {
    ...base,
    ...(overrides || {}),
  }
}

export function detectLanguageProfile(input: string, preference?: string): LanguageProfile {
  const normalized = input.toLowerCase()

  if (preference && preference !== 'auto') {
    const preferredPreset = PROFILE_PRESETS.find((preset) =>
      preset.profile.language.toLowerCase().includes(preference.toLowerCase()) ||
      preset.profile.framework?.toLowerCase().includes(preference.toLowerCase())
    )
    if (preferredPreset) {
      return mergeLanguageProfile(DEFAULT_LANGUAGE_PROFILE, preferredPreset.profile)
    }
    return mergeLanguageProfile(DEFAULT_LANGUAGE_PROFILE, {
      language: preference,
      description: `Custom project targeting ${preference}.`,
    })
  }

  for (const preset of PROFILE_PRESETS) {
    if (preset.match.some((matcher) => matcher.test(normalized))) {
      return mergeLanguageProfile(DEFAULT_LANGUAGE_PROFILE, preset.profile)
    }
  }

  if (/\bpython\b/i.test(normalized)) {
    return mergeLanguageProfile(DEFAULT_LANGUAGE_PROFILE, {
      language: 'Python',
      framework: 'Flask',
      runtime: 'Gunicorn',
      packageManager: 'pip',
      buildCommand: 'pip install -r requirements.txt',
      startCommand: 'python main.py',
      description: 'Python scripting / microservice project.',
    })
  }

  if (/\bcli\b/i.test(normalized) || /command[- ]line/i.test(normalized)) {
    return mergeLanguageProfile(DEFAULT_LANGUAGE_PROFILE, {
      language: 'Node.js',
      framework: 'Commander.js',
      runtime: 'Node.js',
      packageManager: 'npm',
      buildCommand: 'npm install',
      startCommand: 'node index.js',
      description: 'Command-line interface tool.',
    })
  }

  return DEFAULT_LANGUAGE_PROFILE
}

export function describeLanguageProfile(profile: LanguageProfile): string {
  return [
    `Primary language: ${profile.language}`,
    profile.framework && `Framework: ${profile.framework}`,
    profile.runtime && `Runtime: ${profile.runtime}`,
    profile.packageManager && `Package manager: ${profile.packageManager}`,
    profile.buildCommand && `Build command: ${profile.buildCommand}`,
    profile.startCommand && `Start command: ${profile.startCommand}`,
  ]
    .filter(Boolean)
    .join('\n')
}

