/** Builds the starter code shown in the editor for each language. */

const JS_TYPES = {
  int: "number",
  float: "number",
  bool: "boolean",
  string: "string",
  "int[]": "number[]",
  "float[]": "number[]",
  "bool[]": "boolean[]",
  "string[]": "string[]",
  "int[][]": "number[][]",
  "string[][]": "string[][]",
  ListNode: "ListNode | null",
  TreeNode: "TreeNode | null",
  void: "void",
};

const PY_TYPES = {
  int: "int",
  float: "float",
  bool: "bool",
  string: "str",
  "int[]": "List[int]",
  "float[]": "List[float]",
  "bool[]": "List[bool]",
  "string[]": "List[str]",
  "int[][]": "List[List[int]]",
  "string[][]": "List[List[str]]",
  ListNode: "Optional[ListNode]",
  TreeNode: "Optional[TreeNode]",
  void: "None",
};

function usesType(entry, type) {
  const all =
    entry.kind === "function"
      ? [...entry.params.map((p) => p.type), entry.returns]
      : [
          ...entry.constructorParams.map((p) => p.type),
          ...entry.methods.flatMap((m) => [...m.params.map((p) => p.type), m.returns]),
        ];
  return all.includes(type);
}

function jsHeader(entry) {
  const lines = [];
  if (usesType(entry, "ListNode")) {
    lines.push(
      "/**",
      " * Linked list node (already defined):",
      " * class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } }",
      " */",
    );
  }
  if (usesType(entry, "TreeNode")) {
    lines.push(
      "/**",
      " * Binary tree node (already defined):",
      " * class TreeNode {",
      " *   constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }",
      " * }",
      " */",
    );
  }
  return lines.length ? `${lines.join("\n")}\n\n` : "";
}

function jsDoc(params, returns, indent = "") {
  const lines = [`${indent}/**`];
  for (const p of params) lines.push(`${indent} * @param {${JS_TYPES[p.type]}} ${p.name}`);
  if (returns && returns !== "void") lines.push(`${indent} * @return {${JS_TYPES[returns]}}`);
  lines.push(`${indent} */`);
  return lines.length > 2 ? `${lines.join("\n")}\n` : "";
}

export function jsStarter(entry) {
  if (entry.kind === "function") {
    const args = entry.params.map((p) => p.name).join(", ");
    return `${jsHeader(entry)}${jsDoc(entry.params, entry.returns)}function ${entry.name.js}(${args}) {\n  \n}\n`;
  }
  const ctorArgs = entry.constructorParams.map((p) => p.name).join(", ");
  const parts = [
    `${jsHeader(entry)}class ${entry.className} {`,
    `${jsDoc(entry.constructorParams, null, "  ")}  constructor(${ctorArgs}) {\n    \n  }`,
    ...entry.methods.map(
      (m) =>
        `\n${jsDoc(m.params, m.returns, "  ")}  ${m.name}(${m.params.map((p) => p.name).join(", ")}) {\n    \n  }`,
    ),
    "}",
  ];
  return `${parts.join("\n")}\n`;
}

function pyHeader(entry) {
  const lines = [];
  if (usesType(entry, "ListNode")) {
    lines.push(
      "# Linked list node (already defined):",
      "# class ListNode:",
      "#     def __init__(self, val=0, next=None):",
      "#         self.val = val",
      "#         self.next = next",
    );
  }
  if (usesType(entry, "TreeNode")) {
    if (lines.length) lines.push("#");
    lines.push(
      "# Binary tree node (already defined):",
      "# class TreeNode:",
      "#     def __init__(self, val=0, left=None, right=None):",
      "#         self.val = val",
      "#         self.left = left",
      "#         self.right = right",
    );
  }
  return lines.length ? `${lines.join("\n")}\n\n` : "";
}

function pyParams(params, self = false) {
  const list = params.map((p) => `${p.name}: ${PY_TYPES[p.type]}`);
  return (self ? ["self", ...list] : list).join(", ");
}

export function pyStarter(entry) {
  if (entry.kind === "function") {
    return `${pyHeader(entry)}def ${entry.name.py}(${pyParams(entry.params)}) -> ${PY_TYPES[entry.returns]}:\n    pass\n`;
  }
  const parts = [
    `${pyHeader(entry)}class ${entry.className}:`,
    `    def __init__(${pyParams(entry.constructorParams, true)}):\n        pass`,
    ...entry.methods.map(
      (m) =>
        `\n    def ${m.name}(${pyParams(m.params, true)}) -> ${PY_TYPES[m.returns]}:\n        pass`,
    ),
  ];
  return `${parts.join("\n")}\n`;
}
