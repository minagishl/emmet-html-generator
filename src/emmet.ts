export interface EmmetNode {
  tag: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string | true>;
  text?: string;
  children: EmmetNode[];
}

const IDENTIFIER_CHARS = /[a-zA-Z0-9\-\_\:$]/;

export function expandAbbreviation(abbreviation: string): { html: string; nodes: EmmetNode[] } {
  if (!abbreviation.trim()) {
    throw new Error('Abbreviation is empty');
  }
  const parser = new EmmetParser(abbreviation);
  const nodes = parser.parse();
  if (nodes.length === 0) {
    throw new Error('No nodes produced for abbreviation');
  }
  const html = renderNodes(nodes);
  return { html, nodes };
}

class EmmetParser {
  private pos = 0;
  private readonly input: string;

  constructor(input: string) {
    this.input = input;
  }

  parse(): EmmetNode[] {
    const nodes = this.parseExpression(new Set<string>());
    this.skipWhitespace();
    if (!this.isEnd()) {
      throw this.error(`Unexpected character "${this.peek()}"`);
    }
    return nodes;
  }

  private parseExpression(terminators: Set<string>): EmmetNode[] {
    const nodes: EmmetNode[] = [];
    while (true) {
      this.skipWhitespace();
      const current = this.peek();
      if (this.isEnd() || (current !== undefined && terminators.has(current))) {
        break;
      }

      const chunk = this.parseChildTerm(terminators);
      nodes.push(...chunk);

      this.skipWhitespace();
      const afterChunk = this.peek();
      if (afterChunk === '+') {
        this.pos++;
        continue;
      }

      if (this.isEnd() || (afterChunk !== undefined && terminators.has(afterChunk))) {
        break;
      }

      if (afterChunk === undefined) {
        break;
      }

      if (afterChunk !== ')') {
        throw this.error(`Unexpected character "${afterChunk}"`);
      }
    }

    return nodes;
  }

  private parseChildTerm(terminators: Set<string>): EmmetNode[] {
    let parents = this.parsePrimary(terminators);
    parents = this.applyMultiplier(parents);

    while (true) {
      this.skipWhitespace();
      if (this.peek() !== '>') {
        break;
      }

      this.pos++;
      const childTerminators = new Set<string>(terminators);
      childTerminators.add(')');
      const children = this.parseExpression(childTerminators);
      parents = parents.map((parent) => ({
        ...parent,
        children: cloneNodes(children),
      }));
    }

    return parents;
  }

  private parsePrimary(terminators: Set<string>): EmmetNode[] {
    this.skipWhitespace();
    const next = this.peek();
    if (next === '(') {
      this.pos++;
      const innerTerminators = new Set<string>(terminators);
      innerTerminators.add(')');
      const group = this.parseExpression(innerTerminators);
      if (this.peek() !== ')') {
        throw this.error('Unclosed group');
      }
      this.pos++;
      return group;
    }

    if (next === undefined) {
      throw this.error('Unexpected end of input');
    }

    return [this.parseElement()];
  }

  private parseElement(): EmmetNode {
    let tag = '';
    if (this.peekIsIdentifier()) {
      tag = this.consumeIdentifier();
    }

    const node: EmmetNode = {
      tag: tag || 'div',
      classes: [],
      attributes: {},
      children: [],
    };

    while (!this.isEnd()) {
      const ch = this.peek();
      if (!ch) {
        break;
      }

      if (ch === '#') {
        this.pos++;
        if (node.id) {
          throw this.error('Duplicate id segment');
        }
        node.id = this.consumeIdentifierOrThrow('Expected id after #');
        continue;
      }

      if (ch === '.') {
        this.pos++;
        node.classes.push(this.consumeIdentifierOrThrow('Expected class name after .'));
        continue;
      }

      if (ch === '[') {
        this.pos++;
        this.parseAttributes(node);
        continue;
      }

      if (ch === '{') {
        this.pos++;
        node.text = this.consumeText();
        continue;
      }

      if (ch === '>' || ch === '+' || ch === '*' || ch === ')' ) {
        break;
      }

      throw this.error(`Unexpected character "${ch}" within element`);
    }

    return node;
  }

  private parseAttributes(node: EmmetNode): void {
    while (!this.isEnd()) {
      this.skipWhitespace();
      if (this.peek() === ']') {
        this.pos++;
        return;
      }

      const name = this.consumeIdentifierOrThrow('Expected attribute name');
      this.skipWhitespace();

      if (this.peek() === '=') {
        this.pos++;
        this.skipWhitespace();
        const value = this.consumeAttributeValue();
        node.attributes[name] = value;
      } else {
        node.attributes[name] = true;
      }

      this.skipWhitespace();
      if (this.peek() === ',' || this.peek() === ' ') {
        this.pos++;
      }
    }

    throw this.error('Unclosed attribute set');
  }

  private consumeText(): string {
    let result = '';
    while (!this.isEnd()) {
      const ch = this.peek();
      if (ch === '}') {
        this.pos++;
        return result;
      }
      if (ch === '\\') {
        this.pos++;
        const next = this.peek();
        if (next) {
          result += next;
          this.pos++;
          continue;
        }
        break;
      }
      result += ch;
      this.pos++;
    }
    throw this.error('Unclosed text segment');
  }

