import ts from "typescript";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative, dirname, extname } from "node:path";
const root = resolve("apps/web/src");
const files = [];
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(path)) files.push(path);
  }
}
walk(root);
const modules = new Map();
const errors = [];
const local = (file, specifier) => {
  const base = specifier.startsWith("@/")
    ? resolve(root, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(file), specifier)
      : null;
  if (!base) return null;
  return [
    base,
    base + ".ts",
    base + ".tsx",
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ].find((path) => existsSync(path) && [".ts", ".tsx"].includes(extname(path)));
};
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const edges = [];
  if (file.includes("/app/api/") && file.endsWith("/route.ts")) {
    for (const statement of source.statements) {
      if (
        ts.isFunctionDeclaration(statement) &&
        statement.name &&
        ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
          statement.name.text,
        ) &&
        statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      )
        errors.push(
          `${relative(root, file)}: exported handler function bypasses the shared API guard`,
        );
      if (
        !ts.isVariableStatement(statement) ||
        !statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      )
        continue;
      for (const declaration of statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
            declaration.name.text,
          )
        )
          continue;
        const init = declaration.initializer;
        if (
          !init ||
          !ts.isCallExpression(init) ||
          !ts.isIdentifier(init.expression) ||
          init.expression.text !== "handler"
        )
          errors.push(
            `${relative(root, file)}: ${declaration.name.text} bypasses the shared API guard`,
          );
      }
    }
  }
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      const bindings = clause?.namedBindings;
      const allTypes =
        clause?.isTypeOnly ||
        (!clause?.name &&
          bindings &&
          ts.isNamedImports(bindings) &&
          bindings.elements.length > 0 &&
          bindings.elements.every((e) => e.isTypeOnly));
      if (!allTypes) edges.push(statement.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.moduleSpecifier
    ) {
      const named = statement.exportClause;
      if (!(
        named &&
        ts.isNamedExports(named) &&
        named.elements.length > 0 &&
        named.elements.every((e) => e.isTypeOnly)
      ))
        edges.push(statement.moduleSpecifier.text);
    }
  }
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) edges.push(arg.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const first = source.statements[0];
  const client =
    first &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use client";
  modules.set(file, { client, edges: edges.map((s) => local(file, s)).filter(Boolean) });
  if (/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|API_KEY|DATABASE_URL)/.test(text))
    errors.push(`${relative(root, file)}: sensitive environment variable uses a public prefix`);
}
let clients = 0;
for (const [file, module] of modules) {
  if (!module.client) continue;
  clients++;
  const seen = new Set();
  function check(path, chain) {
    if (seen.has(path)) return;
    seen.add(path);
    const name = relative(root, path).replaceAll("\\", "/");
    if (name.startsWith("server/") || name.startsWith("db/")) {
      errors.push("Client → server import: " + [...chain, name].join(" → "));
      return;
    }
    for (const edge of modules.get(path)?.edges ?? []) check(edge, [...chain, name]);
  }
  check(file, []);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Security boundaries passed: ${files.length} source files, ${clients} client entry points. Local runtime imports only; this is not a vulnerability scan.`,
  );
