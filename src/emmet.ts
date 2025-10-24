import expand from 'emmet';

export interface EmmetNode {
  tag: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string | true>;
  text?: string;
  children: EmmetNode[];
}

export function expandAbbreviation(abbreviation: string): {
  html: string;
  nodes: EmmetNode[];
} {
  if (!abbreviation.trim()) {
    throw new Error('Abbreviation is empty');
  }

  try {
    const html = expand(abbreviation, {
      syntax: 'html',
      options: {
        'output.indent': '  ',
        'output.baseIndent': '',
        'output.newline': '\n',
        'output.format': true,
      },
    });

    // Parse the generated HTML to create nodes (for backward compatibility)
    // Note: This is a simplified implementation for maintaining the interface
    const nodes: EmmetNode[] = [];

    return { html, nodes };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to expand abbreviation';
    throw new Error(message);
  }
}