  private consumeAttributeValue(): string {
    const ch = this.peek();
    if (ch === '"' || ch === "'") {
      this.pos++;
      let value = '';
      while (!this.isEnd()) {
        const current = this.peek();
        if (current === ch) {
          this.pos++;
          return value;
        }
        if (current === '\\') {
          this.pos++;
          const next = this.peek();
          if (next) {
            value += next;
            this.pos++;
            continue;
          }
          break;
        }
        value += current;
        this.pos++;
      }
      throw this.error('Unclosed quoted attribute value');
    }

    let value = '';
    while (!this.isEnd()) {
      const current = this.peek();
      if (!current || current === ' ' || current === ',' || current === ']') {
        break;
      }
      value += current;
      this.pos++;
    }
    if (!value) {
      throw this.error('Expected attribute value');
    }
    return value;
  }

  private applyMultiplier(nodes: EmmetNode[]): EmmetNode[] {
    this.skipWhitespace();
    if (this.peek() !== '*') {
      return nodes;
    }

    this.pos++;
    const count = this.consumeNumber();
    if (count <= 0) {
      throw this.error('Multiplier must be greater than zero');
    }
    return repeatNodes(nodes, count);
  }

  private consumeNumber(): number {
    let value = '';
    while (!this.isEnd() && /[0-9]/.test(this.peek()!)) {
      value += this.peek();
      this.pos++;
    }
    if (!value) {
      throw this.error('Expected number');
    }
    return Number.parseInt(value, 10);
  }

  private consumeIdentifier(): string {
    let value = '';
    while (!this.isEnd() && this.peekIsIdentifier()) {
      value += this.peek();
      this.pos++;
    }
    return value;
  }

  private consumeIdentifierOrThrow(message: string): string {
    const value = this.consumeIdentifier();
    if (!value) {
      throw this.error(message);
    }
    return value;
  }

  private peekIsIdentifier(): boolean {
    const ch = this.peek();
    return !!ch && IDENTIFIER_CHARS.test(ch);
  }

  private skipWhitespace(): void {
    while (!this.isEnd() && /\s/.test(this.peek()!)) {
      this.pos++;
    }
  }

  private peek(): string | undefined {
    return this.input[this.pos];
  }

  private isEnd(): boolean {
    return this.pos >= this.input.length;
  }

  private error(message: string): Error {
    return new Error(`${message} at position ${this.pos}`);
  }
}

function cloneNodes(nodes: EmmetNode[]): EmmetNode[] {
  return nodes.map((node) => cloneNode(node, 0, false));
}

function repeatNodes(nodes: EmmetNode[], count: number): EmmetNode[] {
  const result: EmmetNode[] = [];
  for (let i = 0; i < count; i++) {
    for (const node of nodes) {
      result.push(cloneNode(node, i, true));
    }
  }
  return result;
}

function cloneNode(node: EmmetNode, index: number, useNumbering: boolean): EmmetNode {
  const clonedAttributes: Record<string, string | true> = {};
  for (const [key, value] of Object.entries(node.attributes)) {
    if (value === true) {
      clonedAttributes[key] = true;
    } else {
      clonedAttributes[key] = useNumbering ? applyNumbering(value, index) : value;
    }
  }

  return {
    tag: node.tag,
    id: node.id ? (useNumbering ? applyNumbering(node.id, index) : node.id) : undefined,
    classes: node.classes.map((cls) => (useNumbering ? applyNumbering(cls, index) : cls)),
    attributes: clonedAttributes,
    text: node.text ? (useNumbering ? applyNumbering(node.text, index) : node.text) : undefined,
    children: node.children.map((child) => cloneNode(child, index, useNumbering)),
  };
}

function applyNumbering(template: string, index: number): string {
  return template.replace(/\$+/g, (match) => {
    const value = (index + 1).toString();
    return value.padStart(match.length, '0');
  });
}

function renderNodes(nodes: EmmetNode[], level = 0): string {
  return nodes.map((node) => renderNode(node, level)).join('\n');
}

function renderNode(node: EmmetNode, level: number): string {
  const indentation = '  '.repeat(level);
  const attributes = buildAttributeList(node);
  const openTag = `<${node.tag}${attributes ? ' ' + attributes : ''}>`;
  const closeTag = `</${node.tag}>`;

  if (node.children.length === 0) {
    if (node.text && node.text.includes('\n')) {
      const text = indentMultiline(escapeHtml(node.text), level + 1);
      return `${indentation}${openTag}\n${text}\n${indentation}${closeTag}`;
    }

    if (node.text) {
      return `${indentation}${openTag}${escapeHtml(node.text)}${closeTag}`;
    }

    return `${indentation}${openTag}${closeTag}`;
  }

  const childContent = node.children.map((child) => renderNode(child, level + 1)).join('\n');
  const textContent = node.text ? `\n${indentMultiline(escapeHtml(node.text), level + 1)}` : '';
  const combinedContent = textContent ? `${textContent}\n${childContent}` : childContent;
  return `${indentation}${openTag}\n${combinedContent}\n${indentation}${closeTag}`;
}

function buildAttributeList(node: EmmetNode): string {
  const attributes: string[] = [];
  if (node.id) {
    attributes.push(`id="${escapeAttribute(node.id)}"`);
  }
  if (node.classes.length > 0) {
    attributes.push(`class="${escapeAttribute(node.classes.join(' '))}"`);
  }
  for (const [key, value] of Object.entries(node.attributes)) {
    if (value === true) {
      attributes.push(key);
    } else {
      attributes.push(`${key}="${escapeAttribute(value)}"`);
    }
  }
  return attributes.join(' ');
}

function indentMultiline(text: string, level: number): string {
  const indentation = '  '.repeat(level);
  return text
    .split('\n')
    .map((line) => `${indentation}${line}`)
    .join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
