import { describe, it, expect } from "vitest";
import { SpringInitializrUrlBuilder } from "../../src/tool/url-builder.js";

describe("SpringInitializrUrlBuilder", () => {
  it("should generate a complete URL with all parameters", () => {
    const url = SpringInitializrUrlBuilder.builder()
      .projectType("maven-project")
      .language("java")
      .bootVersion("3.5.0")
      .groupId("com.example")
      .artifactId("demo")
      .version("1.0.0")
      .name("Demo Project")
      .description("Demo project for Spring Boot")
      .packageName("com.example.demo")
      .packaging("jar")
      .javaVersion("17")
      .baseDir("demo")
      .dependencies("web,data-jpa")
      .build();

    expect(url).toMatch(/^https:\/\/start\.spring\.io\/starter\.zip\?/);
    expect(url).toContain("type=maven-project");
    expect(url).toContain("language=java");
    expect(url).toContain("bootVersion=3.5.0");
    expect(url).toContain("groupId=com.example");
    expect(url).toContain("artifactId=demo");
    expect(url).toContain("version=1.0.0");
    expect(url).toContain("name=Demo%20Project");
    expect(url).toContain("description=Demo%20project%20for%20Spring%20Boot");
    expect(url).toContain("packageName=com.example.demo");
    expect(url).toContain("packaging=jar");
    expect(url).toContain("javaVersion=17");
    expect(url).toContain("baseDir=demo");
    expect(url).toContain("dependencies=web%2Cdata-jpa");
  });

  it("should work with fromParameters convenience method", () => {
    const url = SpringInitializrUrlBuilder.fromParameters({
      projectType: "gradle-project",
      language: "kotlin",
      bootVersion: "3.5.0",
      groupId: "com.example",
      artifactId: "my-app",
      javaVersion: "21",
      dependencies: "web,actuator",
    }).build();

    expect(url).toContain("type=gradle-project");
    expect(url).toContain("language=kotlin");
    expect(url).toContain("bootVersion=3.5.0");
    expect(url).toContain("groupId=com.example");
    expect(url).toContain("artifactId=my-app");
    expect(url).toContain("javaVersion=21");
    expect(url).toContain("dependencies=web%2Cactuator");
  });

  it("should skip null, undefined, and blank parameters", () => {
    const url = SpringInitializrUrlBuilder.builder()
      .projectType(null)
      .language("")
      .groupId("  ")
      .artifactId("test")
      .bootVersion(undefined)
      .dependencies("")
      .build();

    expect(url).not.toContain("type=");
    expect(url).not.toContain("language=");
    expect(url).toContain("artifactId=test");
    expect(url).not.toContain("groupId=");
    expect(url).not.toContain("bootVersion=");
    expect(url).not.toContain("dependencies=");
  });

  it("should URL-encode special characters", () => {
    const url = SpringInitializrUrlBuilder.builder()
      .name("My Amazing Project!")
      .description("A project with special chars: &, =, +, %")
      .dependencies("spring-web,spring-data-jpa")
      .build();

    expect(url).toContain("name=My%20Amazing%20Project!");
    expect(url).toContain("description=A%20project%20with%20special%20chars%3A%20%26%2C%20%3D%2C%20%2B%2C%20%25");
    expect(url).toContain("dependencies=spring-web%2Cspring-data-jpa");
  });

  it("should produce a valid URL with no parameters", () => {
    const url = SpringInitializrUrlBuilder.builder().build();
    expect(url).toBe("https://start.spring.io/starter.zip?");
  });
});