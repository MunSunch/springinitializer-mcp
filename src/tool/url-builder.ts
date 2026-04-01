const BASE_URL = "https://start.spring.io/starter.zip";

export class SpringInitializrUrlBuilder {
  private params = new Map<string, string>();

  static builder(): SpringInitializrUrlBuilder {
    return new SpringInitializrUrlBuilder();
  }

  private param(key: string, value: string | undefined | null): this {
    if (value != null && value.trim() !== "") {
      this.params.set(key, value.trim());
    }
    return this;
  }

  projectType(v: string | undefined | null) { return this.param("type", v); }
  language(v: string | undefined | null) { return this.param("language", v); }
  bootVersion(v: string | undefined | null) { return this.param("bootVersion", v); }
  groupId(v: string | undefined | null) { return this.param("groupId", v); }
  artifactId(v: string | undefined | null) { return this.param("artifactId", v); }
  version(v: string | undefined | null) { return this.param("version", v); }
  name(v: string | undefined | null) { return this.param("name", v); }
  description(v: string | undefined | null) { return this.param("description", v); }
  packageName(v: string | undefined | null) { return this.param("packageName", v); }
  packaging(v: string | undefined | null) { return this.param("packaging", v); }
  javaVersion(v: string | undefined | null) { return this.param("javaVersion", v); }
  baseDir(v: string | undefined | null) { return this.param("baseDir", v); }
  dependencies(v: string | undefined | null) { return this.param("dependencies", v); }

  build(): string {
    const query = [...this.params.entries()]
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `${BASE_URL}?${query}`;
  }

  static fromParameters(params: {
    projectType?: string;
    language?: string;
    bootVersion?: string;
    groupId?: string;
    artifactId?: string;
    version?: string;
    name?: string;
    description?: string;
    packageName?: string;
    packaging?: string;
    javaVersion?: string;
    baseDir?: string;
    dependencies?: string;
  }): SpringInitializrUrlBuilder {
    return SpringInitializrUrlBuilder.builder()
      .projectType(params.projectType)
      .language(params.language)
      .bootVersion(params.bootVersion)
      .groupId(params.groupId)
      .artifactId(params.artifactId)
      .version(params.version)
      .name(params.name)
      .description(params.description)
      .packageName(params.packageName)
      .packaging(params.packaging)
      .javaVersion(params.javaVersion)
      .baseDir(params.baseDir)
      .dependencies(params.dependencies);
  }
}